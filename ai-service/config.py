"""Central configuration loaded from environment variables."""

from functools import lru_cache
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    ENV: str = "development"
    AI_SERVICE_PORT: int = 8001
    INTERNAL_API_KEY: str = "change-me-internal-secret"

    # ── Gemini (used for LLM only — gemini-2.5-flash is free) ────────────────
    GEMINI_API_KEY: str = ""
    GEMINI_LLM_MODEL: str = "gemini-2.5-flash"
    GEMINI_EMBED_MODEL: str = "text-embedding-004"  # only if Gemini embeds work

    # ── Embedding provider ────────────────────────────────────────────────────
    # blank = auto-detect (Ollama → HuggingFace → Gemini)
    EMBEDDING_PROVIDER: str = ""

    # ── Ollama ────────────────────────────────────────────────────────────────
    OLLAMA_URL: str = "http://localhost:11434"
    OLLAMA_MODEL: str = "nomic-embed-text"

    # ── HuggingFace ───────────────────────────────────────────────────────────
    HF_TOKEN: str = ""

    # ── ChromaDB ──────────────────────────────────────────────────────────────
    CHROMA_PATH: str = "./chroma_data"
    CHROMA_COLLECTION_PREFIX: str = "project_"

    # ── Retrieval ─────────────────────────────────────────────────────────────
    TOP_K_RESULTS: int = 8
    MAX_CHUNK_TOKENS: int = 400
    CHUNK_OVERLAP_LINES: int = 5

    # ── Security ──────────────────────────────────────────────────────────────
    ALLOWED_ORIGINS: list[str] = ["http://localhost:3000", "http://localhost:3001"]
    TRUSTED_HOSTS: list[str] = ["localhost", "backend-api"]

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
