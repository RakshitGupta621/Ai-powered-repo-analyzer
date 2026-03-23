/**
 * Chat controller — returns and manages chat history for a project.
 */

const store = require("../utils/store");
const { success, notFound } = require("../utils/response");

function getChatHistory(req, res) {
  const project = store.getProject(req.params.projectId);
  if (!project) return notFound(res, "Project");

  const limit = parseInt(req.query.limit || "20", 10);
  const messages = store.getChatHistory(req.params.projectId, limit);
  return success(res, { messages, projectId: req.params.projectId });
}

function clearChatHistory(req, res) {
  const project = store.getProject(req.params.projectId);
  if (!project) return notFound(res, "Project");
  store.clearChatHistory(req.params.projectId);
  return success(res, null, "Chat history cleared");
}

module.exports = { getChatHistory, clearChatHistory };
