const axios = require("axios");
const config = require("../config");
const logger = require("./logger");

const client = axios.create({
  baseURL: config.aiServiceUrl,
  timeout: 120_000,
  headers: {
    "Content-Type": "application/json",
    "x-internal-key": config.internalApiKey,
  },
});

client.interceptors.request.use((req) => {
  logger.debug("AI service request", { method: req.method?.toUpperCase(), url: req.url });
  return req;
});

client.interceptors.response.use(
  (res) => res,
  (err) => {
    const status = err.response?.status;
    const data = err.response?.data;
    const msg = data?.detail || err.message || "AI service error";

    logger.error("AI service error", {
      status,
      url: err.config?.url,
      message: msg,
      body: JSON.stringify(data)?.slice(0, 500),
    });

    const error = new Error(msg);
    error.status = status || 502;
    return Promise.reject(error);
  }
);

module.exports = {
  ingestChunks: async (projectId, chunks) => {
    const { data } = await client.post("/ingest", { project_id: projectId, chunks });
    return data;
  },
  queryCodebase: async (projectId, question, chatHistory = [], topK = null) => {
    const { data } = await client.post("/query", {
      project_id: projectId,
      question,
      chat_history: chatHistory,
      top_k: topK,
    });
    return data;
  },
  deleteProjectVectors: async (projectId) => {
    const { data } = await client.delete(`/ingest/${projectId}`);
    return data;
  },
  checkAiHealth: async () => {
    const { data } = await client.get("/health");
    return data;
  },
};
