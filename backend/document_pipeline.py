"""
PDF OCR (PyMuPDF + Tesseract) and Gemini multi-style summaries (from OCR/test.py flow).
"""
from __future__ import annotations

import io
import os
from pathlib import Path
from typing import Dict, Tuple

from dotenv import load_dotenv

load_dotenv(Path(__file__).resolve().parent / ".env")

SUMMARY_STYLES: Dict[str, str] = {
    "technical": (
        "You are a lawyer summarising a statute for other legal professionals. "
        "Your goals are: maximum legal accuracy, correct temporal framing, and preservation of key quantitative details.\n\n"
        "Instructions:\n"
        "- Use neutral, precise legal language.\n"
        "- Clearly identify, for each major rule, the **Mechanism** (what the Act does) and the **Trigger** (when/for whom it applies).\n"
        "- Preserve all important dates, time windows, thresholds, and amounts (e.g. LKR brackets, years, months).\n"
        "- If the Act is historical (e.g. commenced in 1972), describe obligations and actions in the correct temporal sense "
        "(what parties had to do at the time, and what legal effects continue today), not as generic present-day compliance advice.\n"
        "- Do NOT speculate, add new policy commentary, or omit conditions/exceptions mentioned in the text.\n"
        "- Where appropriate, refer to section numbers if they are clear from the text."
    ),
    "layman": (
        "You are explaining this legal document to a non-lawyer. "
        "Summarize what this document means in simple, everyday language. "
        "- Explain what each party is agreeing to do or allow. "
        "- Call out anything that could be risky or surprising for a normal person. "
        "- Avoid legal jargon; if you must use it, briefly define it. "
        "- Limit to 8 short bullet points."
    ),
    "actionable": (
        "You are creating an action list for someone reviewing this legal document. "
        "Extract specific, concrete next steps and decisions. "
        "- List what must be done, by whom, and by when if specified. "
        "- Include any clauses that should be double-checked, negotiated, or escalated to a lawyer. "
        "- Output only a numbered list of action items, each on a single line."
    ),
}

MAX_CHARS_FOR_SUMMARY = 120_000


def _safe_response_text(response) -> str:
    """Gemini sometimes has no .text (blocked, safety, or empty candidates)."""
    if response is None:
        return ""
    try:
        t = getattr(response, "text", None)
        if t:
            return str(t).strip()
    except (ValueError, AttributeError):
        pass
    try:
        cands = getattr(response, "candidates", None) or []
        if cands:
            parts = getattr(getattr(cands[0], "content", None), "parts", None) or []
            chunks = []
            for p in parts:
                chunks.append(getattr(p, "text", "") or "")
            return "".join(chunks).strip()
    except (TypeError, IndexError, AttributeError):
        pass
    return ""


def extract_text_pdf_ocr(pdf_path: str, dpi: int = 300) -> str:
    """
    Render each PDF page to an image and OCR with Tesseract.
    Requires the Tesseract binary installed (https://github.com/tesseract-ocr/tesseract).
    """
    import fitz  # PyMuPDF
    from PIL import Image
    import pytesseract

    parts: list[str] = []
    pdf_doc = fitz.open(pdf_path)
    try:
        for page in pdf_doc:
            pix = page.get_pixmap(dpi=dpi)
            image = Image.open(io.BytesIO(pix.tobytes()))
            text = pytesseract.image_to_string(image, lang="eng")
            parts.append(text)
    finally:
        pdf_doc.close()
    return "\n\n".join(parts)


def extract_pdf_text_with_fallback(pdf_path: str) -> Tuple[str, str]:
    """
    Try OCR first (scanned PDFs); fall back to PyPDF2 text extraction.
    Returns (text, source) where source is 'ocr' or 'pypdf2'.
    """
    try:
        ocr_text = extract_text_pdf_ocr(pdf_path)
        stripped = (ocr_text or "").strip()
        if len(stripped) >= 20:
            return ocr_text, "ocr"
    except Exception:
        pass

    from risk_service import extract_text_from_pdf

    with open(pdf_path, "rb") as f:
        pypdf_text = extract_text_from_pdf(f)
    return pypdf_text or "", "pypdf2"


def summarize_text_all_styles(text: str, model: str = "gemini-2.5-flash") -> Dict[str, str]:
    """Gemini summaries: technical, layman, actionable. Requires GEMINI_API_KEY."""
    try:
        from google import genai
    except ImportError as e:
        raise RuntimeError(
            "Missing package google-genai. In the same environment you use to run the API, run:\n"
            "  pip install google-genai\n"
            "Or: pip install -r requirements.txt"
        ) from e

    empty_msg = "No text was extracted from this document; cannot summarize."
    if not (text or "").strip():
        return {
            "technical": empty_msg,
            "layman": empty_msg,
            "actionable": empty_msg,
        }

    api_key = (os.getenv("GEMINI_API_KEY") or "").strip()
    if not api_key:
        raise RuntimeError("GEMINI_API_KEY is not set in environment or backend/.env")

    client = genai.Client(api_key=api_key, http_options={"api_version": "v1"})
    truncated = text[:MAX_CHARS_FOR_SUMMARY]
    out: Dict[str, str] = {}
    for name, style_prompt in SUMMARY_STYLES.items():
        full_prompt = f"{style_prompt}\n\n{truncated}"
        try:
            response = client.models.generate_content(model=model, contents=full_prompt)
            body = _safe_response_text(response)
            out[name] = body or "(Model returned no text — it may have been blocked or empty.)"
        except Exception as ex:
            out[name] = f"Summary failed for this style: {ex}"
    return out
