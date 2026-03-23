"""
Vector store service — wraps ChromaDB operations.
Every external call is wrapped so errors surface clearly.
"""

import logging
import traceback
from typing import Any

from models.schemas import ChunkIn, RetrievedChunk
from config import settings

logger = logging.getLogger(__name__)


def _get_collection(project_id: str):
    """Get or create a ChromaDB collection. Lazy-import to catch errors."""
    try:
        from utils.chroma_client import get_or_create_collection
        return get_or_create_collection(project_id)
    except Exception as e:
        tb = traceback.format_exc()
        logger.error(f"ChromaDB collection error project={project_id}: {e}\n{tb}")
        raise RuntimeError(f"ChromaDB unavailable: {e}") from e


async def store_chunks(project_id: str, chunks: list[ChunkIn]) -> int:
    """Generate embeddings and upsert into ChromaDB."""
    try:
        from services.gemini_service import get_embeddings
    except Exception as e:
        raise RuntimeError(f"Cannot import gemini_service: {e}") from e

    # Filter out chunks with empty/whitespace-only content — Ollama returns
    # an empty vector for empty strings which ChromaDB rejects.
    valid_chunks = [c for c in chunks if c.content and c.content.strip()]
    skipped = len(chunks) - len(valid_chunks)
    if skipped > 0:
        logger.warning(f"Skipped {skipped} empty chunks project={project_id}")
    if not valid_chunks:
        logger.warning(f"No valid chunks to store project={project_id}")
        return 0

    texts = [c.content.strip() for c in valid_chunks]
    logger.info(f"Generating embeddings for {len(texts)} chunks project={project_id}")

    try:
        embeddings = await get_embeddings(texts)
    except Exception as e:
        tb = traceback.format_exc()
        logger.error(f"get_embeddings failed: {e}\n{tb}")
        raise RuntimeError(f"Embedding generation failed: {e}") from e

    # Validate every embedding is a non-empty list of floats
    valid_items = []
    for i, (chunk, emb, text) in enumerate(zip(valid_chunks, embeddings, texts)):
        if not emb or not isinstance(emb, list) or len(emb) == 0:
            logger.warning(f"Empty embedding at pos {i} for chunk {chunk.chunk_id} — skipping")
            continue
        valid_items.append((chunk, emb, text))

    if not valid_items:
        raise RuntimeError("All embeddings were empty — check Ollama is running correctly")

    final_chunks, final_embeddings, final_texts = zip(*valid_items)

    collection = _get_collection(project_id)

    ids       = [c.chunk_id for c in final_chunks]
    metadatas = [
        {
            "file_path":  c.file_path,
            "language":   c.language or "plaintext",
            "start_line": c.start_line or 0,
            "end_line":   c.end_line or 0,
            "project_id": project_id,
        }
        for c in final_chunks
    ]

    try:
        collection.upsert(
            ids=list(ids),
            embeddings=list(final_embeddings),
            documents=list(final_texts),
            metadatas=list(metadatas),
        )
    except Exception as e:
        tb = traceback.format_exc()
        logger.error(f"ChromaDB upsert failed: {e}\n{tb}")
        raise RuntimeError(f"ChromaDB upsert failed: {e}") from e

    logger.info(f"Stored {len(ids)} chunks project={project_id}")
    return len(ids)


async def search_similar(
    project_id: str,
    question: str,
    top_k: int | None = None,
) -> list[RetrievedChunk]:
    """Embed question, search ChromaDB, return ranked chunks."""
    try:
        from services.gemini_service import get_query_embedding
    except Exception as e:
        raise RuntimeError(f"Cannot import gemini_service: {e}") from e

    k = top_k or settings.TOP_K_RESULTS
    collection = _get_collection(project_id)

    count = collection.count()
    if count == 0:
        logger.warning(f"Collection empty project={project_id}")
        return []

    k = min(k, count)

    try:
        query_embedding = await get_query_embedding(question)
    except Exception as e:
        tb = traceback.format_exc()
        logger.error(f"get_query_embedding failed: {e}\n{tb}")
        raise RuntimeError(f"Query embedding failed: {e}") from e

    try:
        results = collection.query(
            query_embeddings=[query_embedding],
            n_results=k,
            include=["documents", "metadatas", "distances"],
        )
    except Exception as e:
        tb = traceback.format_exc()
        logger.error(f"ChromaDB query failed: {e}\n{tb}")
        raise RuntimeError(f"ChromaDB query failed: {e}") from e

    return _parse_results(results)


def _parse_results(results: dict[str, Any]) -> list[RetrievedChunk]:
    chunks: list[RetrievedChunk] = []
    ids       = results.get("ids",       [[]])[0]
    documents = results.get("documents", [[]])[0]
    metadatas = results.get("metadatas", [[]])[0]
    distances = results.get("distances", [[]])[0]

    for chunk_id, doc, meta, dist in zip(ids, documents, metadatas, distances):
        score = round(1 - dist, 4)
        chunks.append(RetrievedChunk(
            chunk_id=chunk_id,
            file_path=meta.get("file_path", "unknown"),
            content=doc,
            score=score,
            language=meta.get("language"),
            start_line=meta.get("start_line"),
            end_line=meta.get("end_line"),
        ))

    return sorted(chunks, key=lambda c: c.score, reverse=True)


async def remove_project(project_id: str) -> bool:
    try:
        from utils.chroma_client import delete_collection
        deleted = delete_collection(project_id)
        logger.info(f"Deleted collection project={project_id}: {deleted}")
        return deleted
    except Exception as e:
        logger.error(f"remove_project failed: {e}")
        return False


async def get_project_stats(project_id: str) -> dict[str, Any]:
    try:
        collection = _get_collection(project_id)
        return {"chunk_count": collection.count(), "project_id": project_id}
    except Exception:
        return {"chunk_count": 0, "project_id": project_id}
