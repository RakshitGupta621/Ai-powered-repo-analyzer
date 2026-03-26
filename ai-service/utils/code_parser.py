"""Code chunking utility — split files into manageable chunks."""

import re
from dataclasses import dataclass
from pathlib import Path
from typing import Iterator
from config import settings


@dataclass
class CodeChunk:
    content: str
    file_path: str
    start_line: int
    end_line: int
    language: str


EXTENSION_MAP = {
    ".py": "python", ".js": "javascript", ".ts": "typescript", ".jsx": "javascript",
    ".tsx": "typescript", ".java": "java", ".go": "go", ".rs": "rust", ".cpp": "cpp",
    ".c": "c", ".cs": "csharp", ".rb": "ruby", ".php": "php", ".swift": "swift",
    ".kt": "kotlin", ".md": "markdown", ".json": "json", ".yaml": "yaml", ".yml": "yaml",
    ".toml": "toml", ".env": "env", ".sh": "bash", ".sql": "sql",
}

IGNORED = {"node_modules", ".git", "__pycache__", ".venv", "venv", "dist", "build", 
           ".next", "coverage", ".pytest_cache"}


def detect_language(file_path: str) -> str:
    """Get language from file extension."""
    ext = Path(file_path).suffix.lower()
    return EXTENSION_MAP.get(ext, "plaintext")


def should_skip(file_path: str) -> bool:
    """Check if file should be skipped."""
    parts = Path(file_path).parts
    name = Path(file_path).name
    
    return any(p in IGNORED for p in parts) or any(
        name.endswith(p[1:]) for p in IGNORED if p.startswith("*")
    )


def _estimate_tokens(text: str) -> int:
    """Rough token estimate: ~4 chars = 1 token."""
    return max(1, len(text) // 4)


def chunk_code(
    content: str,
    file_path: str,
    max_tokens: int | None = None,
) -> Iterator[CodeChunk]:
    """Split file into chunks by token limit with line overlap."""
    if not content.strip():
        return
    
    max_tokens = max_tokens or settings.MAX_CHUNK_TOKENS
    overlap = settings.CHUNK_OVERLAP_LINES
    language = detect_language(file_path)
    lines = content.splitlines()
    
    i = 0
    while i < len(lines):
        # Collect lines until token limit
        chunk_lines = []
        start_idx = i
        
        while i < len(lines):
            if _estimate_tokens("\n".join(chunk_lines + [lines[i]])) >= max_tokens:
                break
            chunk_lines.append(lines[i])
            i += 1
        
        if not chunk_lines:  # Single line exceeds limit
            chunk_lines = [lines[i]]
            i += 1
        
        yield CodeChunk(
            content="\n".join(chunk_lines),
            file_path=file_path,
            start_line=start_idx + 1,
            end_line=start_idx + len(chunk_lines),
            language=language,
        )
        
        # Move back for overlap
        i = max(i - overlap, start_idx + 1)
