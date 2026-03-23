/**
 * Projects controller.
 * Thin layer — delegates everything to projectService.
 */

const projectService = require("../services/projectService");
const { success, error, notFound } = require("../utils/response");

async function createProject(req, res, next) {
  try {
    const project = await projectService.createProject(req.body);
    return success(res, project, "Project created", 201);
  } catch (err) {
    next(err);
  }
}

async function getProject(req, res, next) {
  try {
    const project = projectService.getProject(req.params.projectId);
    if (!project) return notFound(res, "Project");
    return success(res, project);
  } catch (err) {
    next(err);
  }
}

async function listProjects(req, res, next) {
  try {
    const projects = projectService.listProjects();
    return success(res, projects);
  } catch (err) {
    next(err);
  }
}

async function deleteProject(req, res, next) {
  try {
    const deleted = await projectService.deleteProject(req.params.projectId);
    if (!deleted) return notFound(res, "Project");
    return success(res, null, "Project deleted");
  } catch (err) {
    next(err);
  }
}

module.exports = { createProject, getProject, listProjects, deleteProject };
