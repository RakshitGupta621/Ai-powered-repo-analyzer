"""Query router."""

import logging
import traceback
from fastapi import APIRouter, HTTPException, Request

from models.schemas import QueryRequest, QueryResponse
from services.vector_service import search_similar
from services.gemini_service import generate_answer
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


@router.post("", response_model=QueryResponse)
async def query_codebase(request: Request, body: QueryRequest):
    _check_key(request)
    try:
        chunks = await search_similar(
            project_id=body.project_id,
            question=body.question,
            top_k=body.top_k,
        )
        if not chunks:
            return QueryResponse(
                answer="No relevant code found. Make sure the project has been ingested.",
                retrieved_chunks=[],
                project_id=body.project_id,
            )
        chunk_dicts = [c.model_dump() for c in chunks]
        answer = await generate_answer(
            question=body.question,
            code_chunks=chunk_dicts,
            chat_history=body.chat_history,
        )
        return QueryResponse(answer=answer, retrieved_chunks=chunks, project_id=body.project_id)
    except RuntimeError as e:
        logger.error(f"Query RuntimeError: {e}")
        raise HTTPException(status_code=503, detail=str(e))
    except Exception as e:
        logger.error(f"Query failed: {e}\n{traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=str(e))
