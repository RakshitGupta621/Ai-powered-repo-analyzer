"""Embed router — for testing embeddings directly."""

import logging
from fastapi import APIRouter, HTTPException, Request

from models.schemas import EmbedRequest, EmbedResponse
from services.embedding_service import get_embeddings, _detect_provider
from config import settings

logger = logging.getLogger(__name__)
router = APIRouter()


def _check_key(request: Request):
    key = (
        request.headers.get("x-internal-key")
        or request.headers.get("x_internal_key")
        or ""
    )
    if key != settings.INTERNAL_API_KEY:
        raise HTTPException(status_code=401, detail="Invalid internal API key")


@router.post("", response_model=EmbedResponse)
async def create_embeddings(request: Request, body: EmbedRequest):
    _check_key(request)
    if len(body.texts) > 100:
        raise HTTPException(status_code=400, detail="Max 100 texts per request")
    try:
        embeddings = await get_embeddings(body.texts)
        provider = await _detect_provider()
        return EmbedResponse(embeddings=embeddings, model=f"{provider}/{settings.OLLAMA_MODEL}")
    except Exception as e:
        logger.exception("Embedding failed")
        raise HTTPException(status_code=500, detail=str(e))
