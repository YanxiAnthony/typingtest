import os
import sqlite3
import sys
import tempfile
import threading
import unittest
import urllib.error
import urllib.request
from functools import partial
from http.server import ThreadingHTTPServer
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(PROJECT_ROOT))

from server import EchoFlowHandler, MIGRATIONS, PracticeDatabase, ROOT


def valid_attempt(attempt_id="attempt-1"):
    return {
        "id": attempt_id,
        "lessonId": "us/NCE1/example",
        "startedAt": 1_000,
        "completedAt": 2_000,
        "elapsedMs": 1_000,
        "wpm": 42.5,
        "resultAccuracy": 100,
        "processAccuracy": 92.5,
        "correctKeystrokes": 37,
        "incorrectKeystrokes": 3,
        "targetChars": 35,
    }


class PracticeDatabaseTests(unittest.TestCase):
    def setUp(self):
        self.temp_dir = tempfile.TemporaryDirectory()
        self.db_path = Path(self.temp_dir.name) / "typing.db"
        self.database = PracticeDatabase(self.db_path)

    def tearDown(self):
        self.temp_dir.cleanup()

    def test_migrations_are_versioned_and_idempotent(self):
        with sqlite3.connect(self.db_path) as connection:
            self.assertEqual(connection.execute("PRAGMA user_version").fetchone()[0], len(MIGRATIONS))
            tables = {
                row[0]
                for row in connection.execute("SELECT name FROM sqlite_master WHERE type = 'table'")
            }
        self.assertIn("practice_attempts", tables)
        self.assertIn("practice_baselines", tables)

        PracticeDatabase(self.db_path)
        with sqlite3.connect(self.db_path) as connection:
            self.assertEqual(connection.execute("PRAGMA user_version").fetchone()[0], len(MIGRATIONS))

    def test_existing_unversioned_schema_is_adopted(self):
        legacy_path = Path(self.temp_dir.name) / "legacy.db"
        with sqlite3.connect(legacy_path) as connection:
            connection.executescript(MIGRATIONS[0])
            self.assertEqual(connection.execute("PRAGMA user_version").fetchone()[0], 0)

        PracticeDatabase(legacy_path)
        with sqlite3.connect(legacy_path) as connection:
            self.assertEqual(connection.execute("PRAGMA user_version").fetchone()[0], len(MIGRATIONS))

    def test_newer_schema_is_not_silently_downgraded(self):
        future_path = Path(self.temp_dir.name) / "future.db"
        with sqlite3.connect(future_path) as connection:
            connection.execute(f"PRAGMA user_version = {len(MIGRATIONS) + 1}")
        with self.assertRaisesRegex(RuntimeError, "newer than supported"):
            PracticeDatabase(future_path)

    def test_sync_is_idempotent_and_reports_rejections(self):
        payload = {
            "since": 0,
            "attempts": [valid_attempt(), {"id": "bad", "lessonId": "lesson"}],
            "baselines": [],
        }
        first = self.database.sync(payload)
        second = self.database.sync(payload)

        self.assertEqual(first["acceptedIds"], ["attempt-1"])
        self.assertEqual(first["rejectedAttempts"], [{"id": "bad", "reason": "missing_completed_at"}])
        self.assertEqual(second["acceptedIds"], ["attempt-1"])
        with sqlite3.connect(self.db_path) as connection:
            self.assertEqual(connection.execute("SELECT COUNT(*) FROM practice_attempts").fetchone()[0], 1)

    def test_baselines_only_move_forward(self):
        self.database.sync({
            "baselines": [{"lessonId": "lesson", "completedRuns": 3, "lastCompletedAt": 300}],
        })
        self.database.sync({
            "baselines": [{"lessonId": "lesson", "completedRuns": 2, "lastCompletedAt": 200}],
        })
        exported = self.database.export_data()
        self.assertEqual(exported["baselines"][0]["completedRuns"], 3)
        self.assertEqual(exported["baselines"][0]["lastCompletedAt"], 300)

    @unittest.skipUnless(Path("/proc/self/fd").exists(), "file descriptor check requires /proc")
    def test_export_closes_connections(self):
        target = str(self.db_path)

        def open_database_descriptors():
            descriptors = []
            for name in os.listdir("/proc/self/fd"):
                try:
                    destination = os.readlink("/proc/self/fd/" + name)
                except OSError:
                    continue
                if destination.startswith(target):
                    descriptors.append(destination)
            return descriptors

        for _ in range(50):
            self.database.export_data()
        self.assertEqual(open_database_descriptors(), [])


class PracticeHandlerTests(unittest.TestCase):
    def setUp(self):
        self.temp_dir = tempfile.TemporaryDirectory()
        EchoFlowHandler.database = PracticeDatabase(Path(self.temp_dir.name) / "typing.db")
        handler = partial(EchoFlowHandler, directory=str(ROOT))
        self.server = ThreadingHTTPServer(("127.0.0.1", 0), handler)
        self.thread = threading.Thread(target=self.server.serve_forever, daemon=True)
        self.thread.start()
        self.base_url = f"http://127.0.0.1:{self.server.server_port}"

    def tearDown(self):
        self.server.shutdown()
        self.server.server_close()
        self.thread.join(timeout=2)
        self.temp_dir.cleanup()

    def test_health_is_available_but_data_directory_is_private(self):
        with urllib.request.urlopen(self.base_url + "/api/health") as response:
            self.assertEqual(response.status, 200)
        with urllib.request.urlopen(self.base_url + "/tests/typing-browser-smoke.html") as response:
            self.assertEqual(response.status, 200)

        for path in ("/data/typing.db", "/data%2Ftyping.db"):
            with self.assertRaises(urllib.error.HTTPError) as raised:
                urllib.request.urlopen(self.base_url + path)
            self.assertEqual(raised.exception.code, 404)


if __name__ == "__main__":
    unittest.main()
