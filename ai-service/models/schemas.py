"""Pydantic request / response models for the AI service."""

from pydantic import BaseModel, Field
from typing import Optional


# ── Ingestion ─────────────────────────────────────────────────────────────────

class ChunkIn(BaseModel):
    chunk_id: str
    project_id: str
    content: str
    file_path: str
    language: Optional[str] = None
    start_line: Optional[int] = None
    end_line: Optional[int] = None


class IngestRequest(BaseModel):
    project_id: str
    chunks: list[ChunkIn] = Field(..., min_length=1)


class IngestResponse(BaseModel):
    project_id: str
    chunks_stored: int
    message: str


# ── Query ──────────────────────────────────────────────────────────────────────

class QueryRequest(BaseModel):
    project_id: str
    question: str = Field(..., min_length=3, max_length=1000)
    top_k: Optional[int] = Field(default=None, ge=1, le=20)
    chat_history: Optional[list[dict]] = []   # [{role, content}, ...]


class RetrievedChunk(BaseModel):
    chunk_id: str
    file_path: str
    content: str
    score: float
    language: Optional[str] = None
    start_line: Optional[int] = None
    end_line: Optional[int] = None


class QueryResponse(BaseModel):
    answer: str
    retrieved_chunks: list[RetrievedChunk]
    project_id: str


# ── Embed ──────────────────────────────────────────────────────────────────────

class EmbedRequest(BaseModel):
    texts: list[str] = Field(..., min_length=1)


class EmbedResponse(BaseModel):
    embeddings: list[list[float]]
    model: str


# ── Delete ─────────────────────────────────────────────────────────────────────

class DeleteProjectResponse(BaseModel):
    project_id: str
    deleted: bool
    message: str
