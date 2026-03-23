"""
Embedding service — provider-agnostic, fully free.

Priority order (auto-detected at startup):
  1. Ollama      — local, no API key, best quality (nomic-embed-text)
  2. HuggingFace — free HTTP API, no install needed
  3. Gemini      — only if your key has embedContent access

Set EMBEDDING_PROVIDER=ollama|huggingface|gemini in .env to force one.
"""

import asyncio
import logging
import httpx
from typing import Any

from config import settings

logger = logging.getLogger(__name__)

HF_API_URL = (
    "https://api-inference.huggingface.co/pipeline/feature-extraction/"
    "sentence-transformers/all-MiniLM-L6-v2"
)
GEMINI_EMBED_URL  = "https://generativelanguage.googleapis.com/v1/models"
GEMINI_EMBED_MODELS = ["text-embedding-004", "embedding-001"]

_provider: str | None = None
_gemini_embed_model: str | None = None


# ── Provider detection ────────────────────────────────────────────────────────

async def _detect_provider() -> str:
    global _provider
    if _provider:
        return _provider

    forced = settings.EMBEDDING_PROVIDER.lower().strip()
    if forced in ("ollama", "huggingface", "gemini"):
        logger.info(f"Embedding provider forced via config: {forced}")
        _provider = forced
        return _provider

    if await _check_ollama():
        _provider = "ollama"
    elif await _check_huggingface():
        _provider = "huggingface"
    elif await _check_gemini():
        _provider = "gemini"
    else:
        raise RuntimeError(
            "No embedding provider available. "
            "Install Ollama (ollama.com) and run: ollama pull nomic-embed-text"
        )

    logger.info(f"✅ Embedding provider resolved: {_provider}")
    return _provider


async def _check_ollama() -> bool:
    try:
        async with httpx.AsyncClient(timeout=3.0) as c:
            r = await c.get(f"{settings.OLLAMA_URL}/api/tags")
        if r.status_code != 200:
            logger.debug("Ollama not reachable")
            return False

        models = [m["name"] for m in r.json().get("models", [])]
        model_name = settings.OLLAMA_MODEL

        if any(model_name in m for m in models):
            logger.info(f"Ollama ready with model: {model_name}")
            return True

        # Model not pulled yet — pull it automatically
        logger.info(f"Ollama running but {model_name} not found. Pulling now (this takes a minute)...")
        async with httpx.AsyncClient(timeout=300.0) as c:
            r = await c.post(
                f"{settings.OLLAMA_URL}/api/pull",
                json={"name": model_name, "stream": False},
            )
        if r.status_code == 200:
            logger.info(f"✅ Pulled {model_name} successfully")
            return True
        logger.warning(f"Failed to pull {model_name}: {r.text[:100]}")
        return False
    except Exception as e:
        logger.debug(f"Ollama check failed: {e}")
        return False


async def _check_huggingface() -> bool:
    try:
        headers = {"Authorization": f"Bearer {settings.HF_TOKEN}"} if settings.HF_TOKEN else {}
        async with httpx.AsyncClient(timeout=10.0) as c:
            r = await c.post(HF_API_URL, json={"inputs": "test"}, headers=headers)
        if r.status_code == 200:
            logger.info("HuggingFace embedding API reachable")
            return True
        logger.debug(f"HuggingFace returned {r.status_code}")
        return False
    except Exception as e:
        logger.debug(f"HuggingFace check failed: {e}")
        return False


async def _check_gemini() -> bool:
    global _gemini_embed_model
    if not settings.GEMINI_API_KEY:
        return False
    for model in GEMINI_EMBED_MODELS:
        try:
            url = f"{GEMINI_EMBED_URL}/{model}:embedContent"
            payload = {
                "model": f"models/{model}",
                "content": {"parts": [{"text": "test"}]},
                "taskType": "RETRIEVAL_DOCUMENT",
            }
            async with httpx.AsyncClient(timeout=10.0) as c:
                r = await c.post(url, json=payload, params={"key": settings.GEMINI_API_KEY})
            if r.status_code == 200:
                _gemini_embed_model = model
                logger.info(f"Gemini embed model available: {model}")
                return True
        except Exception:
            pass
    return False


