/**
 * Query controller — handles natural language queries against a project.
 */

const queryService = require("../services/queryService");
const { success, error } = require("../utils/response");

async function queryCodebase(req, res, next) {
  try {
    const { projectId, question, topK } = req.body;
    // Pass null/undefined topK as null so the service uses its default
    const result = await queryService.queryProject(projectId, question, topK || null);
    return success(res, result);
  } catch (err) {
    if (err.status) return error(res, err.message, err.status);
    next(err);
  }
}

module.exports = { queryCodebase };