/**
 * Projects service.
 * All business logic for project CRUD — controllers stay thin.
 */

const store = require("../utils/store");
const { deleteProjectVectors } = require("../utils/aiClient");
const logger = require("../utils/logger");

async function createProject({ name, repoUrl }) {
  const project = store.createProject({ name, repoUrl });
  logger.info("Project created", { projectId: project.id, name });
  return project;
}

function getProject(projectId) {
  return store.getProject(projectId);
}

function listProjects() {
  return store.listProjects();
}

async function deleteProject(projectId) {
  const project = store.getProject(projectId);
  if (!project) return false;

  // Remove vectors from ChromaDB via AI service
  try {
    await deleteProjectVectors(projectId);
  } catch (err) {
    // Non-fatal: log but continue deletion
    logger.warn("Could not delete vectors, continuing", { projectId, err: err.message });
  }

  store.deleteProject(projectId);
  logger.info("Project deleted", { projectId });
  return true;
}

module.exports = { createProject, getProject, listProjects, deleteProject };
