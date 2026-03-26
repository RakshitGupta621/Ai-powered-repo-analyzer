const crypto = require("crypto");
const { queryCodebase } = require("../utils/aiClient");
const { cacheGet, cacheSet } = require("../utils/redis");
const store = require("../utils/store");
const config = require("../config");
const logger = require("../utils/logger");

const buildCacheKey = (pid, q, k) => {
  const hash = crypto.createHash("sha256").update(`${pid}:${q}:${k || ""}`, "utf8").digest("hex").slice(0, 16);
  return `query:${hash}`;
};

async function queryProject(projectId, question, topK = null) {
  const project = store.getProject(projectId);
  if (!project) throw Object.assign(new Error("Project not found"), { status: 404 });
  if (project.status !== "ready") {
    throw Object.assign(
      new Error(`Project not ready (status: ${project.status})`),
      { status: 422 }
    );
  }

  const cacheKey = buildCacheKey(projectId, question, topK);
  const cached = await cacheGet(cacheKey);
  if (cached) {
    logger.debug("Cache hit", { projectId });
    return { ...cached, cached: true };
  }

  const chatHistory = store.getChatHistory(projectId, 6).map(({ role, content }) => ({ role, content }));
  const result = await queryCodebase(projectId, question, chatHistory, topK);

  store.addChatMessage(projectId, "user", question);
  store.addChatMessage(projectId, "assistant", result.answer);

  await cacheSet(cacheKey, result, config.queryCacheTtl);

  logger.info("Query completed", {
    projectId,
    chunks: result.retrieved_chunks?.length || 0,
  });

  return { ...result, cached: false };
}

module.exports = { queryProject };