# ── Ollama ────────────────────────────────────────────────────────────────────

async def _ollama_embed(texts: list[str]) -> list[list[float]]:
    results = []
    async with httpx.AsyncClient(timeout=60.0) as c:
        for text in texts:
            # Ollama returns empty vector for empty/whitespace strings
            safe_text = text.strip() if text else ""
            if not safe_text:
                logger.warning("Skipping empty text in Ollama embed")
                results.append([])
                continue
            r = await c.post(
                f"{settings.OLLAMA_URL}/api/embeddings",
                json={"model": settings.OLLAMA_MODEL, "prompt": safe_text},
            )
            if r.status_code != 200:
                raise RuntimeError(f"Ollama embed error {r.status_code}: {r.text[:200]}")
            emb = r.json().get("embedding", [])
            if not emb:
                logger.warning(f"Ollama returned empty embedding for text: {safe_text[:50]!r}")
            results.append(emb)
    return results


# ── HuggingFace ───────────────────────────────────────────────────────────────

async def _hf_embed(texts: list[str]) -> list[list[float]]:
    headers = {"Authorization": f"Bearer {settings.HF_TOKEN}"} if settings.HF_TOKEN else {}
    CHUNK = 32
    results = []
    for i in range(0, len(texts), CHUNK):
        batch = texts[i : i + CHUNK]
        for attempt in range(3):
            try:
                async with httpx.AsyncClient(timeout=30.0) as c:
                    r = await c.post(HF_API_URL, json={"inputs": batch}, headers=headers)
                if r.status_code == 503:
                    wait = min(int(r.json().get("estimated_time", 20)), 30)
                    logger.info(f"HF model loading, waiting {wait}s...")
                    await asyncio.sleep(wait)
                    continue
                if r.status_code != 200:
                    raise RuntimeError(f"HF embed error {r.status_code}: {r.text[:200]}")
                data = r.json()
                if isinstance(data[0], float):
                    data = [data]
                results.extend(data)
                break
            except RuntimeError:
                raise
            except Exception as e:
                if attempt == 2:
                    raise
                await asyncio.sleep(2 ** attempt)
    return results


# ── Gemini ────────────────────────────────────────────────────────────────────

async def _gemini_embed(texts: list[str], task_type: str) -> list[list[float]]:
    model = _gemini_embed_model or GEMINI_EMBED_MODELS[0]
    url = f"{GEMINI_EMBED_URL}/{model}:embedContent"
    results = []
    for text in texts:
        payload = {
            "model": f"models/{model}",
            "content": {"parts": [{"text": text}]},
            "taskType": task_type,
        }
        async with httpx.AsyncClient(timeout=30.0) as c:
            r = await c.post(url, json=payload, params={"key": settings.GEMINI_API_KEY})
        if r.status_code != 200:
            raise RuntimeError(f"Gemini embed error {r.status_code}: {r.text[:200]}")
        results.append(r.json()["embedding"]["values"])
        await asyncio.sleep(0.3)
    return results


# ── Public API ────────────────────────────────────────────────────────────────

async def get_embeddings(texts: list[str]) -> list[list[float]]:
    provider = await _detect_provider()
    if provider == "ollama":
        return await _ollama_embed(texts)
    elif provider == "huggingface":
        return await _hf_embed(texts)
    else:
        return await _gemini_embed(texts, "RETRIEVAL_DOCUMENT")


async def get_query_embedding(text: str) -> list[float]:
    provider = await _detect_provider()
    if provider == "ollama":
        result = await _ollama_embed([text])
        return result[0]
    elif provider == "huggingface":
        result = await _hf_embed([text])
        return result[0]
    else:
        result = await _gemini_embed([text], "RETRIEVAL_QUERY")
        return result[0]
