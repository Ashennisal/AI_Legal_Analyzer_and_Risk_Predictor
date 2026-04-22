from pathlib import Path

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Depends, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import tempfile
import os
import json
from datetime import datetime, timedelta
from typing import Optional
from password_utils import hash_password, verify_password, validate_password_strength
from user_routes import router as user_router


# Load backend/.env before any route uses os.getenv (GEMINI_API_KEY, MySQL, etc.)
load_dotenv(Path(__file__).resolve().parent / ".env")

from database import get_db_connection, close_db_connection
from calendar_events_routes import router as calendar_events_router
from calendar_events_db import try_save_extracted_events
from chat_routes import router as chat_router

app = FastAPI(title="AI Legal Analyzer API")
app.include_router(user_router, prefix="/api")

# Configure CORS so your React frontend can talk to this FastAPI backend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Dependency to get the DB connection for individual API routes
def get_db():
    conn = get_db_connection()
    if conn is None:
        raise HTTPException(status_code=500, detail="Database connection failed")
    try:
        yield conn
    finally:
        close_db_connection(conn)

# --- Data Models (What React sends to FastAPI) ---
class LoginRequest(BaseModel):
    email: str
    password: str
    is_admin: bool

class RegisterRequest(BaseModel):
    name: str
    email: str
    password: str

# --- API Endpoints will be included from routers ---

@app.get("/api/status")
def read_status():
    return {"status": "success", "message": "FastAPI server is running perfectly!"}

@app.post("/api/login")
def login_user(request: LoginRequest, db = Depends(get_db)):
    try:
        cursor = db.cursor(dictionary=True)
        
        # Query the database for the user by email
        cursor.execute("SELECT * FROM users WHERE email = %s", (request.email,))
        user = cursor.fetchone()
        cursor.close()

        if not user:
            print(f"[AUTH] Failed login attempt for {request.email}")
            raise HTTPException(status_code=401, detail="Invalid email or password")
        
        # Verify password using bcrypt
        is_valid = verify_password(request.password, user['password'])
        
        if not is_valid:
            print(f"[AUTH] Failed login attempt for {request.email} - wrong password")
            raise HTTPException(status_code=401, detail="Invalid email or password")
        
        # Check if they are trying to log into the correct portal
        is_actually_admin = "Admin" in user['role']
        if request.is_admin and not is_actually_admin:
            raise HTTPException(status_code=403, detail="Access denied. You do not have admin privileges.")

        print(f"[AUTH] User logged in: {request.email}")

        # Return the real user data
        return {
            "message": "Login successful",
            "user": {
                "id": user['id'],
                "name": user['name'],
                "email": user['email'],
                "initials": "".join([n[0] for n in user['name'].split()][:2]).upper(),
                "role": user['role']
            }
        }
    except HTTPException:
        raise
    except Exception as e:
        print(f"[ERROR] Login error: {e}")
        raise HTTPException(status_code=500, detail=f"Login error: {str(e)}")

@app.post("/api/register")
def register_user(request: RegisterRequest, db = Depends(get_db)):
    try:
        # Validate password strength
        password_validation = validate_password_strength(request.password)
        if not password_validation["valid"]:
            raise HTTPException(
                status_code=400, 
                detail=f"Password requirements not met: {'; '.join(password_validation['errors'])}"
            )
        
        # Hash the password
        hashed_password = hash_password(request.password)
        
        cursor = db.cursor()
        
        # Insert the new user into the database with hashed password
        sql = "INSERT INTO users (name, email, password, role, status) VALUES (%s, %s, %s, 'User', 'Active')"
        cursor.execute(sql, (request.name, request.email, hashed_password))
        db.commit()
        new_id = cursor.lastrowid
        cursor.close()
        
        print(f"[AUTH] New user registered: {request.email} (ID: {new_id})")
        
        return {
            "message": "Registration successful",
            "user": {
                "id": new_id,
                "name": request.name,
                "email": request.email,
                "initials": "".join([n[0] for n in request.name.split()][:2]).upper(),
                "role": "User"
            }
        }
    except HTTPException:
        raise
    except Exception as err:
        # Check for duplicate email (MySQL error 1062)
        if "Duplicate entry" in str(err):
            raise HTTPException(status_code=400, detail="Email already exists")
        print(f"[ERROR] Registration error: {err}")
        raise HTTPException(status_code=500, detail=f"Registration error: {str(err)}")



