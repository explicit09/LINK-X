import os
import sys
import atexit
import types
import uuid

# ─── 0) Make docker-image/ & src/ importable ────────────────────────────
project_root = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
sys.path.insert(0, project_root)
sys.path.insert(0, os.path.join(project_root, "src"))

# ─── 1) Force SQLite in-memory for tests ───────────────────────────────
os.environ["POSTGRES_URL"] = "sqlite:///:memory:"

# ─── 2) Patch Postgres-specific types to SQLite-friendly ones ──────────
from sqlalchemy import JSON, LargeBinary
from sqlalchemy.dialects import postgresql
postgresql.JSONB = JSON
postgresql.BYTEA = LargeBinary

# ─── 3) Load .env (for any other vars you need) ─────────────────────────
from dotenv import load_dotenv
load_dotenv(override=False)

# ─── 4) Stub OpenAI env so transcriber/indexer init won’t fail───────────
os.environ.setdefault("OPENAI_API_KEY", "testkey")

# ─── 5) Stub out external modules before importing your app ────────────
# — transcriber
transcriber_stub = types.ModuleType("transcriber")
transcriber_stub.transcribe_audio = lambda f: None
sys.modules["transcriber"] = transcriber_stub

# — indexer
indexer_stub = types.ModuleType("indexer")
indexer_stub.rebuild_course_index = lambda db, cid: (b"", b"")
sys.modules["indexer"] = indexer_stub

# — textUtils / textract
sys.modules["textUtils"] = types.ModuleType("textUtils")
sys.modules["textract"] = types.ModuleType("textract")

# — Firebase credentials + init no-ops
import firebase_admin
import firebase_admin.credentials
firebase_admin.credentials.Certificate = lambda path: None
firebase_admin.initialize_app = lambda *args, **kwargs: None

# — Firebase auth stub
import firebase_admin.auth as fauth
fauth.verify_id_token = lambda token: {"uid": token}
fauth.verify_session_cookie = lambda cookie, check_revoked=True: {
    "uid": uuid.UUID(cookie)
}

# ─── 6) Import your real Flask app & metadata ──────────────────────────
from src.app import app, Base, engine

# ─── 7) Enable TESTING in Flask ───────────────────────────────────────
app.config["TESTING"] = True

# ─── 8) Create all tables once, drop on exit ──────────────────────────
Base.metadata.create_all(engine)
atexit.register(lambda: Base.metadata.drop_all(engine))

# ─── 9) Pytest fixtures ───────────────────────────────────────────────
import pytest

@pytest.fixture
def client():
    return app.test_client()

@pytest.fixture
def auth_client(client):
    # set session cookie to a valid UUID string
    client.set_cookie("session", str(uuid.uuid4()))
    return client