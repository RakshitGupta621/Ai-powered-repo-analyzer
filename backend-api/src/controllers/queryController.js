const queryService = require("../services/queryService");
const { success, error } = require("../utils/response");

const queryCodebase = async (req, res, next) => {
  try {
    const { projectId, question, topK } = req.body;
    const result = await queryService.queryProject(projectId, question, topK || null);
    return success(res, result);
  } catch (err) {
    if (err.status) return error(res, err.message, err.status);
    next(err);
  }
};

module.exports = { queryCodebase };