# ============ INCLUDE ROUTERS (After user endpoints) ============
app.include_router(calendar_events_router, prefix="/api")
app.include_router(chat_router, prefix="/api")

# ============ ADMIN ENDPOINTS ============

@app.get("/api/admin/stats")
def get_admin_stats(db = Depends(get_db)):
    try:
        cursor = db.cursor(dictionary=True)
        
        # Get total registered users
        cursor.execute("SELECT COUNT(*) as total FROM users")
        total_users = cursor.fetchone()['total']
        
        # Get active users (users with status 'Active')
        cursor.execute("SELECT COUNT(*) as active FROM users WHERE status = 'Active'")
        active_users = cursor.fetchone()['active']
        
        # Get total documents
        cursor.execute("SELECT COUNT(*) as total_docs FROM documents")
        total_docs = cursor.fetchone()['total_docs']
        
        # --- NEW: Generate Weekly Chart Data ---
        today = datetime.now()
        weekly_data = []
        
        # Loop backwards through the last 7 days
        for i in range(6, -1, -1):
            target_date = today - timedelta(days=i)
            day_name = target_date.strftime("%a") # Gets 'Mon', 'Tue', etc.
            
            # Count documents uploaded on this specific date
            cursor.execute("SELECT COUNT(*) as count FROM documents WHERE DATE(uploaded_at) = DATE(%s)", (target_date,))
            day_count = cursor.fetchone()['count']
            
            weekly_data.append({
                "name": day_name,
                "docs": day_count
            })
            
        cursor.close()
        
        return {
            "totalUsers": total_users,
            "activeSessions": active_users,
            "totalDocuments": total_docs,
            "avgRiskScore": "0/100",
            "weeklyData": weekly_data
        }
    except Exception as e:
        print(f"Database error in admin stats: {e}")
        return {
            "totalUsers": 5,
            "activeSessions": 3,
            "totalDocuments": 12,
            "avgRiskScore": "42/100",
            "weeklyData": [
                {"name": "Mon", "docs": 2},
                {"name": "Tue", "docs": 3},
                {"name": "Wed", "docs": 1},
                {"name": "Thu", "docs": 0},
                {"name": "Fri", "docs": 4},
                {"name": "Sat", "docs": 2},
                {"name": "Sun", "docs": 0}
            ]
        }

@app.get("/api/admin/users")
def get_all_users(db = Depends(get_db)):
    try:
        cursor = db.cursor(dictionary=True)
        
        # Fetch all users, formatting the dates cleanly
        cursor.execute("""
            SELECT id, name, email, role, status, 
            DATE_FORMAT(last_active, '%b %d, %Y') as last_active 
            FROM users ORDER BY id DESC
        """)
        users = cursor.fetchall()
        
        # Add initials and a temporary document count for the frontend
        for user in users:
            user['initials'] = "".join([n[0] for n in user['name'].split()][:2]).upper()
            
            # Count documents for this specific user
            cursor.execute("SELECT COUNT(*) as doc_count FROM documents WHERE user_id = %s", (user['id'],))
            user['docs'] = cursor.fetchone()['doc_count']
            
        cursor.close()
        
        return {"users": users}
    except Exception as e:
        print(f"Database error in get users: {e}")
        return {"users": [
          {"id": 1, "name": "John Doe", "email": "john@example.com", "role": "User", "status": "Active", "last_active": "Mar 20, 2026", "initials": "JD", "docs": 3},
           {"id": 2, "name": "Jane Smith", "email": "jane@example.com", "role": "Admin", "status": "Active", "last_active": "Mar 20, 2026", "initials": "JS", "docs": 5}
        ]}

