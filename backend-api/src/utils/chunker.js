const { randomUUID } = require("crypto");
const path = require("path");

const MAX_CHUNK_TOKENS = parseInt(process.env.MAX_CHUNK_TOKENS || "400", 10);
const OVERLAP_LINES = 5;

const EXT_MAP = {
  ".js": "javascript", ".jsx": "javascript", ".ts": "typescript", ".tsx": "typescript",
  ".py": "python", ".java": "java", ".go": "go", ".rs": "rust",
  ".json": "json", ".yaml": "yaml", ".md": "markdown", ".sql": "sql",
};

const estimate = (text) => Math.max(1, Math.floor(text.length / 4));

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

function detectLanguage(filePath) {
  return EXT_MAP[path.extname(filePath).toLowerCase()] || "plaintext";
}
function chunkFile(content, filePath, projectId) {
  if (!content?.trim()) return [];

  const language = detectLanguage(filePath);
  const lines = content.split("\n");
  const chunks = [];
  let i = 0;

  while (i < lines.length) {
    const chunk = [];
    while (i < lines.length && estimate(chunk.concat(lines[i]).join(" ")) < MAX_CHUNK_TOKENS) {
      chunk.push(lines[i++]);
    }

    if (chunk.length) {
      chunks.push({
        chunk_id: `${projectId}_${filePath}_${i}_${randomUUID().slice(0, 8)}`,
        project_id: projectId,
        content: chunk.join("\n").trim(),
        file_path: filePath,
        language,
        start_line: i - chunk.length + 1,
        end_line: i,
      });
    }
  }

  return chunks.filter((c) => c.content.length > 0);
}

function chunkFiles(files, projectId) {
  const all = [];
  for (const { filePath, content } of files) {
    all.push(...chunkFile(content, filePath, projectId));
  }
  return all.filter((c) => c.content?.trim());
}

module.exports = { chunkFile, chunkFiles, detectLanguage };