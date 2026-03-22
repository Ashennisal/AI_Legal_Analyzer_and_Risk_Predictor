"""
One-time OAuth: opens a browser, saves token.json next to this file for Google Calendar API.
Place credentials.json (OAuth client ID from Google Cloud Console) in backend/ first.

Usage (from backend folder):
  python google_oauth_setup.py
"""
import os
from pathlib import Path

from google_auth_oauthlib.flow import InstalledAppFlow

SCOPES = ["https://www.googleapis.com/auth/calendar.events"]

BACKEND_DIR = Path(__file__).resolve().parent
CREDENTIALS = BACKEND_DIR / "credentials.json"
TOKEN = BACKEND_DIR / "token.json"


def main():
    if not CREDENTIALS.exists():
        raise FileNotFoundError(
            f"Missing {CREDENTIALS}. Download OAuth 2.0 Client credentials from "
            "Google Cloud Console (Desktop app) and save as credentials.json in backend/."
        )

    flow = InstalledAppFlow.from_client_secrets_file(str(CREDENTIALS), SCOPES)
    creds = flow.run_local_server(port=0)

    TOKEN.write_text(creds.to_json(), encoding="utf-8")
    print(f"Saved {TOKEN}. Restart the API server before syncing to Google Calendar.")


if __name__ == "__main__":
    main()
