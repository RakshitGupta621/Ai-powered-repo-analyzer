/**
 * Simple in-memory project store.
 *
 * For MVP / free tier: no external DB required.
 * Swap this module with a real DB adapter (SQLite, Supabase, PlanetScale)
 * by keeping the same interface — nothing else changes.
 *
 * Shape of a project:
 * {
 *   id: string,
 *   name: string,
 *   repoUrl?: string,
 *   status: "pending" | "ingesting" | "ready" | "failed",
 *   chunkCount: number,
 *   fileCount: number,
 *   fileTree: Array,
 *   errorMessage?: string,
 *   createdAt: string,
 *   updatedAt: string,
 * }
 */

const { randomUUID } = require('crypto');

/** @type {Map<string, Object>} */
const store = new Map();

/** @type {Map<string, Array>} */
const chatStore = new Map();   // projectId → [{role, content, timestamp}]

// ── Projects ──────────────────────────────────────────────────────────────────

function createProject({ name, repoUrl }) {
  const project = {
    id: randomUUID(),
    name: name.trim(),
    repoUrl: repoUrl || null,
    status: "pending",
    chunkCount: 0,
    fileCount: 0,
    fileTree: [],
    errorMessage: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  store.set(project.id, project);
  return project;
}

function getProject(id) {
  return store.get(id) || null;
}

function listProjects() {
  return [...store.values()].sort(
    (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
  );
}

function updateProject(id, fields) {
  const project = store.get(id);
  if (!project) return null;
  const updated = { ...project, ...fields, updatedAt: new Date().toISOString() };
  store.set(id, updated);
  return updated;
}

function deleteProject(id) {
  const existed = store.has(id);
  store.delete(id);
  chatStore.delete(id);
  return existed;
}

// ── Chat history ──────────────────────────────────────────────────────────────

function addChatMessage(projectId, role, content) {
  if (!chatStore.has(projectId)) chatStore.set(projectId, []);
  const messages = chatStore.get(projectId);
  messages.push({ role, content, timestamp: new Date().toISOString() });
  // Keep last 50 messages per project
  if (messages.length > 50) messages.splice(0, messages.length - 50);
  return messages;
}

function getChatHistory(projectId, limit = 20) {
  const messages = chatStore.get(projectId) || [];
  return messages.slice(-limit);
}

function clearChatHistory(projectId) {
  chatStore.delete(projectId);
}

module.exports = {
  createProject,
  getProject,
  listProjects,
  updateProject,
  deleteProject,
  addChatMessage,
  getChatHistory,
  clearChatHistory,
};
