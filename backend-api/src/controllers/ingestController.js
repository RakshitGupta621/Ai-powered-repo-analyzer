/**
 * Ingestion controller.
 */

const ingestionService = require("../services/ingestionService");
const { success, error, notFound, badRequest } = require("../utils/response");

async function startIngestion(req, res, next) {
  try {
    if (!req.file) return badRequest(res, "ZIP file is required");
    const { projectId } = req.body;
    const result = await ingestionService.startIngestion(
      projectId,
      req.file.path,
      req.file.originalname
    );
    return success(res, result, "Ingestion started", 202);
  } catch (err) {
    if (err.status) return error(res, err.message, err.status);
    next(err);
  }
}

async function getJobStatus(req, res, next) {
  try {
    const status = await ingestionService.fetchJobStatus(req.params.jobId);
    return success(res, status);
  } catch (err) {
    if (err.status) return error(res, err.message, err.status);
    next(err);
  }
}

module.exports = { startIngestion, getJobStatus };
