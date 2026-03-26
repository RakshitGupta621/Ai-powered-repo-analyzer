const projectService = require("../services/projectService");
const { success, notFound } = require("../utils/response");

const createProject = async (req, res, next) => {
  try {
    const project = await projectService.createProject(req.body);
    return success(res, project, "Project created", 201);
  } catch (err) {
    next(err);
  }
};

const getProject = async (req, res, next) => {
  try {
    const project = projectService.getProject(req.params.projectId);
    return project ? success(res, project) : notFound(res, "Project");
  } catch (err) {
    next(err);
  }
};

const listProjects = async (req, res, next) => {
  try {
    return success(res, projectService.listProjects());
  } catch (err) {
    next(err);
  }
};

const deleteProject = async (req, res, next) => {
  try {
    const deleted = await projectService.deleteProject(req.params.projectId);
    return deleted ? success(res, null, "Project deleted") : notFound(res, "Project");
  } catch (err) {
    next(err);
  }
};

module.exports = { createProject, getProject, listProjects, deleteProject };
