/**
 * Integration tests — Projects API
 * Uses supertest against the real Express app (no external services mocked).
 * Redis and AI service are mocked at the module level.
 */

jest.mock("../../src/utils/redis", () => ({
  getRedis: jest.fn(() => ({
    connect: jest.fn().mockResolvedValue(true),
    get: jest.fn().mockResolvedValue(null),
    setex: jest.fn().mockResolvedValue("OK"),
    keys: jest.fn().mockResolvedValue([]),
    del: jest.fn().mockResolvedValue(0),
    on: jest.fn(),
  })),
  cacheGet: jest.fn().mockResolvedValue(null),
  cacheSet: jest.fn().mockResolvedValue(undefined),
  cacheDel: jest.fn().mockResolvedValue(undefined),
  closeRedis: jest.fn(),
}));

jest.mock("../../src/utils/aiClient", () => ({
  deleteProjectVectors: jest.fn().mockResolvedValue({ deleted: true }),
  queryCodebase: jest.fn().mockResolvedValue({
    answer: "Auth is handled in src/auth/middleware.js",
    retrieved_chunks: [
      {
        chunk_id: "chunk-1",
        file_path: "src/auth/middleware.js",
        content: "function authenticate(req, res, next) {}",
        score: 0.92,
        language: "javascript",
        start_line: 1,
        end_line: 5,
      },
    ],
    project_id: "test-uuid",
  }),
  checkAiHealth: jest.fn().mockResolvedValue({ status: "ok" }),
}));

jest.mock("../../src/jobs/ingestionQueue", () => ({
  startWorker: jest.fn(),
  stopWorker: jest.fn(),
  enqueueIngestion: jest.fn().mockResolvedValue("job-123"),
  getJobStatus: jest.fn().mockResolvedValue({
    jobId: "job-123",
    state: "completed",
    progress: 100,
  }),
}));

const request = require("supertest");
const createApp = require("../../src/app");

const app = createApp();

describe("GET /health", () => {
  it("returns 200 with ok status", async () => {
    const res = await request(app).get("/health");
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("ok");
  });
});

describe("Projects API", () => {
  let projectId;

  describe("POST /api/projects", () => {
    it("creates a project with valid data", async () => {
      const res = await request(app)
        .post("/api/projects")
        .send({ name: "My Test Repo" });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toMatchObject({
        name: "My Test Repo",
        status: "pending",
      });
      expect(res.body.data.id).toBeDefined();
      projectId = res.body.data.id;
    });

    it("rejects missing name", async () => {
      const res = await request(app)
        .post("/api/projects")
        .send({});
      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it("rejects name that is too short", async () => {
      const res = await request(app)
        .post("/api/projects")
        .send({ name: "X" });
      expect(res.status).toBe(400);
    });

    it("accepts optional repoUrl", async () => {
      const res = await request(app)
        .post("/api/projects")
        .send({ name: "With Repo", repoUrl: "https://github.com/user/repo" });
      expect(res.status).toBe(201);
      expect(res.body.data.repoUrl).toBe("https://github.com/user/repo");
    });
  });

  describe("GET /api/projects", () => {
    it("returns list of projects", async () => {
      const res = await request(app).get("/api/projects");
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
    });
  });

  describe("GET /api/projects/:projectId", () => {
    it("returns a specific project", async () => {
      const res = await request(app).get(`/api/projects/${projectId}`);
      expect(res.status).toBe(200);
      expect(res.body.data.id).toBe(projectId);
    });

    it("returns 404 for unknown ID", async () => {
      const fakeId = "00000000-0000-0000-0000-000000000000";
      const res = await request(app).get(`/api/projects/${fakeId}`);
      expect(res.status).toBe(404);
    });

    it("returns 400 for invalid UUID", async () => {
      const res = await request(app).get("/api/projects/not-a-uuid");
      expect(res.status).toBe(400);
    });
  });

  describe("DELETE /api/projects/:projectId", () => {
    it("deletes an existing project", async () => {
      const createRes = await request(app)
        .post("/api/projects")
        .send({ name: "To Delete" });
      const id = createRes.body.data.id;

      const deleteRes = await request(app).delete(`/api/projects/${id}`);
      expect(deleteRes.status).toBe(200);
      expect(deleteRes.body.success).toBe(true);

      // Confirm it's gone
      const getRes = await request(app).get(`/api/projects/${id}`);
      expect(getRes.status).toBe(404);
    });
  });
});

describe("Query API", () => {
  let readyProjectId;

  beforeAll(async () => {
    // Create and manually mark a project as ready
    const res = await request(app)
      .post("/api/projects")
      .send({ name: "Ready Project" });
    readyProjectId = res.body.data.id;

    // Manually update store status to "ready" for query tests
    const store = require("../../src/utils/store");
    store.updateProject(readyProjectId, { status: "ready" });
  });

  it("returns 400 for missing question", async () => {
    const res = await request(app)
      .post("/api/query")
      .send({ projectId: readyProjectId });
    expect(res.status).toBe(400);
  });

  it("returns 400 for invalid projectId", async () => {
    const res = await request(app)
      .post("/api/query")
      .send({ projectId: "bad-id", question: "Where is auth?" });
    expect(res.status).toBe(400);
  });

  it("successfully queries a ready project", async () => {
    const res = await request(app)
      .post("/api/query")
      .send({ projectId: readyProjectId, question: "Where is authentication handled?" });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.answer).toBeDefined();
    expect(Array.isArray(res.body.data.retrieved_chunks)).toBe(true);
  });

  it("rejects query on non-ready project", async () => {
    const createRes = await request(app)
      .post("/api/projects")
      .send({ name: "Pending Project" });
    const pendingId = createRes.body.data.id;

    const res = await request(app)
      .post("/api/query")
      .send({ projectId: pendingId, question: "Where is auth?" });
    expect(res.status).toBe(422);
  });
});

describe("Chat API", () => {
  let projectId;

  beforeAll(async () => {
    const res = await request(app)
      .post("/api/projects")
      .send({ name: "Chat Project" });
    projectId = res.body.data.id;
  });

  it("returns empty chat history for new project", async () => {
    const res = await request(app).get(`/api/chat/${projectId}`);
    expect(res.status).toBe(200);
    expect(res.body.data.messages).toEqual([]);
  });

  it("clears chat history", async () => {
    const res = await request(app).delete(`/api/chat/${projectId}`);
    expect(res.status).toBe(200);
  });
});
