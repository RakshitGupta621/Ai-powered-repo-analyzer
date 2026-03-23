/**
 * Query service.
 * Handles semantic search + chat history + Redis caching.
 */

const crypto = require("crypto");
const { queryCodebase } = require("../utils/aiClient");
const { cacheGet, cacheSet } = require("../utils/redis");
const store = require("../utils/store");
const config = require("../config");
const logger = require("../utils/logger");

/**
 * Query the codebase and return an AI-generated answer.
 * Results are cached in Redis by (projectId + question hash).
 *
 * @param {string} projectId
 * @param {string} question
 * @param {number|null} topK
 */
async function queryProject(projectId, question, topK = null) {
  const project = store.getProject(projectId);
  if (!project) throw Object.assign(new Error("Project not found"), { status: 404 });
  if (project.status !== "ready") {
    throw Object.assign(
      new Error(`Project is not ready for querying (status: ${project.status})`),
      { status: 422 }
    );
  }

  // Build cache key
  const cacheKey = buildCacheKey(projectId, question, topK);
  const cached = await cacheGet(cacheKey);
  if (cached) {
    logger.debug("Query cache hit", { projectId });
    return { ...cached, cached: true };
  }

  // Fetch recent chat history for context
  const chatHistory = store.getChatHistory(projectId, 6).map(({ role, content }) => ({
    role,
    content,
  }));

  // Call AI service
  const result = await queryCodebase(projectId, question, chatHistory, topK);

  // Persist to chat history
  store.addChatMessage(projectId, "user", question);
  store.addChatMessage(projectId, "assistant", result.answer);

  // Cache result
  await cacheSet(cacheKey, result, config.queryCacheTtl);

  logger.info("Query completed", {
    projectId,
    chunksRetrieved: result.retrieved_chunks?.length,
  });

  return { ...result, cached: false };
}

function buildCacheKey(projectId, question, topK) {
  const hash = crypto
    .createHash("sha256")
    .update(`${projectId}:${question}:${topK || "default"}`)
    .digest("hex")
    .slice(0, 16);
  return `query:${hash}`;
}

module.exports = { queryProject };
