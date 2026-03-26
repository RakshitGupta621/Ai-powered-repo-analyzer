"""Vector store service — simplified ChromaDB wrapper."""

import logging
from typing import Any
from models.schemas import ChunkIn, RetrievedChunk
from config import settings

logger = logging.getLogger(__name__)


def _get_collection(project_id: str):
    """Get or create a ChromaDB collection."""
    try:
        from utils.chroma_client import get_or_create_collection
        return get_or_create_collection(project_id)
    except Exception as e:
        raise RuntimeError(f"ChromaDB error: {e}") from e


async def store_chunks(project_id: str, chunks: list[ChunkIn]) -> int:
    """Generate embeddings and store in ChromaDB."""
    from services.embedding_service import get_embeddings
    
    # Filter empty chunks
    valid_chunks = [c for c in chunks if c.content and c.content.strip()]
    if not valid_chunks:
        logger.warning(f"No valid chunks to store project={project_id}")
        return 0
    
    if len(valid_chunks) < len(chunks):
        logger.warning(f"Skipped {len(chunks) - len(valid_chunks)} empty chunks")
    
    texts = [c.content.strip() for c in valid_chunks]
    logger.info(f"Generating {len(texts)} embeddings...")
    
    embeddings = await get_embeddings(texts)
    
    # Filter out empty embeddings
    valid_items = [
        (c, e, t) for c, e, t in zip(valid_chunks, embeddings, texts)
        if e and isinstance(e, list) and len(e) > 0
    ]
    
    if not valid_items:
        raise RuntimeError("All embeddings empty — check Ollama running")
    
    chunks_data, embs, docs = zip(*valid_items)
    collection = _get_collection(project_id)
    
    collection.upsert(
        ids=[c.chunk_id for c in chunks_data],
        embeddings=list(embs),
        documents=list(docs),
        metadatas=[{
            "file_path": c.file_path,
            "language": c.language or "plaintext",
            "start_line": c.start_line or 0,
            "end_line": c.end_line or 0,
            "project_id": project_id,
        } for c in chunks_data],
    )
    
    logger.info(f"Stored {len(chunks_data)} chunks")
    return len(chunks_data)


async def search_similar(
    project_id: str,
    question: str,
    top_k: int | None = None,
) -> list[RetrievedChunk]:
    """Search for similar code chunks."""
    from services.embedding_service import get_query_embedding
    
    k = min(top_k or settings.TOP_K_RESULTS, 20)
    collection = _get_collection(project_id)
    
    count = collection.count()
    if count == 0:
        logger.warning(f"Empty collection for project={project_id}")
        return []
    
    k = min(k, count)
    query_emb = await get_query_embedding(question)
    
    results = collection.query(
        query_embeddings=[query_emb],
        n_results=k,
        include=["documents", "metadatas", "distances"]
    )
    
    return _parse_results(results)


def _parse_results(results: dict[str, Any]) -> list[RetrievedChunk]:
    """Convert ChromaDB results to RetrievedChunk objects."""
    ids = results.get("ids", [[]])[0]
    docs = results.get("documents", [[]])[0]
    metas = results.get("metadatas", [[]])[0]
    dists = results.get("distances", [[]])[0]
    
    chunks = [
        RetrievedChunk(
            chunk_id=cid,
            file_path=m.get("file_path", "unknown"),
            content=doc,
            score=round(1 - d, 4),
            language=m.get("language"),
            start_line=m.get("start_line"),
            end_line=m.get("end_line"),
        )
        for cid, doc, m, d in zip(ids, docs, metas, dists)
    ]
    
    return sorted(chunks, key=lambda c: c.score, reverse=True)


async def remove_project(project_id: str) -> bool:
    """Delete all vectors for a project."""
    try:
        from utils.chroma_client import delete_collection
        result = delete_collection(project_id)
        logger.info(f"Deleted project={project_id}: {result}")
        return result
    except Exception as e:
        logger.error(f"Delete failed: {e}")
        return False


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
