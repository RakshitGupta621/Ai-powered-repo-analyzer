"""Ingestion router."""

import logging
import traceback
from fastapi import APIRouter, HTTPException, Request

from models.schemas import IngestRequest, IngestResponse, DeleteProjectResponse
from services.vector_service import store_chunks, remove_project
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


@router.post("", response_model=IngestResponse)
async def ingest_chunks(request: Request, body: IngestRequest):
    _check_key(request)
    try:
        stored = await store_chunks(body.project_id, body.chunks)
        return IngestResponse(
            project_id=body.project_id,
            chunks_stored=stored,
            message=f"Successfully stored {stored} chunks",
        )
    except Exception as e:
        logger.error(f"Ingest failed project={body.project_id}: {e}\n{traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/{project_id}", response_model=DeleteProjectResponse)
async def delete_project_vectors(project_id: str, request: Request):
    _check_key(request)
    deleted = await remove_project(project_id)
    return DeleteProjectResponse(
        project_id=project_id,
        deleted=deleted,
        message="Vectors deleted" if deleted else "Collection not found",
    )
