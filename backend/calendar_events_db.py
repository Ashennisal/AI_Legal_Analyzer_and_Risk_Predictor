"""Persist Gemini-extracted deadlines into the Events table (optional migration)."""

import mysql.connector

from mysql.connector import Error as MySQLError


def try_save_extracted_events(conn, user_id: int, document_id: int, events: list) -> None:
    """
    Insert extracted calendar rows after document analysis.
    Silently skips if Events table is missing (run migrations/002_create_events_table.sql).
    """
    if not events:
        return

    rows = []
    for e in events:
        if not isinstance(e, dict):
            continue
        title = (e.get("title") or "").strip() or "Important Deadline"
        date_s = e.get("date")
        time_s = e.get("time") or "09:00"
        if not date_s:
            continue
        rows.append((user_id, document_id, title, date_s, time_s))

    if not rows:
        return

    cur = conn.cursor()
    try:
        cur.executemany(
            """
            INSERT IGNORE INTO Events (user_id, document_id, title, event_date, event_time, status, google_event_id)
            VALUES (%s, %s, %s, %s, %s, 'draft', NULL)
            """,
            rows,
        )
        conn.commit()
    except MySQLError as e:
        conn.rollback()
        if e.errno == 1146:
            return
        raise
    finally:
        cur.close()
