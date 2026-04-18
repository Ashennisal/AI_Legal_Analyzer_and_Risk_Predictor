"""Gemini multi-turn de chat with optional PDF/image attachment (legal assistant context)."""
from __future__ import annotations



import os
import tempfile

from google import genai
from google.genai import types

LEGAL_INSTRUCTION = (
    "You are an AI assistant helping users understand legal documents, contracts, and risk-related "
    "questions. Be clear and structured. You are not a lawyer; remind the user to seek professional "
    "legal counsel for binding decisions."
)

_client: genai.Client | None = None


def _client_singleton() -> genai.Client:
    global _client
    if _client is None:
        key = os.getenv("GEMINI_API_KEY")
        if not key:
            raise RuntimeError("GEMINI_API_KEY is not set in the environment.")
        _client = genai.Client(api_key=key, http_options={"api_version": "v1"})
    return _client


def get_gemini_response(
    history_contents: list,
    prompt: str,
    file_bytes: bytes | None = None,
    mime_type: str | None = None,
    model: str = "gemini-2.5-flash",
) -> str:
    """
    history_contents: list of {"role": "user"|"model", "parts": [{"text": "..."}, ...]}
    Appends one final user turn with optional file + prompt.
    """
    client = _client_singleton()
    contents: list = []

    for msg in history_contents:
        msg_parts = []
        for p in msg.get("parts", []):
            if isinstance(p, str):
                msg_parts.append(types.Part.from_text(text=p))
            elif isinstance(p, dict) and "text" in p:
                msg_parts.append(types.Part.from_text(text=p["text"]))
            else:
                msg_parts.append(p)
        contents.append(types.Content(role=msg.get("role"), parts=msg_parts))

    parts: list = []

    if file_bytes and mime_type:
        if "image" in mime_type:
            parts.append(types.Part.from_bytes(data=file_bytes, mime_type=mime_type))
        elif "pdf" in mime_type:
            with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as tmp:
                tmp.write(file_bytes)
                tmp_path = tmp.name
            try:
                uploaded = client.files.upload(file=tmp_path)
                parts.append(
                    types.Part.from_uri(file_uri=uploaded.uri, mime_type=uploaded.mime_type)
                )
            finally:
                os.unlink(tmp_path)

    full_prompt = f"{LEGAL_INSTRUCTION}\n\nUser question:\n{prompt}"
    parts.append(types.Part.from_text(text=full_prompt))

    contents.append(types.Content(role="user", parts=parts))

    try:
        response = client.models.generate_content(model=model, contents=contents)
        return (response.text or "").strip() or "I could not generate a response. Please try again."
    except Exception as e:
        print(f"Gemini chat error: {e}")
        raise
