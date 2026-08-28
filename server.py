#!/usr/bin/env python3
"""EchoFlow local server: static files plus SQLite practice-history API."""

from __future__ import annotations

import argparse
import csv
import io
import json
import sqlite3
import time
from contextlib import closing
from functools import partial
from http import HTTPStatus
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlparse


ROOT = Path(__file__).resolve().parent
DEFAULT_DB_PATH = ROOT / "data" / "typing.db"

MIGRATIONS = (
    """
    CREATE TABLE IF NOT EXISTS practice_attempts (
        id TEXT PRIMARY KEY,
        lesson_id TEXT NOT NULL,
        started_at INTEGER NOT NULL,
        completed_at INTEGER NOT NULL,
        elapsed_ms INTEGER NOT NULL,
        wpm REAL NOT NULL,
        result_accuracy REAL NOT NULL,
        process_accuracy REAL NOT NULL,
        correct_keystrokes INTEGER NOT NULL,
        incorrect_keystrokes INTEGER NOT NULL,
        target_chars INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_attempts_lesson_completed
        ON practice_attempts (lesson_id, completed_at DESC);
    CREATE INDEX IF NOT EXISTS idx_attempts_updated
        ON practice_attempts (updated_at);

    CREATE TABLE IF NOT EXISTS practice_baselines (
        lesson_id TEXT PRIMARY KEY,
        completed_runs INTEGER NOT NULL,
        last_completed_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
    );
    """,
)


def now_ms() -> int:
    return int(time.time() * 1000)


def safe_int(value, default=0) -> int:
    try:
        return int(value)
    except (TypeError, ValueError):
        return default


def safe_float(value, default=0.0) -> float:
    try:
        return float(value)
    except (TypeError, ValueError):
        return default


