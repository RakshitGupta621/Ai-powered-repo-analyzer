/**
 * Code chunking utility (Node.js side).
 * Splits file content into chunks before sending to AI service for embedding.
 * Mirrors logic from the Python utils/code_parser.py.
 */

const { randomUUID } = require('crypto');
const path = require("path");

const MAX_CHUNK_TOKENS = parseInt(process.env.MAX_CHUNK_TOKENS || "400", 10);
const OVERLAP_LINES = 5;

/**
 * Chunk a single file's content into segments.
 *
 * @param {string} content - File source code
 * @param {string} filePath - Relative path (used for metadata)
 * @param {string} projectId
 * @returns {Array<{chunk_id, project_id, content, file_path, language, start_line, end_line}>}
 */
function chunkFile(content, filePath, projectId) {
  if (!content?.trim()) return [];

  const language = detectLanguage(filePath);
  const lines = content.split("\n");
  const chunks = [];

  // Find logical block boundaries
  const boundaries = [0];
  for (let i = 1; i < lines.length; i++) {
    if (isBlockBoundary(lines[i], language)) {
      boundaries.push(i);
    }
  }
  boundaries.push(lines.length);

  let currentLines = [];
  let currentStart = 0;

  for (let b = 0; b < boundaries.length - 1; b++) {
    const blockStart = boundaries[b];
    const blockEnd = boundaries[b + 1];
    const blockLines = lines.slice(blockStart, blockEnd);
    const blockTokens = estimateTokens(blockLines.join(" "));

    if (
      blockTokens + estimateTokens(currentLines.join(" ")) > MAX_CHUNK_TOKENS &&
      currentLines.length > 0
    ) {
      // Flush buffer
      chunks.push(makeChunk(currentLines, currentStart, filePath, language, projectId));
      // Carry overlap
      currentLines = currentLines.slice(-OVERLAP_LINES);
      currentStart = Math.max(0, blockStart - currentLines.length);
    }

    if (blockTokens > MAX_CHUNK_TOKENS) {
      // Single oversized block — sliding window it
      const subChunks = slidingWindow(blockLines, blockStart, filePath, language, projectId);
      chunks.push(...subChunks);
      currentLines = [];
      currentStart = blockEnd;
    } else {
      if (currentLines.length === 0) currentStart = blockStart;
      currentLines.push(...blockLines);
    }
  }

  if (currentLines.length > 0) {
    chunks.push(makeChunk(currentLines, currentStart, filePath, language, projectId));
  }

  return chunks;
}

/**
 * Chunk multiple files.
 * @param {Array<{filePath: string, content: string}>} files
 * @param {string} projectId
 */
function chunkFiles(files, projectId) {
  const all = [];
  for (const { filePath, content } of files) {
    const chunks = chunkFile(content, filePath, projectId);
    all.push(...chunks);
  }
  // Final safety filter — never send empty content to the embedding model
  return all.filter((c) => c.content && c.content.trim().length > 0);
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeChunk(lines, startIdx, filePath, language, projectId) {
  return {
    chunk_id: `${projectId}_${filePath}_${startIdx}_${randomUUID().slice(0, 8)}`,
    project_id: projectId,
    content: lines.join("\n").trim(),   // trim so Ollama never sees blank content
    file_path: filePath,
    language,
    start_line: startIdx + 1,
    end_line: startIdx + lines.length,
  };
}

function slidingWindow(lines, offset, filePath, language, projectId) {
  const chunks = [];
  let i = 0;
  while (i < lines.length) {
    const window = [];
    let j = i;
    while (j < lines.length && estimateTokens(window.concat(lines[j]).join(" ")) < MAX_CHUNK_TOKENS) {
      window.push(lines[j]);
      j++;
    }
    if (window.length > 0) {
      chunks.push(makeChunk(window, offset + i, filePath, language, projectId));
    }
    const step = Math.max(1, window.length - OVERLAP_LINES);
    i += step;
  }
  return chunks;
}

function estimateTokens(text) {
  return Math.max(1, Math.floor(text.length / 4));
}

const BLOCK_PATTERNS = {
  python: [/^(async\s+)?def\s+\w+/, /^class\s+\w+/],
  javascript: [
    /^(export\s+)?(default\s+)?(async\s+)?function\s+\w+/,
    /^(export\s+)?(const|let|var)\s+\w+\s*=\s*(async\s+)?\(/,
    /^(export\s+)?class\s+\w+/,
  ],
  typescript: [
    /^(export\s+)?(default\s+)?(async\s+)?function\s+\w+/,
    /^(export\s+)?(const|let|var)\s+\w+\s*=\s*(async\s+)?\(/,
    /^(export\s+)?class\s+\w+/,
    /^(export\s+)?(interface|type)\s+\w+/,
  ],
  go: [/^func\s+/, /^type\s+\w+\s+struct/],
};

function isBlockBoundary(line, language) {
  const patterns = BLOCK_PATTERNS[language] || [];
  const trimmed = line.trim();
  return patterns.some((p) => p.test(trimmed));
}

const EXT_MAP = {
  ".js": "javascript", ".jsx": "javascript", ".mjs": "javascript",
  ".ts": "typescript", ".tsx": "typescript",
  ".py": "python", ".go": "go", ".rs": "rust",
  ".java": "java", ".cs": "csharp", ".rb": "ruby",
  ".php": "php", ".swift": "swift", ".kt": "kotlin",
  ".cpp": "cpp", ".c": "c", ".sh": "bash",
  ".md": "markdown", ".sql": "sql", ".json": "json",
  ".yaml": "yaml", ".yml": "yaml",
};

function detectLanguage(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  return EXT_MAP[ext] || "plaintext";
}

module.exports = { chunkFile, chunkFiles, detectLanguage };