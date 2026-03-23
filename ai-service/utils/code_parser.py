"""
Code chunking utility.
Splits source files into semantically meaningful chunks
while preserving context (function/class boundaries where possible).
"""

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


# ── Language detection ────────────────────────────────────────────────────────

EXTENSION_MAP: dict[str, str] = {
    ".py": "python",
    ".js": "javascript",
    ".ts": "typescript",
    ".jsx": "javascript",
    ".tsx": "typescript",
    ".java": "java",
    ".go": "go",
    ".rs": "rust",
    ".cpp": "cpp",
    ".c": "c",
    ".cs": "csharp",
    ".rb": "ruby",
    ".php": "php",
    ".swift": "swift",
    ".kt": "kotlin",
    ".md": "markdown",
    ".json": "json",
    ".yaml": "yaml",
    ".yml": "yaml",
    ".toml": "toml",
    ".env": "env",
    ".sh": "bash",
    ".sql": "sql",
}

# Files/dirs to skip entirely
IGNORED_PATTERNS = {
    "node_modules", ".git", "__pycache__", ".venv", "venv",
    "dist", "build", ".next", "coverage", ".pytest_cache",
    "*.min.js", "*.min.css", "*.lock", "package-lock.json",
    "yarn.lock", "pnpm-lock.yaml", "*.pyc", "*.pyo",
}


def detect_language(file_path: str) -> str:
    ext = Path(file_path).suffix.lower()
    return EXTENSION_MAP.get(ext, "plaintext")


def should_skip(file_path: str) -> bool:
    parts = Path(file_path).parts
    name = Path(file_path).name
    for ignored in IGNORED_PATTERNS:
        if ignored in parts:
            return True
        if ignored.startswith("*") and name.endswith(ignored[1:]):
            return True
    return False


# ── Chunking ──────────────────────────────────────────────────────────────────

# Regex patterns to identify logical block boundaries per language
BLOCK_START_PATTERNS: dict[str, list[str]] = {
    "python": [
        r"^(async\s+)?def\s+\w+",
        r"^class\s+\w+",
    ],
    "javascript": [
        r"^(export\s+)?(default\s+)?(async\s+)?function\s+\w+",
        r"^(export\s+)?(const|let|var)\s+\w+\s*=\s*(async\s+)?\(",
        r"^(export\s+)?class\s+\w+",
    ],
    "typescript": [
        r"^(export\s+)?(default\s+)?(async\s+)?function\s+\w+",
        r"^(export\s+)?(const|let|var)\s+\w+\s*=\s*(async\s+)?\(",
        r"^(export\s+)?class\s+\w+",
        r"^(export\s+)?(interface|type)\s+\w+",
    ],
    "go": [
        r"^func\s+",
        r"^type\s+\w+\s+struct",
    ],
    "java": [
        r"^\s*(public|private|protected|static).*\{",
        r"^\s*class\s+\w+",
    ],
    "rust": [
        r"^(pub\s+)?(async\s+)?fn\s+\w+",
        r"^(pub\s+)?struct\s+\w+",
        r"^(pub\s+)?impl\s+",
    ],
}


def _is_block_boundary(line: str, language: str) -> bool:
    patterns = BLOCK_START_PATTERNS.get(language, [])
    stripped = line.strip()
    for pattern in patterns:
        if re.match(pattern, stripped):
            return True
    return False


def chunk_code(
    content: str,
    file_path: str,
    max_tokens: int | None = None,
) -> Iterator[CodeChunk]:
    """
    Split file content into chunks.

    Strategy:
    1. Try to split on logical block boundaries (functions/classes).
    2. If a block exceeds max_tokens, fall back to sliding-window line chunks.
    3. Always include overlap lines for context continuity.
    """
    if not content.strip():
        return

    max_tokens = max_tokens or settings.MAX_CHUNK_TOKENS
    overlap = settings.CHUNK_OVERLAP_LINES
    language = detect_language(file_path)
    lines = content.splitlines()

    # Find block boundary line indices
    boundaries: list[int] = [0]
    for i, line in enumerate(lines):
        if i > 0 and _is_block_boundary(line, language):
            boundaries.append(i)
    boundaries.append(len(lines))

    # Group boundaries into token-budget chunks
    current_start = 0
    current_lines: list[str] = []
    current_line_start = 0

    for b_idx in range(len(boundaries) - 1):
        block_start = boundaries[b_idx]
        block_end = boundaries[b_idx + 1]
        block_lines = lines[block_start:block_end]
        block_tokens = _estimate_tokens(" ".join(block_lines))

        if block_tokens + _estimate_tokens(" ".join(current_lines)) > max_tokens and current_lines:
            # Flush current buffer
            yield _make_chunk(current_lines, current_line_start, file_path, language)
            # Carry overlap lines into next chunk
            current_lines = current_lines[-overlap:] if overlap else []
            current_line_start = max(0, block_start - len(current_lines))

        # If a single block exceeds budget, slice it further
        if block_tokens > max_tokens:
            for sub_chunk in _sliding_window(block_lines, block_start, file_path, language, max_tokens, overlap):
                yield sub_chunk
            current_lines = []
            current_line_start = block_end
        else:
            if not current_lines:
                current_line_start = block_start
            current_lines.extend(block_lines)

    # Flush remaining
    if current_lines:
        yield _make_chunk(current_lines, current_line_start, file_path, language)


def _make_chunk(lines: list[str], start: int, file_path: str, language: str) -> CodeChunk:
    return CodeChunk(
        content="\n".join(lines),
        file_path=file_path,
        start_line=start + 1,       # 1-indexed
        end_line=start + len(lines),
        language=language,
    )


def _sliding_window(
    lines: list[str],
    offset: int,
    file_path: str,
    language: str,
    max_tokens: int,
    overlap: int,
) -> Iterator[CodeChunk]:
    i = 0
    while i < len(lines):
        window: list[str] = []
        j = i
        while j < len(lines) and _estimate_tokens(" ".join(window + [lines[j]])) < max_tokens:
            window.append(lines[j])
            j += 1
        if window:
            yield _make_chunk(window, offset + i, file_path, language)
        step = max(1, len(window) - overlap)
        i += step


def _estimate_tokens(text: str) -> int:
    """Rough token estimate: ~4 chars per token."""
    return max(1, len(text) // 4)