class PracticeDatabase:
    def __init__(self, path: Path):
        self.path = Path(path)
        self.path.parent.mkdir(parents=True, exist_ok=True)
        self._initialize()

    def connect(self):
        connection = sqlite3.connect(self.path, timeout=10)
        connection.row_factory = sqlite3.Row
        connection.execute("PRAGMA journal_mode=WAL")
        connection.execute("PRAGMA busy_timeout=10000")
        return connection

    def _initialize(self):
        with closing(self.connect()) as connection:
            current_version = connection.execute("PRAGMA user_version").fetchone()[0]
            if current_version > len(MIGRATIONS):
                raise RuntimeError(
                    f"Database schema version {current_version} is newer than supported version {len(MIGRATIONS)}"
                )
            for version, migration in enumerate(MIGRATIONS, start=1):
                if current_version >= version:
                    continue
                try:
                    connection.executescript(
                        "BEGIN IMMEDIATE;\n"
                        + migration
                        + f"\nPRAGMA user_version = {version};\nCOMMIT;"
                    )
                except Exception:
                    if connection.in_transaction:
                        connection.rollback()
                    raise
                current_version = version

    @staticmethod
    def normalize_attempt(raw, updated_at):
        if not isinstance(raw, dict):
            return None
        attempt_id = str(raw.get("id") or "").strip()
        lesson_id = str(raw.get("lessonId") or "").strip()
        if not attempt_id or not lesson_id:
            return None
        completed_at = max(0, safe_int(raw.get("completedAt")))
        started_at = max(0, safe_int(raw.get("startedAt")))
        elapsed_ms = max(0, safe_int(raw.get("elapsedMs")))
        if not completed_at:
            return None
        return (
            attempt_id,
            lesson_id,
            started_at,
            completed_at,
            elapsed_ms,
            max(0.0, safe_float(raw.get("wpm"))),
            min(100.0, max(0.0, safe_float(raw.get("resultAccuracy"), 100.0))),
            min(100.0, max(0.0, safe_float(raw.get("processAccuracy"), 100.0))),
            max(0, safe_int(raw.get("correctKeystrokes"))),
            max(0, safe_int(raw.get("incorrectKeystrokes"))),
            max(0, safe_int(raw.get("targetChars"))),
            updated_at,
        )

    @staticmethod
    def attempt_rejection_reason(raw):
        if not isinstance(raw, dict):
            return "attempt_must_be_an_object"
        if not str(raw.get("id") or "").strip():
            return "missing_id"
        if not str(raw.get("lessonId") or "").strip():
            return "missing_lesson_id"
        if max(0, safe_int(raw.get("completedAt"))) == 0:
            return "missing_completed_at"
        return "invalid_attempt"

    @staticmethod
    def attempt_to_json(row):
        return {
            "id": row["id"],
            "lessonId": row["lesson_id"],
            "startedAt": row["started_at"],
            "completedAt": row["completed_at"],
            "elapsedMs": row["elapsed_ms"],
            "wpm": row["wpm"],
            "resultAccuracy": row["result_accuracy"],
            "processAccuracy": row["process_accuracy"],
            "correctKeystrokes": row["correct_keystrokes"],
            "incorrectKeystrokes": row["incorrect_keystrokes"],
            "targetChars": row["target_chars"],
            "updatedAt": row["updated_at"],
            "syncStatus": "synced",
        }

    def sync(self, payload):
        payload = payload if isinstance(payload, dict) else {}
        since = max(0, safe_int(payload.get("since")))
        timestamp = now_ms()
        accepted_ids = []
        rejected_attempts = []

        with closing(self.connect()) as connection:
            with connection:
                for raw in payload.get("baselines") or []:
                    if not isinstance(raw, dict):
                        continue
                    lesson_id = str(raw.get("lessonId") or "").strip()
                    completed_runs = max(0, safe_int(raw.get("completedRuns")))
                    last_completed_at = max(0, safe_int(raw.get("lastCompletedAt")))
                    if not lesson_id or not completed_runs:
                        continue
                    connection.execute(
                        """
                        INSERT INTO practice_baselines
                            (lesson_id, completed_runs, last_completed_at, updated_at)
                        VALUES (?, ?, ?, ?)
                        ON CONFLICT(lesson_id) DO UPDATE SET
                            completed_runs = MAX(completed_runs, excluded.completed_runs),
                            last_completed_at = MAX(last_completed_at, excluded.last_completed_at),
                            updated_at = CASE
                                WHEN excluded.completed_runs > completed_runs
                                  OR excluded.last_completed_at > last_completed_at
                                THEN excluded.updated_at ELSE updated_at END
                        """,
                        (lesson_id, completed_runs, last_completed_at, timestamp),
                    )

                for raw in payload.get("attempts") or []:
                    normalized = self.normalize_attempt(raw, timestamp)
                    if not normalized:
                        attempt_id = str(raw.get("id") or "").strip() if isinstance(raw, dict) else ""
                        rejected_attempts.append({
                            "id": attempt_id,
                            "reason": self.attempt_rejection_reason(raw),
                        })
                        continue
                    connection.execute(
                        """
                        INSERT OR IGNORE INTO practice_attempts (
                            id, lesson_id, started_at, completed_at, elapsed_ms, wpm,
                            result_accuracy, process_accuracy, correct_keystrokes,
                            incorrect_keystrokes, target_chars, updated_at
                        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                        """,
                        normalized,
                    )
                    accepted_ids.append(normalized[0])

                attempts = connection.execute(
                    "SELECT * FROM practice_attempts WHERE updated_at >= ? ORDER BY updated_at, id",
                    (since,),
                ).fetchall()
                baselines = connection.execute(
                    "SELECT * FROM practice_baselines ORDER BY lesson_id"
                ).fetchall()

        return {
            "serverTime": timestamp,
            "acceptedIds": accepted_ids,
            "rejectedAttempts": rejected_attempts,
            "attempts": [self.attempt_to_json(row) for row in attempts],
            "baselines": [
                {
                    "lessonId": row["lesson_id"],
                    "completedRuns": row["completed_runs"],
                    "lastCompletedAt": row["last_completed_at"],
                    "updatedAt": row["updated_at"],
                }
                for row in baselines
            ],
        }

    def export_data(self):
        with closing(self.connect()) as connection:
            attempts = connection.execute(
                "SELECT * FROM practice_attempts ORDER BY completed_at, id"
            ).fetchall()
            baselines = connection.execute(
                "SELECT * FROM practice_baselines ORDER BY lesson_id"
            ).fetchall()
        return {
            "exportedAt": now_ms(),
            "attempts": [self.attempt_to_json(row) for row in attempts],
            "baselines": [
                {
                    "lessonId": row["lesson_id"],
                    "completedRuns": row["completed_runs"],
                    "lastCompletedAt": row["last_completed_at"],
                    "updatedAt": row["updated_at"],
                }
                for row in baselines
            ],
        }


