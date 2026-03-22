"""
Google Calendar API helpers (from SLIIT archive server.py).
Requires token.json from running google_oauth_setup.py once.
"""
import datetime
import os
from pathlib import Path
from typing import Optional

from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build

BACKEND_DIR = Path(__file__).resolve().parent
TOKEN_PATH = BACKEND_DIR / "token.json"

SCOPES = ["https://www.googleapis.com/auth/calendar.events"]


def format_time(t):
    """Normalize MySQL TIME / timedelta / str to HH:MM for API responses."""
    if t is None:
        return ""

    if isinstance(t, datetime.timedelta):
        total_seconds = int(t.total_seconds())
        hh = (total_seconds // 3600) % 24
        mm = (total_seconds % 3600) // 60
        return f"{hh:02d}:{mm:02d}"

    if isinstance(t, (int, float)):
        total_seconds = int(t)
        hh = (total_seconds // 3600) % 24
        mm = (total_seconds % 3600) // 60
        return f"{hh:02d}:{mm:02d}"

    if isinstance(t, datetime.time):
        return t.strftime("%H:%M")

    s = str(t)
    return s[:5] if len(s) >= 5 else s


def get_calendar_service():
    """Build Calendar API v3 service using token.json in the backend folder."""
    if not TOKEN_PATH.exists():
        raise FileNotFoundError(
            "token.json not found in backend/. Run: python google_oauth_setup.py "
            "(place credentials.json from Google Cloud Console in backend/ first)."
        )

    creds = Credentials.from_authorized_user_file(str(TOKEN_PATH), SCOPES)
    return build("calendar", "v3", credentials=creds, cache_discovery=False)


def build_event_body(title: str, event_date: str, hhmm: str, time_zone: Optional[str] = None):
    """Google Calendar event body for insert/patch (30-minute duration)."""
    tz = time_zone or os.getenv("GOOGLE_CALENDAR_TIMEZONE", "Asia/Colombo")
    if not hhmm:
        hhmm = "09:00"

    start_dt = f"{event_date}T{hhmm}:00"
    end_time = (
        datetime.datetime.strptime(hhmm, "%H:%M") + datetime.timedelta(minutes=30)
    ).strftime("%H:%M")
    end_dt = f"{event_date}T{end_time}:00"

    return {
        "summary": title,
        "start": {"dateTime": start_dt, "timeZone": tz},
        "end": {"dateTime": end_dt, "timeZone": tz},
    }
