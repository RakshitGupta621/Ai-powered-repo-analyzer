"""
Integration tests for FastAPI routers.
Mocks Gemini and ChromaDB so no real API calls are made.
Run with: pytest tests/ -v
"""

import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from fastapi.testclient import TestClient

# ── Patch external deps before importing app ─────────────────────────────────

@pytest.fixture(autouse=True)
def mock_chroma(monkeypatch):
    """Mock ChromaDB so no real DB is needed."""
    mock_collection = MagicMock()
    mock_collection.count.return_value = 5
    mock_collection.upsert.return_value = None
    mock_collection.query.return_value = {
        "ids": [["chunk-1", "chunk-2"]],
        "documents": [["def authenticate():", "class AuthMiddleware:"]],
        "metadatas": [[
            {"file_path": "src/auth.py", "language": "python", "start_line": 1, "end_line": 5, "project_id": "test"},
            {"file_path": "src/middleware.py", "language": "python", "start_line": 10, "end_line": 20, "project_id": "test"},
        ]],
        "distances": [[0.05, 0.15]],
    }

    monkeypatch.setattr(
        "utils.chroma_client.get_or_create_collection",
        lambda project_id: mock_collection,
    )
    monkeypatch.setattr(
        "utils.chroma_client.delete_collection",
        lambda project_id: True,
    )


@pytest.fixture(autouse=True)
def mock_gemini(monkeypatch):
    """Mock Gemini API so no real API calls are made."""
    async def fake_embeddings(texts):
        return [[0.1] * 768 for _ in texts]

    async def fake_query_embedding(text):
        return [0.1] * 768

    async def fake_answer(question, code_chunks, chat_history=None):
        return f"Auth is handled in `src/auth.py`. The `authenticate()` function validates tokens."

    monkeypatch.setattr("services.gemini_service.get_embeddings", fake_embeddings)
    monkeypatch.setattr("services.gemini_service.get_query_embedding", fake_query_embedding)
    monkeypatch.setattr("services.gemini_service.generate_answer", fake_answer)


@pytest.fixture
def client():
    # Import after patches are applied
    from main import app
    return TestClient(app)


VALID_INTERNAL_KEY = "change-me-internal-secret"
HEADERS = {"x-internal-key": VALID_INTERNAL_KEY}


# ── Health ─────────────────────────────────────────────────────────────────────

class TestHealth:
    def test_health_returns_ok(self, client):
        r = client.get("/health")
        assert r.status_code == 200
        assert r.json()["status"] == "ok"


# ── Ingest ─────────────────────────────────────────────────────────────────────

class TestIngest:
    def _valid_payload(self):
        return {
            "project_id": "proj-abc-123",
            "chunks": [
                {
                    "chunk_id": "chunk-001",
                    "project_id": "proj-abc-123",
                    "content": "def authenticate(token): pass",
                    "file_path": "src/auth.py",
                    "language": "python",
                    "start_line": 1,
                    "end_line": 3,
                }
            ],
        }

    def test_ingest_success(self, client):
        r = client.post("/ingest", json=self._valid_payload(), headers=HEADERS)
        assert r.status_code == 200
        body = r.json()
        assert body["chunks_stored"] == 1
        assert body["project_id"] == "proj-abc-123"

    def test_ingest_requires_auth(self, client):
        r = client.post("/ingest", json=self._valid_payload())
        assert r.status_code == 422  # Missing header

    def test_ingest_wrong_key(self, client):
        r = client.post("/ingest", json=self._valid_payload(), headers={"x-internal-key": "wrong"})
        assert r.status_code == 401

    def test_ingest_empty_chunks_rejected(self, client):
        payload = {"project_id": "proj-1", "chunks": []}
        r = client.post("/ingest", json=payload, headers=HEADERS)
        assert r.status_code == 422

    def test_delete_project_vectors(self, client):
        r = client.delete("/ingest/proj-abc-123", headers=HEADERS)
        assert r.status_code == 200
        assert r.json()["deleted"] is True


# ── Query ─────────────────────────────────────────────────────────────────────

class TestQuery:
    def _valid_payload(self):
        return {
            "project_id": "proj-abc-123",
            "question": "Where is authentication handled?",
        }

    def test_query_success(self, client):
        r = client.post("/query", json=self._valid_payload(), headers=HEADERS)
        assert r.status_code == 200
        body = r.json()
        assert "answer" in body
        assert isinstance(body["retrieved_chunks"], list)
        assert len(body["retrieved_chunks"]) > 0

    def test_query_requires_auth(self, client):
        r = client.post("/query", json=self._valid_payload())
        assert r.status_code == 422

    def test_query_wrong_key(self, client):
        r = client.post("/query", json=self._valid_payload(), headers={"x-internal-key": "bad"})
        assert r.status_code == 401

    def test_query_short_question_rejected(self, client):
        payload = {"project_id": "proj-1", "question": "ab"}
        r = client.post("/query", json=payload, headers=HEADERS)
        assert r.status_code == 422

    def test_query_with_top_k(self, client):
        payload = {**self._valid_payload(), "top_k": 3}
        r = client.post("/query", json=payload, headers=HEADERS)
        assert r.status_code == 200

    def test_query_with_chat_history(self, client):
        payload = {
            **self._valid_payload(),
            "chat_history": [
                {"role": "user", "content": "What is this repo?"},
                {"role": "assistant", "content": "It is an API server."},
            ],
        }
        r = client.post("/query", json=payload, headers=HEADERS)
        assert r.status_code == 200


# ── Embed ──────────────────────────────────────────────────────────────────────

class TestEmbed:
    def test_embed_success(self, client):
        r = client.post(
            "/embed",
            json={"texts": ["hello world", "authentication function"]},
            headers=HEADERS,
        )
        assert r.status_code == 200
        body = r.json()
        assert len(body["embeddings"]) == 2
        assert len(body["embeddings"][0]) == 768

    def test_embed_too_many_texts(self, client):
        payload = {"texts": [f"text {i}" for i in range(101)]}
        r = client.post("/embed", json=payload, headers=HEADERS)
        assert r.status_code == 400
