"""
AI Service — FastAPI
Handles: embeddings (Ollama/HuggingFace), vector search (ChromaDB), LLM (Gemini)
"""

import traceback
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware

from routers import embed, query, ingest, health
from utils.chroma_client import init_chroma
from config import settings

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_chroma()
    logger.info(f"ChromaDB initialized — path: {settings.CHROMA_PATH}")
    yield
    logger.info("AI service shutting down")


app = FastAPI(
    title="Codebase AI Service",
    version="1.0.0",
    lifespan=lifespan,
)


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    tb = traceback.format_exc()
    msg = str(exc) or type(exc).__name__
    logger.error(f"Unhandled exception on {request.method} {request.url.path}: {msg}\n{tb}")
    return JSONResponse(
        status_code=500,
        content={"detail": msg, "type": type(exc).__name__},
    )


app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_methods=["GET", "POST", "DELETE"],
    allow_headers=["*"],
)

app.include_router(health.router, tags=["Health"])
app.include_router(embed.router,  prefix="/embed",  tags=["Embeddings"])
app.include_router(ingest.router, prefix="/ingest", tags=["Ingestion"])
app.include_router(query.router,  prefix="/query",  tags=["Query"])