@app.get("/api/admin/analytics")
def get_platform_analytics(db = Depends(get_db)):
    try:
        cursor = db.cursor(dictionary=True)
        
        # 1. Timeline Data (Last 6 Months)
        today = datetime.now()
        timeline_data = []
        
        for i in range(5, -1, -1):
            # Calculate the target month and year safely
            target_month = (today.month - i - 1) % 12 + 1
            target_year = today.year + ((today.month - i - 1) // 12)
            month_name = datetime(target_year, target_month, 1).strftime("%b")
            
            cursor.execute("""
                SELECT COUNT(*) as count 
                FROM documents 
                WHERE MONTH(uploaded_at) = %s AND YEAR(uploaded_at) = %s
            """, (target_month, target_year))
            
            count = cursor.fetchone()['count']
            timeline_data.append({"name": month_name, "docs": count})

        # Get total clauses detected across all documents
        cursor.execute("SELECT SUM(clauses_detected) as total FROM documents")
        result = cursor.fetchone()
        total_clauses = int(result['total']) if result and result['total'] else 0

        print(f"[Analytics] Total clauses = {total_clauses}")

        clause_data = [
            { "name": 'Confidentiality', "count": int(total_clauses * 0.35) or 1 },
            { "name": 'Indemnification', "count": int(total_clauses * 0.25) or 1 },
            { "name": 'Termination', "count": int(total_clauses * 0.20) or 1 },
            { "name": 'Liability Limit', "count": int(total_clauses * 0.15) or 1 },
            { "name": 'Non-Compete', "count": int(total_clauses * 0.05) or 1 }
        ]

        risk_colors = {"Low": "#22c55e", "Medium": "#eab308", "High": "#ef4444"}
        cursor.execute(
            """
            SELECT risk_level, COUNT(*) AS cnt FROM documents
            WHERE risk_level IS NOT NULL AND risk_level != ''
            GROUP BY risk_level
            """
        )
        risk_rows = cursor.fetchall()
        by_level = {row["risk_level"]: row["cnt"] for row in risk_rows}
        risk_data = []
        for level in ("Low", "Medium", "High"):
            risk_data.append({
                "name": level,
                "value": int(by_level.get(level, 0)),
                "color": risk_colors[level],
            })

        print(f"[Analytics] Timeline={len(timeline_data)}, Risk={len(risk_data)}, Clauses={len(clause_data)}")

        cursor.close()
        return {
            "timelineData": timeline_data,
            "riskData": risk_data,
            "clauseData": clause_data
        }
    except Exception as e:
        print(f"[ERROR] Analytics error: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail="Error fetching analytics data")

@app.get("/api/admin/documents")
def get_all_documents(db = Depends(get_db)):
    try:
        cursor = db.cursor(dictionary=True)
        # Fetch all documents and join with the users table to get the uploader's name
        cursor.execute("""
            SELECT d.id, d.filename as name, u.name as user, 
                   DATE_FORMAT(d.uploaded_at, '%b %d, %Y') as date, 
                   d.risk_level as risk, d.clauses_detected as clauses
            FROM documents d
            LEFT JOIN users u ON d.user_id = u.id
            ORDER BY d.id DESC
        """)
        documents = cursor.fetchall()
        cursor.close()
        
        return {"documents": documents}
    except Exception as e:
        print(f"Error fetching document oversight: {e}")
        return {"documents": []}

@app.post("/api/admin/hash-existing-passwords")
def hash_existing_passwords(db = Depends(get_db)):
    """Admin endpoint to convert plain-text passwords to hashed ones (RUN ONCE)."""
    try:
        cursor = db.cursor(dictionary=True)
        
        # Get all users with plain-text passwords (not starting with $2b$ which is bcrypt)
        cursor.execute("SELECT id, email, password FROM users WHERE password NOT LIKE '$2b$%'")
        users = cursor.fetchall()
        
        if not users:
            cursor.close()
            return {"message": "No plain-text passwords found. All passwords are already hashed."}
        
        updated_count = 0
        errors = []
        
        for user in users:
            try:
                # Hash the plain-text password
                hashed_password = hash_password(user['password'])
                
                # Update the database
                cursor.execute("UPDATE users SET password = %s WHERE id = %s", (hashed_password, user['id']))
                updated_count += 1
                print(f"[MIGRATION] Hashed password for user {user['email']} (ID: {user['id']})")
            except Exception as user_err:
                errors.append(f"Error hashing password for {user['email']}: {str(user_err)}")
                print(f"[ERROR] Failed to hash password for {user['email']}: {user_err}")
        
        db.commit()
        cursor.close()
        
        result = {
            "message": f"Password migration completed",
            "total_users": len(users),
            "updated": updated_count,
            "errors": errors
        }
        
        print(f"[MIGRATION] Hashed passwords for {updated_count} users")
        return result
        
    except Exception as e:
        print(f"[ERROR] Password migration error: {e}")
        raise HTTPException(status_code=500, detail=f"Error: {str(e)}")

# ============ DOCUMENT ENDPOINTS ============

def _normalize_stored_analysis_payload(parsed):
    if not parsed:
        return None
    if isinstance(parsed, str):
        try:
            parsed = json.loads(parsed)
        except (json.JSONDecodeError, TypeError):
            return None
    if (
        isinstance(parsed, dict)
        and parsed.get("status") == "success"
        and "analysis" in parsed
        and "calendar_events" in parsed
    ):
        return parsed
    if isinstance(parsed, dict) and "analysis" in parsed and "calendar_events" in parsed:
        return {
            "status": "success",
            "message": "Analysis Complete",
            "document_id": parsed.get("document_id"),
            "filename": parsed.get("filename"),
            "analysis": parsed["analysis"],
            "calendar_events": parsed.get("calendar_events") or [],
            "summaries": parsed.get("summaries"),
            "pdf_text_source": parsed.get("pdf_text_source"),
        }
    return None

def _rows_to_document_list(rows, include_json_column: bool):
    out = []
    for r in rows:
        item = dict(r)
        raw = None
        if include_json_column:
            raw = item.pop("analysis_json", None)
        result = _normalize_stored_analysis_payload(
            json.loads(raw) if raw else None
        )
        if result:
            if result.get("document_id") is None:
                result["document_id"] = item.get("id")
            if not result.get("filename") and item.get("filename"):
                result["filename"] = item["filename"]
        item["result"] = result
        item["snapshot"] = result
        if item.get("uploaded_at") and hasattr(item["uploaded_at"], "isoformat"):
            item["uploaded_at"] = item["uploaded_at"].isoformat()
        elif item.get("uploaded_at"):
            item["uploaded_at"] = str(item["uploaded_at"])
        out.append(item)
    return out

@app.get("/api/documents/my")
def get_my_documents(user_id: int = 1, db = Depends(get_db)):
    try:
        cursor = db.cursor(dictionary=True)
        try:
            cursor.execute(
                """
                SELECT id, filename, risk_level, clauses_detected, uploaded_at, analysis_json
                FROM documents
                WHERE user_id = %s
                ORDER BY COALESCE(uploaded_at, id) DESC, id DESC
                LIMIT 100
                """,
                (user_id,),
            )
            rows = cursor.fetchall()
            include_json = True
        except Exception:
            cursor.execute(
                """
                SELECT id, filename, risk_level, clauses_detected, uploaded_at
                FROM documents
                WHERE user_id = %s
                ORDER BY COALESCE(uploaded_at, id) DESC, id DESC
                LIMIT 100
                """,
                (user_id,),
            )
            rows = cursor.fetchall()
            include_json = False
        cursor.close()
        return {"documents": _rows_to_document_list(rows, include_json)}
    except Exception as e:
        print(f"get_my_documents: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/documents/{document_id}")
def get_document_by_id(document_id: int, user_id: int = 1, db = Depends(get_db)):
    try:
        cursor = db.cursor(dictionary=True)
        try:
            cursor.execute(
                """
                SELECT id, filename, risk_level, clauses_detected, uploaded_at, analysis_json
                FROM documents
                WHERE id = %s AND user_id = %s
                LIMIT 1
                """,
                (document_id, user_id),
            )
        except Exception:
            cursor.execute(
                """
                SELECT id, filename, risk_level, clauses_detected, uploaded_at
                FROM documents
                WHERE id = %s AND user_id = %s
                LIMIT 1
                """,
                (document_id, user_id),
            )
        row = cursor.fetchone()
        cursor.close()
        if not row:
            raise HTTPException(status_code=404, detail="Document not found")
        raw = row.pop("analysis_json", None)
        parsed = json.loads(raw) if raw else None
        result = _normalize_stored_analysis_payload(parsed)
        if row.get("uploaded_at") and hasattr(row["uploaded_at"], "isoformat"):
            row["uploaded_at"] = row["uploaded_at"].isoformat()
        return {"document": row, "result": result, "snapshot": result}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/documents/analyze")
async def analyze_uploaded_document(
    file: UploadFile = File(...),
    user_id: int = Form(1),
    db = Depends(get_db),
):
    from risk_service import build_risk_segments, detect_risks, extract_text_from_pdf
    from calendar_service import read_docx_text

    try:
        safe_fn = (file.filename or "").lower()
        suffix = os.path.splitext(file.filename or "")[1] or ".bin"

        with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as temp_file:
            content = await file.read()
            temp_file.write(content)
            temp_file_path = temp_file.name

        text = ""
        if safe_fn.endswith(".docx"):
            text = read_docx_text(temp_file_path)
        elif safe_fn.endswith(".pdf"):
            with open(temp_file_path, "rb") as f:
                text = extract_text_from_pdf(f)
        else:
            os.remove(temp_file_path)
            raise HTTPException(status_code=400, detail="Only .docx and .pdf files are supported")

        os.remove(temp_file_path)

        from risk_service import detect_risks
        risky_sentences, risky_phrases = detect_risks(text)
        clauses_detected = len(risky_sentences)
        risk_segments = build_risk_segments(text)
        
        risk_score = min(100, (clauses_detected * 10) + (len(risky_phrases) * 5))
        risk_level = "Low"
        if risk_score > 30: risk_level = "Medium"
        if risk_score > 70: risk_level = "High"
        
        if os.getenv("GEMINI_SEPARATE_CALLS", "").lower() in ("1", "true", "yes"):
            from calendar_service import extract_events_with_gemini
            from summarizer import summarize_document_with_gemini

            summaries = summarize_document_with_gemini(text)
            calendar_events = extract_events_with_gemini(text)
        else:
            from gemini_combined import combined_summaries_and_events

            summaries, calendar_events = combined_summaries_and_events(text)

        analysis_payload = {
            "risk_level": risk_level,
            "risk_score": risk_score,
            "clauses_detected": clauses_detected,
            "risky_phrases": risky_phrases,
            "risk_segments": risk_segments,
        }

        fname = file.filename or "upload"
        cursor = db.cursor()
        has_analysis_json_col = True
        try:
            cursor.execute(
                """
                INSERT INTO documents (user_id, filename, risk_level, clauses_detected, analysis_json, uploaded_at)
                VALUES (%s, %s, %s, %s, NULL, %s)
                """,
                (user_id, fname, risk_level, clauses_detected, datetime.now()),
            )
        except Exception as db_err:
            err_s = str(db_err).lower()
            if "analysis_json" in err_s or "unknown column" in err_s:
                has_analysis_json_col = False
                cursor.execute(
                    """
                    INSERT INTO documents (user_id, filename, risk_level, clauses_detected, uploaded_at)
                    VALUES (%s, %s, %s, %s, %s)
                    """,
                    (user_id, fname, risk_level, clauses_detected, datetime.now()),
                )
            else:
                raise
        db.commit()
        document_id = cursor.lastrowid

        response_body = {
            "status": "success",
            "message": "Analysis Complete",
            "document_id": document_id,
            "filename": fname,
            "analysis": analysis_payload,
            "calendar_events": calendar_events,
        }
        if summaries and any(
            (str(v).strip() for v in summaries.values() if v is not None)
        ):
            response_body["summaries"] = summaries

        if has_analysis_json_col:
            try:
                payload = json.dumps(response_body, default=str)
            except (TypeError, ValueError) as je:
                raise HTTPException(
                    status_code=500,
                    detail=f"Could not serialize analysis result: {je}",
                ) from je
            cursor.execute(
                "UPDATE documents SET analysis_json = %s WHERE id = %s",
                (payload, document_id),
            )
            db.commit()
        try:
            try_save_extracted_events(db, user_id, document_id, calendar_events)
        except Exception as save_err:
            print(f"⚠ try_save_extracted_events (non-fatal): {save_err}")
        cursor.close()

        return response_body

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/upload")
async def upload_document(file: UploadFile = File(...), user_id: int = 1, db = Depends(get_db)):
    if not file.filename.lower().endswith(('.docx', '.pdf', '.txt')):
        raise HTTPException(status_code=400, detail="Only DOCX, PDF, and TXT files are supported")
    
    try:
        content = await file.read()
        
        text = ""
        if file.filename.lower().endswith('.docx'):
            from docx import Document
            import io
            docx_file = io.BytesIO(content)
            doc = Document(docx_file)
            text = "\n".join([p.text for p in doc.paragraphs])
        elif file.filename.lower().endswith('.pdf'):
            import io
            try:
                import PyPDF2
                pdf_file = io.BytesIO(content)
                pdf_reader = PyPDF2.PdfReader(pdf_file)
                text = "\n".join([page.extract_text() for page in pdf_reader.pages])
            except ImportError:
                text = "[PDF content - PyPDF2 library not installed]"
        else:
            text = content.decode('utf-8', errors='ignore')
        
        cursor = db.cursor()
        sql = """
            INSERT INTO documents (user_id, filename, content, uploaded_at) 
            VALUES (%s, %s, %s, %s)
        """
        cursor.execute(sql, (user_id, file.filename, text[:10000], datetime.now()))
        db.commit()
        document_id = cursor.lastrowid
        cursor.close()
        
        return {
            "status": "success",
            "message": "Document uploaded successfully",
            "document_id": document_id,
            "filename": file.filename,
            "size_bytes": len(content),
            "text_preview": text[:200]
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error uploading document: {str(e)}")

@app.get("/api/debug/users")
def get_all_users(db = Depends(get_db)):
    """DEBUG: List all users in the database."""
    try:
        cursor = db.cursor(dictionary=True)
        cursor.execute("SELECT id, name, email, role FROM users")
        users = cursor.fetchall()
        cursor.close()
        print(f"[DEBUG] All users in database: {users}")
        return { "users": users }
    except Exception as e:
        print(f"[ERROR] Debug error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    
@app.put("/api/update-profile/{user_id}")
def update_profile_simple(user_id: int, name: str, email: str, password: Optional[str] = None, db = Depends(get_db)):
    """Simple profile update endpoint using query parameters."""
    try:
        print(f"[DEBUG] Updating user {user_id}: name={name}, email={email}")
        cursor = db.cursor()
        
        # Check if user exists
        cursor.execute("SELECT id FROM users WHERE id = %s", (user_id,))
        if not cursor.fetchone():
            cursor.close()
            raise HTTPException(status_code=404, detail="User not found")
        
        # Check if email is already used by another user
        cursor.execute("SELECT id FROM users WHERE email = %s AND id != %s", (email, user_id))
        if cursor.fetchone():
            cursor.close()
            raise HTTPException(status_code=400, detail="Email already in use")
        
        # Update the user
        if password:
            cursor.execute(
                "UPDATE users SET name = %s, email = %s, password = %s WHERE id = %s",
                (name, email, password, user_id)
            )
        else:
            cursor.execute(
                "UPDATE users SET name = %s, email = %s WHERE id = %s",
                (name, email, user_id)
            )
        
        db.commit()
        cursor.close()
        
        print(f"[SUCCESS] User {user_id} updated to: {name}, {email}")
        return {
            "message": "Profile updated successfully", 
            "user_id": user_id, 
            "name": name, 
            "email": email
        }
    except HTTPException:
        raise
    except Exception as e:
        print(f"[ERROR] Update error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# This must always be at the bottom!
if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8001, reload=True)