"""
Tests for the AI service — code parser and chunking utilities.
Run with: pytest tests/ -v
"""

import pytest
from utils.code_parser import (
    chunk_code,
    detect_language,
    should_skip,
    CodeChunk,
)


# ── detect_language ────────────────────────────────────────────────────────────

class TestDetectLanguage:
    def test_python(self):      assert detect_language("main.py") == "python"
    def test_typescript(self):  assert detect_language("app.ts") == "typescript"
    def test_javascript(self):  assert detect_language("index.js") == "javascript"
    def test_tsx(self):         assert detect_language("comp.tsx") == "typescript"
    def test_go(self):          assert detect_language("server.go") == "go"
    def test_rust(self):        assert detect_language("lib.rs") == "rust"
    def test_unknown(self):     assert detect_language("file.xyz") == "plaintext"
    def test_no_extension(self):assert detect_language("Makefile") == "plaintext"


# ── should_skip ────────────────────────────────────────────────────────────────

class TestShouldSkip:
    def test_node_modules(self):
        assert should_skip("node_modules/lodash/index.js") is True

    def test_pycache(self):
        assert should_skip("src/__pycache__/app.pyc") is True

    def test_git(self):
        assert should_skip(".git/config") is True

    def test_venv(self):
        assert should_skip("venv/lib/python.py") is True

    def test_dist(self):
        assert should_skip("dist/bundle.js") is True

    def test_minified(self):
        assert should_skip("static/app.min.js") is True

    def test_source_file_ok(self):
        assert should_skip("src/utils/helpers.py") is False

    def test_nested_source_ok(self):
        assert should_skip("backend/services/auth.ts") is False

    def test_readme_ok(self):
        assert should_skip("README.md") is False


# ── chunk_code ─────────────────────────────────────────────────────────────────

class TestChunkCode:
    def test_empty_content_returns_nothing(self):
        chunks = list(chunk_code("", "file.py"))
        assert chunks == []

    def test_whitespace_only_returns_nothing(self):
        chunks = list(chunk_code("   \n\n  ", "file.py"))
        assert chunks == []

    def test_single_function_produces_chunk(self):
        code = "def hello():\n    return 'world'\n"
        chunks = list(chunk_code(code, "hello.py"))
        assert len(chunks) >= 1
        assert all(isinstance(c, CodeChunk) for c in chunks)

    def test_chunk_fields_are_set(self):
        code = "def foo():\n    pass\n"
        chunks = list(chunk_code(code, "foo.py"))
        c = chunks[0]
        assert c.file_path == "foo.py"
        assert c.language == "python"
        assert c.content.strip() != ""
        assert c.start_line >= 1
        assert c.end_line >= c.start_line

    def test_multiple_python_functions_chunked(self):
        code = "\n".join([
            "def alpha():",
            "    return 1",
            "",
            "def beta():",
            "    return 2",
            "",
            "def gamma():",
            "    return 3",
        ])
        chunks = list(chunk_code(code, "funcs.py", max_tokens=50))
        # Small token budget forces splitting
        assert len(chunks) >= 1

    def test_large_file_does_not_raise(self):
        # 600 lines of code
        code = "\n".join([f"const x{i} = {i};" for i in range(600)])
        chunks = list(chunk_code(code, "big.js"))
        assert len(chunks) > 0

    def test_typescript_interface_boundary(self):
        code = "\n".join([
            "export interface User {",
            "  id: string;",
            "  name: string;",
            "}",
            "",
            "export interface Post {",
            "  id: string;",
            "  title: string;",
            "}",
        ])
        chunks = list(chunk_code(code, "types.ts", max_tokens=30))
        assert len(chunks) >= 1

    def test_chunk_content_covers_file(self):
        """All lines of the original file should appear in some chunk."""
        code = "\n".join([f"line_{i}" for i in range(40)])
        chunks = list(chunk_code(code, "lines.py"))
        all_content = "\n".join(c.content for c in chunks)
        for i in range(0, 40, 5):
            assert f"line_{i}" in all_content

    def test_go_function_boundary(self):
        code = "\n".join([
            "func Handler(w http.ResponseWriter, r *http.Request) {",
            '    w.Write([]byte("hello"))',
            "}",
            "",
            "func main() {",
            '    http.ListenAndServe(":8080", nil)',
            "}",
        ])
        chunks = list(chunk_code(code, "main.go"))
        assert len(chunks) >= 1
        assert chunks[0].language == "go"
