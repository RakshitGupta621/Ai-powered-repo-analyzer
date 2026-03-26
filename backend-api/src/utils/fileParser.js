/**
 * File parsing utility.
 * Extracts and reads source files from uploaded ZIP archives or directories.
 * Returns a flat list of {filePath, content} objects ready for chunking.
 */

const fs = require("fs");
const path = require("path");
const AdmZip = require("adm-zip");
const { glob } = require("glob");
const logger = require("./logger");

const ALLOWED_EXTENSIONS = new Set([
  ".js", ".ts", ".jsx", ".tsx", ".mjs", ".cjs",
  ".py", ".java", ".go", ".rs", ".cpp", ".c", ".cs",
  ".rb", ".php", ".swift", ".kt", ".scala",
  ".json", ".yaml", ".yml", ".toml", ".env.example",
  ".md", ".mdx", ".txt", ".sql", ".sh", ".bash", ".graphql",
]);

const IGNORED_DIRS = new Set([
  "node_modules", ".git", "__pycache__", ".venv", "venv",
  "dist", "build", ".next", "out", "coverage", ".pytest_cache",
]);

const MAX_FILE_SIZE_BYTES = 200 * 1024; // 200 KB per file

/**
 * Extract files from a ZIP buffer and return parsed file list.
 * @param {Buffer} buffer - ZIP file content
 * @returns {Array<{filePath: string, content: string}>}
 */
function extractZip(buffer) {
  const zip = new AdmZip(buffer);
  const entries = zip.getEntries();
  const files = [];

  for (const entry of entries) {
    if (entry.isDirectory) continue;

    const filePath = normalizePath(entry.entryName);
    if (shouldSkip(filePath)) continue;
    if (entry.header.size > MAX_FILE_SIZE_BYTES) {
      logger.debug(`Skipping large file: ${filePath} (${entry.header.size} bytes)`);
      continue;
    }

    try {
      const content = entry.getData().toString("utf-8");
      if (content.trim()) {
        files.push({ filePath, content });
      }
    } catch {
      logger.debug(`Skipping binary file: ${filePath}`);
    }
  }

  logger.info(`Extracted ${files.length} files from ZIP`);
  return files;
}

/**
 * Read files from a local directory path.
 * @param {string} dirPath - Absolute path to directory
 * @returns {Promise<Array<{filePath: string, content: string}>>}
 */
async function readDirectory(dirPath) {
  const pattern = path.join(dirPath, "**/*");
  const allPaths = await glob(pattern, {
    nodir: true,
    dot: false,
    ignore: IGNORED_DIRS,
  });

  const files = [];

  for (const absPath of allPaths) {
    const relPath = normalizePath(path.relative(dirPath, absPath));
    if (shouldSkip(relPath)) continue;

    const stat = fs.statSync(absPath);
    if (stat.size > MAX_FILE_SIZE_BYTES) continue;

    try {
      const content = fs.readFileSync(absPath, "utf-8");
      if (content.trim()) {
        files.push({ filePath: relPath, content });
      }
    } catch {
      // Binary file — skip
    }
  }

  logger.info(`Read ${files.length} files from directory: ${dirPath}`);
  return files;
}

function buildFileTree(files) {
  const root = { children: {} };

  for (const { filePath } of files) {
    const parts = filePath.split("/");
    let node = root.children;

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      const isLast = i === parts.length - 1;

      if (!node[part]) {
        node[part] = isLast
          ? { name: part, type: "file", path: filePath }
          : { name: part, type: "dir", children: {} };
      }

      if (!isLast) node = node[part].children;
    }
  }

  return Object.values(root.children).map(serialize);
}

function serialize(node) {
  if (node.type === "file") return node;
  return { ...node, children: node.children ? Object.values(node.children).map(serialize) : [] };
}

function shouldSkip(filePath) {
  const parts = filePath.split("/");
  const filename = parts[parts.length - 1];
  const ext = path.extname(filename).toLowerCase();

  return (
    parts.slice(0, -1).some((p) => IGNORED_DIRS.has(p)) ||
    (ext && !ALLOWED_EXTENSIONS.has(ext)) ||
    /^(package-lock\.json|yarn\.lock|pnpm-lock\.yaml)$|\.lock$|\.min\./.test(filename)
  );
}

function normalizePath(p) {
  return p.replace(/\\/g, "/").replace(/^\/+/, "");
}

module.exports = { extractZip, readDirectory, buildFileTree, shouldSkip };
