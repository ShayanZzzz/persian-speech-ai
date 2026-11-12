"""History regressions on disposable SQLite; inference and rendering are mocked."""
import asyncio
import importlib
import io
import json
import os
import tempfile
import sys
import unittest
from datetime import datetime, timezone
from pathlib import Path
from types import ModuleType, SimpleNamespace
from unittest.mock import patch

os.environ["DATABASE_URL"] = "sqlite://"
os.environ["SECRET_KEY"] = "history-tests-only-secret-key-at-least-32-bytes"

from sqlalchemy import create_engine
from sqlalchemy.orm import Session
from sqlalchemy.pool import StaticPool
from src.database import Base
from src.models import MediaFile, TranscriptionHistory, User
from src.history import get_history_record, list_history


class HistoryTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        inference = ModuleType("src.inference")
        inference.transcribe_with_model = lambda *args: None
        previous = sys.modules.get("src.inference")
        sys.modules["src.inference"] = inference
        try:
            cls.api = importlib.import_module("main")
        finally:
            if previous is None:
                sys.modules.pop("src.inference", None)
            else:
                sys.modules["src.inference"] = previous

    def setUp(self):
        self.engine = create_engine("sqlite://", poolclass=StaticPool, connect_args={"check_same_thread": False})
        Base.metadata.create_all(self.engine)
        self.db = Session(self.engine)
        self.db.add_all([User(id=i, email=f"{i}@test.invalid", hashed_password="unused") for i in (1, 2)])
        for i in range(1, 62):
            self.db.add(TranscriptionHistory(id=i, user_id=1, filename=f"file-{i:03}.wav", language="fa", text="text", created_at=datetime(2026, 11, 1, 0, i % 60, tzinfo=timezone.utc)))
        self.db.add(TranscriptionHistory(id=100, user_id=2, filename="private.wav", language="xx", text="private"))
        self.db.add_all([
            MediaFile(id=1, public_id=900000000000000001, user_id=1, filename="speech_alba.wav", media_type="audio/wav", file_size_bytes=10, storage_path="media_uploads/tts_old.wav", detected_language="en"),
            MediaFile(id=2, public_id=900000000000000002, user_id=2, filename="private-tts.wav", media_type="audio/wav", file_size_bytes=10, storage_path="media_uploads/tts_private.wav"),
            MediaFile(id=3, public_id=900000000000000003, user_id=1, filename="speech_anna.wav", media_type="audio/wav", file_size_bytes=10, storage_path="media_uploads/tts_new.wav", detected_language="en"),
        ])
        self.db.flush()
        self.db.add_all([
            TranscriptionHistory(id=62, user_id=1, media_file_id=3, filename="speech_anna.wav", language="en", text="hello", mode="tts:anna"),
            TranscriptionHistory(id=63, user_id=1, filename="clip.MP4", language="fa", text="video transcript"),
            TranscriptionHistory(id=64, user_id=1, filename="clip-subtitled.mp4", language="und", text="subtitle", mode="video-export"),
            TranscriptionHistory(id=65, user_id=1, filename="100%_done.wav", language="fa", text="literal"),
        ])
        self.db.commit()
        self.api.app.dependency_overrides[self.api.get_db] = lambda: self.db

    def tearDown(self):
        self.api.app.dependency_overrides.clear()
        self.db.close()
        self.engine.dispose()

    def request(self, path, token="valid"):
        from src.auth import create_access_token
        headers = [] if token is None else [(b"authorization", f"Bearer {create_access_token(1) if token == 'valid' else token}".encode())]
        route, _, query = path.partition("?")
        messages = []
        async def receive():
            return {"type": "http.request", "body": b"", "more_body": False}
        async def send(message):
            messages.append(message)
        asyncio.run(self.api.app({"type": "http", "asgi": {"version": "3.0"}, "http_version": "1.1", "method": "GET", "scheme": "http", "path": route, "raw_path": route.encode(), "query_string": query.encode(), "headers": headers, "client": ("127.0.0.1", 1234), "server": ("test", 80)}, receive, send))
        status = next(m["status"] for m in messages if m["type"] == "http.response.start")
        body = b"".join(m.get("body", b"") for m in messages if m["type"] == "http.response.body")
        return status, json.loads(body)

    def test_all_pages_include_records_older_than_fifty(self):
        items = []
        for page in range(1, 8):
            result = list_history(self.db, 1, page=page, page_size=10)
            self.assertEqual(result["total"], 66)
            items += result["items"]
        self.assertEqual(len(items), 66)
        self.assertEqual(len({str(row["id"]) for row in items}), 66)
        self.assertIsNotNone(get_history_record(self.db, 1, "1"))

    def test_tts_legacy_and_new_are_not_duplicated(self):
        result = list_history(self.db, 1, page=1, kind="tts")
        self.assertEqual({str(row["id"]) for row in result["items"]}, {"62", "tts-1"})
        legacy = get_history_record(self.db, 1, "tts-1")
        self.assertEqual(legacy["public_id"], "900000000000000001")
        self.assertEqual(legacy["text"], "")

    def test_video_classification_and_language(self):
        self.assertEqual(list_history(self.db, 1, page=1, kind="video")["total"], 2)
        self.assertEqual(list_history(self.db, 1, page=1, language="en")["total"], 2)
        self.assertNotIn("xx", list_history(self.db, 1, page=1)["languages"])

    def test_literal_search_dates_sort_and_empty_results(self):
        self.assertEqual(list_history(self.db, 1, page=1, search="%_")["total"], 1)
        from datetime import date
        result = list_history(self.db, 1, page=1, page_size=100, date_from=date(2026, 11, 1), date_to=date(2026, 11, 1), sort="oldest")
        self.assertEqual(result["total"], 61)
        self.assertEqual(result["items"][0]["id"], 60)
        names = list_history(self.db, 1, page=1, page_size=100, sort="name_asc")["items"]
        self.assertEqual([r["filename"].lower() for r in names], sorted(r["filename"].lower() for r in names))
        empty = list_history(self.db, 1, page=9, search="missing")
        self.assertEqual((empty["items"], empty["page"], empty["pages"]), ([], 1, 1))

    def test_http_authentication_ownership_and_validation(self):
        self.assertIn(self.request("/history?page=1", token=None)[0], (401, 403))
        self.assertEqual(self.request("/history?page=1", token="invalid")[0], 401)
        for record_id in ("100", "tts-2"):
            self.assertEqual(self.request(f"/history/{record_id}")[0], 404)
        for query in ("page=0", "page=1&page_size=101", "page=1&kind=other", "page=1&sort=other", "page=1&date_from=bad", "page=1&date_from=2026-11-12&date_to=2026-11-01"):
            self.assertEqual(self.request(f"/history?{query}")[0], 422)
        status, payload = self.request("/history?page=1&page_size=100")
        self.assertEqual(status, 200)
        self.assertEqual(payload["total"], 66)
        self.assertNotIn(100, [row["id"] for row in payload["items"]])
        self.assertEqual(self.request("/history/1")[0], 200)

    def test_legacy_response_remains_an_array(self):
        status, rows = self.request("/history")
        self.assertEqual(status, 200)
        self.assertIsInstance(rows, list)
        self.assertEqual(len(rows), 50)

    def test_new_tts_is_recorded_with_input_text(self):
        with tempfile.TemporaryDirectory() as folder:
            storage = Path(folder)
            # The CLI and its WAV output are mocked; no inference is run.
            def generate(command, **kwargs):
                Path(command[command.index("--output-path") + 1]).write_bytes(b"test wav")
                return SimpleNamespace(returncode=0)
            with patch.object(self.api, "AUDIO_STORAGE_DIR", storage), patch.object(self.api, "__file__", str(storage / "main.py")), patch.object(Path, "is_file", return_value=True), patch.object(self.api.subprocess, "run", side_effect=generate):
                result = self.api.generate_tts.__wrapped__(
                    payload=self.api.TTSGenerateRequest(text="Hello saved input", voice="alba"),
                    request=SimpleNamespace(), current_user=self.db.get(User, 1), db=self.db,
                )
            saved = self.db.query(TranscriptionHistory).filter_by(text="Hello saved input").one()
            self.assertEqual(saved.mode, "tts:alba")
            self.assertIsNotNone(saved.media_file_id)
            self.assertEqual(result["filename"], "speech_alba.wav")

    def test_video_export_records_signed_in_user_and_preserves_guest_export(self):
        from starlette.datastructures import UploadFile
        def render(command, **kwargs):
            if "-show_entries" in command:
                return SimpleNamespace(stdout=json.dumps({"streams": [{"width": 640, "height": 480}]}), returncode=0)
            Path(command[-1]).write_bytes(b"mock mp4")
            return SimpleNamespace(returncode=0)
        before = self.db.query(TranscriptionHistory).count()
        for user in (self.db.get(User, 1), None):
            with patch.object(self.api.subprocess, "run", side_effect=render), patch.object(self.api.shutil, "which", return_value="/mock/ffmpeg"):
                response = asyncio.run(self.api.export_video.__wrapped__(
                    request=SimpleNamespace(),
                    file=UploadFile(io.BytesIO(b"mock input"), filename="fresh.mp4"),
                    subtitles_json=json.dumps([{"start": 0, "end": 1, "text": "saved subtitle"}]),
                    style_json=json.dumps({"previewVideoHeight": 480}),
                    current_user=user, db=self.db,
                ))
                self.assertTrue(Path(response.path).is_file())
                asyncio.run(response.background())
                self.assertFalse(Path(response.path).exists())
        self.assertEqual(self.db.query(TranscriptionHistory).count(), before + 1)
        saved = self.db.query(TranscriptionHistory).filter_by(filename="fresh-subtitled.mp4").one()
        self.assertEqual((saved.user_id, saved.mode, saved.text), (1, "video-export", "saved subtitle"))

    def test_failed_video_export_does_not_create_history(self):
        from fastapi import HTTPException
        from starlette.datastructures import UploadFile
        before = self.db.query(TranscriptionHistory).count()
        with patch.object(self.api.subprocess, "run", return_value=SimpleNamespace(stdout='{"streams": [{"width": 640, "height": 480}]}', returncode=1)), patch.object(self.api.shutil, "which", return_value="/mock/ffmpeg"):
            with self.assertRaises(HTTPException):
                asyncio.run(self.api.export_video.__wrapped__(
                    request=SimpleNamespace(), file=UploadFile(io.BytesIO(b"input"), filename="failed.mp4"),
                    subtitles_json='[{"start":0,"end":1,"text":"test"}]',
                    style_json='{"previewVideoHeight":480}', current_user=self.db.get(User, 1), db=self.db,
                ))
        self.assertEqual(self.db.query(TranscriptionHistory).count(), before)


if __name__ == "__main__":
    unittest.main()
