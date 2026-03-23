"""Health + diagnostics router."""

import httpx
from fastapi import APIRouter
from utils.chroma_client import get_chroma
from config import settings

router = APIRouter()


@router.get("/health")
async def health():
    # ChromaDB
    chroma_ok = False
    try:
        get_chroma().heartbeat()
        chroma_ok = True
    except Exception:
        pass

    # Ollama
    ollama_ok = False
    try:
        async with httpx.AsyncClient(timeout=3.0) as c:
            r = await c.get(f"{settings.OLLAMA_URL}/api/tags")
        ollama_ok = r.status_code == 200
    except Exception:
        pass

    return {
        "status": "ok",
        "env": settings.ENV,
        "chroma": "ok" if chroma_ok else "error",
        "ollama": "ok" if ollama_ok else "not running",
        "embedding_provider": settings.EMBEDDING_PROVIDER or "auto",
        "llm_model": settings.GEMINI_LLM_MODEL,
        "api_key_set": bool(settings.GEMINI_API_KEY),
    }


@router.get("/debug/config")
async def debug_config():
    return {
        "env": settings.ENV,
        "embedding_provider": settings.EMBEDDING_PROVIDER or "auto",
        "ollama_url": settings.OLLAMA_URL,
        "ollama_model": settings.OLLAMA_MODEL,
        "llm_model": settings.GEMINI_LLM_MODEL,
        "chroma_path": settings.CHROMA_PATH,
        "api_key_prefix": settings.GEMINI_API_KEY[:8] + "..." if settings.GEMINI_API_KEY else "NOT SET",
    }
