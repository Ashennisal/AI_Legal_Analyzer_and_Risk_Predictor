"""
Single Gemini request that returns both AI summaries and calendar events.
Cuts API usage in half vs calling summarizer + calendar_service separately (helps free-tier quota).
"""
from __future__ import annotations

import json
import os
from pathlib import Path
from typing import Dict, List, Optional, Tuple

_env_path = Path(__file__).resolve().parent / ".env"
try:
    from dotenv import load_dotenv

    load_dotenv(_env_path)
except ImportError:
    pass


def combined_summaries_and_events(
    text: str,
    model: Optional[str] = None,
) -> Tuple[Dict[str, str], List[dict]]:
    """
    Returns (summaries dict, calendar event list).
    On any failure, returns ({"technical":"","layman":"","actionable":""}, []).
    """
    from summarizer import _extract_json_object, _normalize_summary_dict
    from calendar_service import (
        _response_text_safe,
        _strip_json_fences,
        normalize_events_list,
    )

    empty_s: Dict[str, str] = {"technical": "", "layman": "", "actionable": ""}
    if not (text or "").strip():
        return empty_s, []

    try:
        from google import genai
        from google.genai import types
    except ImportError:
        print("⚠ combined: google-genai not installed")
        return empty_s, []

    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        print("⚠ combined: GEMINI_API_KEY not set")
        return empty_s, []

    model = model or os.getenv("GEMINI_MODEL", "gemini-2.5-flash")
    text = text[:12000]

    prompt = f"""
Return ONLY valid JSON. No markdown code fences. No text before or after the JSON object.

Required shape:
{{
  "summaries": {{
    "technical": "string",
    "layman": "string",
    "actionable": "string"
  }},
  "events": [
    {{"title": "string", "date": "YYYY-MM-DD", "time": "HH:MM"}}
  ]
}}

Summaries:
- technical: concise legal/contract summary for someone with legal training.
- layman: plain English for a non-lawyer.
- actionable: concrete next steps, deadlines to watch, decisions.

Events:
- Only include items with a real calendar date (YYYY-MM-DD).
- Resolve relative deadlines using base dates in the document; omit if impossible.
- time is HH:MM (24-hour); if missing use 09:00.

DOCUMENT:
{text}
""".strip()

    try:
        client = genai.Client(
            api_key=api_key,
            http_options={"api_version": "v1"},
        )
        response = client.models.generate_content(
            model=model,
            contents=prompt,
            config=types.GenerateContentConfig(
                temperature=0.4,
                max_output_tokens=8192,
            ),
        )
        raw = _strip_json_fences(_response_text_safe(response))
        if not raw.strip():
            print("⚠ combined: empty model response")
            return empty_s, []
        blob = _extract_json_object(raw)
        data = json.loads(blob)
    except Exception as e:
        print(f"⚠ combined Gemini analysis failed: {e}")
        return empty_s, []

    if not isinstance(data, dict):
        return empty_s, []

    sums = data.get("summaries")
    if not isinstance(sums, dict):
        sums = {}
    sums = _normalize_summary_dict(sums)

    ev_raw = data.get("events")
    if not isinstance(ev_raw, list):
        ev_raw = []

    events = normalize_events_list(ev_raw, default_time="09:00")
    return sums, events
