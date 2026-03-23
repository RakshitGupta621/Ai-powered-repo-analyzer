/**
 * Ingestion service.
 * Validates project state and enqueues the ingestion job.
 */

const { enqueueIngestion, getJobStatus } = require("../jobs/ingestionQueue");
const store = require("../utils/store");
const logger = require("../utils/logger");

/**
 * Start ingestion for a project from an uploaded ZIP.
 * The queue module reads the file into memory immediately, so the temp file
 * is deleted before this function returns.
 *
 * @param {string} projectId
 * @param {string} zipPath - temp file path from multer
 * @param {string} originalName
 */
async function startIngestion(projectId, zipPath, originalName) {
  const project = store.getProject(projectId);
  if (!project) throw Object.assign(new Error("Project not found"), { status: 404 });

  if (project.status === "ingesting") {
    throw Object.assign(new Error("Ingestion already in progress"), { status: 409 });
  }

  store.updateProject(projectId, { status: "pending" });
  const jobId = await enqueueIngestion(projectId, zipPath, originalName);

  logger.info("Ingestion started", { projectId, jobId });
  return { jobId, projectId };
}

async function fetchJobStatus(jobId) {
  const status = await getJobStatus(jobId);
  if (!status) throw Object.assign(new Error("Job not found"), { status: 404 });
  return status;
}

module.exports = { startIngestion, fetchJobStatus };
