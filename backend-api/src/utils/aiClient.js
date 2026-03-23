/**
 * HTTP client for the FastAPI AI service.
 * Logs full error details so the Node terminal always shows the real cause.
 */

const axios = require("axios");
const config = require("../config");
const logger = require("./logger");

const aiClient = axios.create({
  baseURL: config.aiServiceUrl,
  timeout: 120_000,
  headers: {
    "Content-Type": "application/json",
    "x-internal-key": config.internalApiKey,
  },
});

aiClient.interceptors.request.use((req) => {
  logger.debug("AI service request", { method: req.method?.toUpperCase(), url: req.url });
  return req;
});

aiClient.interceptors.response.use(
  (res) => res,
  (err) => {
    const status = err.response?.status;
    const data   = err.response?.data;
    let detail   = err.message;

    if (data) {
      if (typeof data.detail === "string" && data.detail) detail = data.detail;
      else if (typeof data.detail === "object") detail = JSON.stringify(data.detail);
    }

    logger.error("AI service error — FULL RESPONSE", {
      status,
      url: err.config?.url,
      detail,
      rawBody: JSON.stringify(data)?.slice(0, 600),
      requestHeaders: err.config?.headers,
    });

    const normalized = new Error(detail || "AI service error");
    normalized.status = status || 502;
    return Promise.reject(normalized);
  }
);

async function ingestChunks(projectId, chunks) {
  const { data } = await aiClient.post("/ingest", { project_id: projectId, chunks });
  return data;
}

async function queryCodebase(projectId, question, chatHistory = [], topK = null) {
  const { data } = await aiClient.post("/query", {
    project_id: projectId,
    question,
    chat_history: chatHistory,
    top_k: topK,
  });
  return data;
}

async function deleteProjectVectors(projectId) {
  const { data } = await aiClient.delete(`/ingest/${projectId}`);
  return data;
}

async function checkAiHealth() {
  const { data } = await aiClient.get("/health");
  return data;
}

module.exports = { ingestChunks, queryCodebase, deleteProjectVectors, checkAiHealth };