class EchoFlowHandler(SimpleHTTPRequestHandler):
    database: PracticeDatabase = None

    def end_headers(self):
        self.send_header("X-Content-Type-Options", "nosniff")
        super().end_headers()

    def send_json(self, payload, status=HTTPStatus.OK):
        body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(body)

    def is_private_static_path(self):
        requested = Path(self.translate_path(self.path)).resolve()
        data_directory = (ROOT / "data").resolve()
        database_path = self.database.path.resolve()
        try:
            requested.relative_to(data_directory)
            return True
        except ValueError:
            pass
        return requested in {
            database_path,
            Path(str(database_path) + "-wal"),
            Path(str(database_path) + "-shm"),
        }

    def do_GET(self):
        if self.is_private_static_path():
            self.send_error(HTTPStatus.NOT_FOUND)
            return
        path = urlparse(self.path).path
        if path == "/api/health":
            self.send_json({"ok": True, "storage": "sqlite"})
            return
        if path == "/api/practice/export.json":
            payload = self.database.export_data()
            body = json.dumps(payload, ensure_ascii=False, indent=2).encode("utf-8")
            self.send_response(HTTPStatus.OK)
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.send_header("Content-Disposition", 'attachment; filename="typing-backup.json"')
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            self.wfile.write(body)
            return
        if path == "/api/practice/export.csv":
            data = self.database.export_data()["attempts"]
            output = io.StringIO()
            fieldnames = [
                "id", "lessonId", "startedAt", "completedAt", "elapsedMs", "wpm",
                "resultAccuracy", "processAccuracy", "correctKeystrokes",
                "incorrectKeystrokes", "targetChars"
            ]
            writer = csv.DictWriter(output, fieldnames=fieldnames, extrasaction="ignore")
            writer.writeheader()
            writer.writerows(data)
            body = output.getvalue().encode("utf-8-sig")
            self.send_response(HTTPStatus.OK)
            self.send_header("Content-Type", "text/csv; charset=utf-8")
            self.send_header("Content-Disposition", 'attachment; filename="typing-history.csv"')
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            self.wfile.write(body)
            return
        super().do_GET()

    def do_HEAD(self):
        if self.is_private_static_path():
            self.send_error(HTTPStatus.NOT_FOUND)
            return
        super().do_HEAD()

    def do_POST(self):
        path = urlparse(self.path).path
        if path != "/api/practice/sync":
            self.send_json({"error": "not_found"}, HTTPStatus.NOT_FOUND)
            return
        try:
            length = safe_int(self.headers.get("Content-Length"))
            if length < 0 or length > 10 * 1024 * 1024:
                raise ValueError("request_too_large")
            payload = json.loads(self.rfile.read(length) or b"{}")
            self.send_json(self.database.sync(payload))
        except (json.JSONDecodeError, ValueError) as error:
            self.send_json({"error": str(error)}, HTTPStatus.BAD_REQUEST)
        except Exception as error:  # Keep the local UI alive and expose a concise failure.
            self.log_error("practice sync failed: %s", error)
            self.send_json({"error": "sync_failed"}, HTTPStatus.INTERNAL_SERVER_ERROR)


def main():
    parser = argparse.ArgumentParser(description="EchoFlow local typing server")
    parser.add_argument("--host", default="127.0.0.1")
    parser.add_argument("--port", type=int, default=8000)
    parser.add_argument("--database", type=Path, default=DEFAULT_DB_PATH)
    args = parser.parse_args()

    EchoFlowHandler.database = PracticeDatabase(args.database)
    handler = partial(EchoFlowHandler, directory=str(ROOT))
    server = ThreadingHTTPServer((args.host, args.port), handler)
    print(f"EchoFlow: http://{args.host}:{args.port}/")
    print(f"Practice database: {args.database}")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()


if __name__ == "__main__":
    main()
