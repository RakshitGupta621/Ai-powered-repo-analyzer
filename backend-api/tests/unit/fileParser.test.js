/**
 * Unit tests — fileParser utility
 */

const { shouldSkip, buildFileTree } = require("../../src/utils/fileParser");

describe("shouldSkip()", () => {
  // Should skip
  it("skips node_modules paths", () =>
    expect(shouldSkip("node_modules/lodash/index.js")).toBe(true));
  it("skips .git paths", () =>
    expect(shouldSkip(".git/config")).toBe(true));
  it("skips __pycache__", () =>
    expect(shouldSkip("src/__pycache__/module.pyc")).toBe(true));
  it("skips .next build dir", () =>
    expect(shouldSkip(".next/server/app.js")).toBe(true));
  it("skips lock files", () =>
    expect(shouldSkip("package-lock.json")).toBe(true));
  it("skips minified JS", () =>
    expect(shouldSkip("dist/bundle.min.js")).toBe(true));
  it("skips .pyc files", () =>
    expect(shouldSkip("app.pyc")).toBe(true));

  // Should NOT skip
  it("allows .js source files", () =>
    expect(shouldSkip("src/index.js")).toBe(false));
  it("allows .ts files", () =>
    expect(shouldSkip("src/app.ts")).toBe(false));
  it("allows .py files", () =>
    expect(shouldSkip("main.py")).toBe(false));
  it("allows markdown", () =>
    expect(shouldSkip("README.md")).toBe(false));
  it("allows nested source files", () =>
    expect(shouldSkip("src/utils/helpers.js")).toBe(false));
});

describe("buildFileTree()", () => {
  it("returns empty array for empty input", () => {
    expect(buildFileTree([])).toEqual([]);
  });

  it("builds a flat single-level tree", () => {
    const files = [
      { filePath: "index.js" },
      { filePath: "app.ts" },
    ];
    const tree = buildFileTree(files);
    expect(tree.length).toBe(2);
    expect(tree.every((n) => n.type === "file")).toBe(true);
  });

  it("builds nested directory structure", () => {
    const files = [
      { filePath: "src/index.js" },
      { filePath: "src/utils/helpers.js" },
      { filePath: "README.md" },
    ];
    const tree = buildFileTree(files);

    // README at root
    const readme = tree.find((n) => n.name === "README.md");
    expect(readme).toBeDefined();
    expect(readme.type).toBe("file");

    // src dir
    const src = tree.find((n) => n.name === "src");
    expect(src).toBeDefined();
    expect(src.type).toBe("dir");
    expect(Array.isArray(src.children)).toBe(true);
  });

  it("handles deeply nested paths", () => {
    const files = [{ filePath: "a/b/c/d/deep.py" }];
    const tree = buildFileTree(files);
    expect(tree[0].type).toBe("dir");
    expect(tree[0].name).toBe("a");
  });
});
