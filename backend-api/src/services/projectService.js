const store = require("../utils/store");
const { deleteProjectVectors } = require("../utils/aiClient");
const logger = require("../utils/logger");

const createProject = async ({ name, repoUrl }) => {
  const project = store.createProject({ name, repoUrl });
  logger.info("Project created", { projectId: project.id, name });
  return project;
};

const getProject = (projectId) => store.getProject(projectId);

const listProjects = () => store.listProjects();

const deleteProject = async (projectId) => {
  const project = store.getProject(projectId);
  if (!project) return false;

  try {
    await deleteProjectVectors(projectId);
  } catch (err) {
    logger.warn("Could not delete vectors", { projectId });
  }

  store.deleteProject(projectId);
  logger.info("Project deleted", { projectId });
  return true;
};

module.exports = { createProject, getProject, listProjects, deleteProject };
