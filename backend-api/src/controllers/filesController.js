/**
 * Files controller — returns the file tree for a project.
 */

const store = require("../utils/store");
const { success, notFound } = require("../utils/response");

function getFileTree(req, res) {
  const project = store.getProject(req.params.projectId);
  if (!project) return notFound(res, "Project");
  return success(res, { fileTree: project.fileTree, fileCount: project.fileCount });
}

module.exports = { getFileTree };
