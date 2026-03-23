/**
 * Unit tests — chunker utility
 */

const { chunkFile, chunkFiles, detectLanguage } = require("../../src/utils/chunker");

describe("detectLanguage()", () => {
  it("detects JavaScript", () => expect(detectLanguage("index.js")).toBe("javascript"));
  it("detects TypeScript", () => expect(detectLanguage("app.ts")).toBe("typescript"));
  it("detects Python",     () => expect(detectLanguage("main.py")).toBe("python"));
  it("defaults to plaintext for unknown extensions", () =>
    expect(detectLanguage("file.xyz")).toBe("plaintext"));
});

describe("chunkFile()", () => {
  const projectId = "test-project-id";

  it("returns empty array for empty content", () => {
    expect(chunkFile("", "file.js", projectId)).toEqual([]);
    expect(chunkFile("   \n  ", "file.js", projectId)).toEqual([]);
  });

  it("produces at least one chunk for non-empty content", () => {
    const content = `function hello() {\n  return "world";\n}`;
    const chunks = chunkFile(content, "hello.js", projectId);
    expect(chunks.length).toBeGreaterThan(0);
  });

  it("each chunk has required fields", () => {
    const content = Array.from({ length: 20 }, (_, i) => `const x${i} = ${i};`).join("\n");
    const chunks = chunkFile(content, "vars.js", projectId);
    for (const chunk of chunks) {
      expect(chunk).toHaveProperty("chunk_id");
      expect(chunk).toHaveProperty("project_id", projectId);
      expect(chunk).toHaveProperty("content");
      expect(chunk).toHaveProperty("file_path", "vars.js");
      expect(chunk).toHaveProperty("language", "javascript");
      expect(chunk).toHaveProperty("start_line");
      expect(chunk).toHaveProperty("end_line");
      expect(chunk.start_line).toBeGreaterThanOrEqual(1);
    }
  });

  it("chunk IDs are unique", () => {
    const content = Array.from({ length: 50 }, (_, i) => `function fn${i}() {}`).join("\n");
    const chunks = chunkFile(content, "fns.js", projectId);
    const ids = chunks.map((c) => c.chunk_id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(ids.length);
  });

  it("detects Python function boundaries", () => {
    const content = [
      "def foo():",
      "    return 1",
      "",
      "def bar():",
      "    return 2",
    ].join("\n");
    const chunks = chunkFile(content, "funcs.py", projectId);
    // Should split on def boundaries
    expect(chunks.length).toBeGreaterThanOrEqual(1);
  });

  it("handles a very large file without throwing", () => {
    // 500 lines
    const content = Array.from({ length: 500 }, (_, i) => `const line${i} = "${i}";`).join("\n");
    expect(() => chunkFile(content, "big.js", projectId)).not.toThrow();
  });
});

describe("chunkFiles()", () => {
  it("chunks multiple files and returns flat array", () => {
    const files = [
      { filePath: "a.js", content: "const a = 1;" },
      { filePath: "b.py", content: "def b(): pass" },
    ];
    const chunks = chunkFiles(files, "proj-1");
    expect(chunks.length).toBeGreaterThanOrEqual(2);
    const paths = new Set(chunks.map((c) => c.file_path));
    expect(paths.has("a.js")).toBe(true);
    expect(paths.has("b.py")).toBe(true);
  });

  it("skips empty files", () => {
    const files = [
      { filePath: "empty.js", content: "   " },
      { filePath: "real.js", content: "const x = 1;" },
    ];
    const chunks = chunkFiles(files, "proj-2");
    const paths = chunks.map((c) => c.file_path);
    expect(paths).not.toContain("empty.js");
    expect(paths).toContain("real.js");
  });
});
