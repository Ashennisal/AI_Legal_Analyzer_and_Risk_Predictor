"""
AI document summaries (technical / layman / actionable) via Gemini.
"""
import json
import os
import re


def _strip_json_fences(s: str) -> str:
    """Remove ```json ... ``` or ``` ... ``` wrappers if model returns them."""
    s = s.strip()
    if s.startswith("```"):
        s = re.sub(r"^```(?:json)?\s*", "", s, flags=re.IGNORECASE)
        s = re.sub(r"\s*```$", "", s)
    return s.strip()


def summarize_document_with_gemini(
    text: str,
    model: str = "gemini-2.5-flash",
) -> dict:
    """
    Returns {"technical": str, "layman": str, "actionable": str}.
    On failure or missing deps, returns three empty strings (caller may omit from API response).
    """
    empty = {"technical": "", "layman": "", "actionable": ""}
    if not (text or "").strip():
        return empty

    try:
        from google import genai
    except ImportError:
        return empty

    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        return empty

    client = genai.Client(
        api_key=api_key,
        http_options={"api_version": "v1"},
    )

    text = text[:12000]

    prompt = f"""
Return ONLY valid JSON. Do NOT use markdown. Do NOT wrap in ```.

Output format EXACTLY:
{{"technical":"...","layman":"...","actionable":"..."}}

Rules:
- "technical": concise summary for someone with legal training (key terms, structure, obligations).
- "layman": plain English for a non-lawyer; avoid jargon or explain it briefly.
- "actionable": concrete next steps, deadlines to watch, or decisions the reader should make.
- Each value must be a single JSON string (escape quotes and newlines as needed). Keep each under 1200 words.

DOCUMENT:
{text}
""".strip()

    try:
        response = client.models.generate_content(
            model=model,
            contents=prompt,
        )
        raw = _strip_json_fences(response.text or "")
        data = json.loads(raw)
    except Exception as e:
        print(f"⚠ summarize_document_with_gemini failed: {e}")
        return empty

    if not isinstance(data, dict):
        return empty

    return {
        "technical": str(data.get("technical") or "").strip(),
        "layman": str(data.get("layman") or "").strip(),
        "actionable": str(data.get("actionable") or "").strip(),
    }
