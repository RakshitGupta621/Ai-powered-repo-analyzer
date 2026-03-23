"""
ChromaDB singleton client.
Uses persistent local storage — no external DB needed.
"""

import chromadb
from chromadb.config import Settings as ChromaSettings
from config import settings

_client: chromadb.AsyncClientAPI | None = None


async def init_chroma() -> None:
    """Initialize persistent ChromaDB client on startup."""
    global _client
    _client = await chromadb.AsyncHttpClient() if False else _get_persistent_client()


def _get_persistent_client() -> chromadb.ClientAPI:
    """Return a synchronous persistent client (wrapped for async use)."""
    return chromadb.PersistentClient(
        path=settings.CHROMA_PATH,
        settings=ChromaSettings(anonymized_telemetry=False),
    )


def get_chroma() -> chromadb.ClientAPI:
    """Dependency: return the initialized client."""
    if _client is None:
        raise RuntimeError("ChromaDB not initialized — call init_chroma() first")
    return _client


def collection_name(project_id: str) -> str:
    """Return a consistent collection name for a project."""
    # ChromaDB collection names must be 3-63 chars, alphanumeric + dashes
    safe_id = project_id.replace("_", "-").lower()[:50]
    return f"{settings.CHROMA_COLLECTION_PREFIX}{safe_id}"


def get_or_create_collection(project_id: str) -> chromadb.Collection:
    """Get existing collection or create one for the project."""
    client = get_chroma()
    return client.get_or_create_collection(
        name=collection_name(project_id),
        metadata={"hnsw:space": "cosine"},   # cosine similarity
    )


def delete_collection(project_id: str) -> bool:
    """Delete a project's collection. Returns True if deleted."""
    client = get_chroma()
    try:
        client.delete_collection(collection_name(project_id))
        return True
    except Exception:
        return False
