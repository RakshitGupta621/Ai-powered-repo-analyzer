"""
Embedding service — provider-agnostic, fully free.
Priority: Ollama → HuggingFace → Gemini
"""

import asyncio
import logging
import httpx
from config import settings

logger = logging.getLogger(__name__)

HF_API_URL = "https://api-inference.huggingface.co/pipeline/feature-extraction/sentence-transformers/all-MiniLM-L6-v2"
GEMINI_URL = "https://generativelanguage.googleapis.com/v1/models"
GEMINI_MODELS = ["text-embedding-004", "embedding-001"]

_provider = None
_gemini_model = None


async def _detect_provider() -> str:
    """Auto-detect embedding provider with fallback chain."""
    global _provider
    if _provider:
        return _provider

    forced = settings.EMBEDDING_PROVIDER.lower().strip()
    if forced in ("ollama", "huggingface", "gemini"):
        _provider = forced
        logger.info(f"Provider forced: {forced}")
        return _provider

    # Try each provider in priority order
    for check_fn, name in [
        (_check_ollama, "ollama"),
        (_check_huggingface, "huggingface"),
        (_check_gemini, "gemini"),
    ]:
        if await check_fn():
            _provider = name
            logger.info(f"✅ Provider resolved: {name}")
            return _provider

    raise RuntimeError("No embedding provider available. Install Ollama: ollama.com")


async def _check_ollama() -> bool:
    try:
        async with httpx.AsyncClient(timeout=3.0) as c:
            r = await c.get(f"{settings.OLLAMA_URL}/api/tags")
        models = [m["name"] for m in r.json().get("models", [])]
        
        if any(settings.OLLAMA_MODEL in m for m in models):
            logger.info(f"Ollama ready: {settings.OLLAMA_MODEL}")
            return True
        
        # Auto-pull missing model
        logger.info(f"Pulling {settings.OLLAMA_MODEL}...")
        async with httpx.AsyncClient(timeout=300) as c:
            r = await c.post(
                f"{settings.OLLAMA_URL}/api/pull",
                json={"name": settings.OLLAMA_MODEL, "stream": False}
            )
        return r.status_code == 200
    except Exception:
        return False


async def _check_huggingface() -> bool:
    try:
        headers = {"Authorization": f"Bearer {settings.HF_TOKEN}"} if settings.HF_TOKEN else {}
        async with httpx.AsyncClient(timeout=10) as c:
            r = await c.post(HF_API_URL, json={"inputs": "test"}, headers=headers)
        logger.info("HuggingFace available")
        return r.status_code == 200
    except Exception:
        return False


async def _check_gemini() -> bool:
    global _gemini_model
    if not settings.GEMINI_API_KEY:
        return False
    for model in GEMINI_MODELS:
        try:
            r = await httpx.AsyncClient(timeout=10).post(
                f"{GEMINI_URL}/{model}:embedContent",
                json={
                    "model": f"models/{model}",
                    "content": {"parts": [{"text": "test"}]},
                    "taskType": "RETRIEVAL_DOCUMENT",
                },
                params={"key": settings.GEMINI_API_KEY},
            )
            if r.status_code == 200:
                _gemini_model = model
                logger.info(f"Gemini available: {model}")
                return True
        except Exception:
            pass
    return False




async def _ollama_embed(texts: list[str]) -> list[list[float]]:
    """Get embeddings from local Ollama."""
    async with httpx.AsyncClient(timeout=60) as c:
        results = []
        for text in texts:
            if not text or not text.strip():
                results.append([])
                continue
            r = await c.post(
                f"{settings.OLLAMA_URL}/api/embeddings",
                json={"model": settings.OLLAMA_MODEL, "prompt": text.strip()}
            )
            if r.status_code != 200:
                raise RuntimeError(f"Ollama error: {r.text[:100]}")
            results.append(r.json().get("embedding", []))
        return results


async def _hf_embed(texts: list[str]) -> list[list[float]]:
    """Get embeddings from HuggingFace API."""
    headers = {"Authorization": f"Bearer {settings.HF_TOKEN}"} if settings.HF_TOKEN else {}
    results = []
    
    for i in range(0, len(texts), 32):  # Batch size
        batch = texts[i:i+32]
        for attempt in range(3):
            try:
                async with httpx.AsyncClient(timeout=30) as c:
                    r = await c.post(HF_API_URL, json={"inputs": batch}, headers=headers)
                
                if r.status_code == 503:  # Model loading
                    wait = min(int(r.json().get("estimated_time", 20)), 30)
                    logger.info(f"HF loading, waiting {wait}s...")
                    await asyncio.sleep(wait)
                    continue
                
                if r.status_code != 200:
                    raise RuntimeError(f"HF error: {r.text[:100]}")
                
                data = r.json()
                if isinstance(data[0], float):  # Single embedding returned
                    data = [data]
                results.extend(data)
                break
            except Exception as e:
                if attempt == 2:
                    raise
                await asyncio.sleep(2 ** attempt)
    
    return results


async def _gemini_embed(texts: list[str], task_type: str) -> list[list[float]]:
    """Get embeddings from Gemini API."""
    model = _gemini_model or GEMINI_MODELS[0]
    url = f"{GEMINI_URL}/{model}:embedContent"
    results = []
    
    for text in texts:
        r = await httpx.AsyncClient(timeout=30).post(
            url,
            json={
                "model": f"models/{model}",
                "content": {"parts": [{"text": text}]},
                "taskType": task_type,
            },
            params={"key": settings.GEMINI_API_KEY}
        )
        if r.status_code != 200:
            raise RuntimeError(f"Gemini error: {r.text[:100]}")
        
        results.append(r.json()["embedding"]["values"])
        await asyncio.sleep(0.3)  # Rate limiting
    
    return results


async def get_embeddings(texts: list[str]) -> list[list[float]]:
    """Get embeddings using detected provider."""
    provider = await _detect_provider()
    
    if provider == "ollama":
        return await _ollama_embed(texts)
    elif provider == "huggingface":
        return await _hf_embed(texts)
    else:
        return await _gemini_embed(texts, "RETRIEVAL_DOCUMENT")


async def get_query_embedding(text: str) -> list[float]:
    """Get embedding for a search query."""
    provider = await _detect_provider()
    
    if provider == "ollama":
        return (await _ollama_embed([text]))[0]
    elif provider == "huggingface":
        return (await _hf_embed([text]))[0]
    else:
        return (await _gemini_embed([text], "RETRIEVAL_QUERY"))[0]
