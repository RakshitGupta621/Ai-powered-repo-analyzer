/**
 * Ingestion job queue using BullMQ.
 * ZIP is read into memory at enqueue time — no file path race conditions.
 */

const { Queue, Worker } = require("bullmq");
const { getBullMQConnection } = require("../utils/redis");
const { extractZip, buildFileTree } = require("../utils/fileParser");
const { chunkFiles } = require("../utils/chunker");
const { ingestChunks } = require("../utils/aiClient");
const { updateProject } = require("../utils/store");
const logger = require("../utils/logger");
const fs = require("fs");

const QUEUE_NAME = "ingestion";
const BATCH_SIZE = 50;

let _queue = null;
let _worker = null;

function getQueue() {
  if (!_queue) {
    _queue = new Queue(QUEUE_NAME, {
      connection: getBullMQConnection(),
      defaultJobOptions: {
        attempts: 2,
        backoff: { type: "fixed", delay: 3000 },
        removeOnComplete: { count: 100 },
        removeOnFail: { count: 50 },
      },
    });
  }
  return _queue;
}

async function enqueueIngestion(projectId, zipPath, originalName) {
  // Read file immediately — before BullMQ delay can cause ENOENT
  let zipBase64;
  try {
    const buffer = fs.readFileSync(zipPath);
    zipBase64 = buffer.toString("base64");
  } finally {
    try { fs.unlinkSync(zipPath); } catch { /* already gone */ }
  }

  const queue = getQueue();
  const job = await queue.add("ingest", { projectId, zipBase64, originalName });
  logger.info("Ingestion job enqueued", { jobId: job.id, projectId });
  return job.id;
}

async function getJobStatus(jobId) {
  const job = await getQueue().getJob(jobId);
  if (!job) return null;
  const state = await job.getState();
  return {
    jobId: job.id,
    state,
    progress: job.progress || 0,
    data: { projectId: job.data.projectId, originalName: job.data.originalName },
    failedReason: job.failedReason || null,
    processedOn: job.processedOn,
    finishedOn: job.finishedOn,
  };
}

function startWorker() {
  _worker = new Worker(
    QUEUE_NAME,
    async (job) => {
      const { projectId, zipBase64 } = job.data;
      logger.info("Processing ingestion job", { jobId: job.id, projectId });

      updateProject(projectId, { status: "ingesting" });
      await job.updateProgress(5);

      try {
        const buffer = Buffer.from(zipBase64, "base64");
        const files = extractZip(buffer);

        if (files.length === 0) {
          throw new Error(
            "No source files found. Zip the project folder directly — exclude node_modules and .git first."
          );
        }

        updateProject(projectId, { fileCount: files.length, fileTree: buildFileTree(files) });
        await job.updateProgress(20);

        const chunks = chunkFiles(files, projectId);
        logger.info(`Chunked ${files.length} files → ${chunks.length} chunks`, { projectId });
        await job.updateProgress(40);

        let stored = 0;
        for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
          const batch = chunks.slice(i, i + BATCH_SIZE);
          await ingestChunks(projectId, batch);
          stored += batch.length;
          await job.updateProgress(40 + Math.floor((stored / chunks.length) * 55));
        }

        updateProject(projectId, { status: "ready", chunkCount: stored });
        await job.updateProgress(100);
        logger.info("Ingestion complete", { projectId, chunks: stored });

      } catch (err) {
        logger.error("Ingestion failed", { projectId, err: err.message });
        updateProject(projectId, { status: "failed", errorMessage: err.message });
        throw err;
      }
    },
    {
      connection: getBullMQConnection(),
      concurrency: 2,
    }
  );

  _worker.on("completed", (job) => logger.info(`Job ${job.id} completed`));
  _worker.on("failed", (job, err) => logger.error(`Job ${job?.id} failed: ${err.message}`));
  logger.info("Ingestion worker started");
}

async function stopWorker() {
  if (_worker) await _worker.close();
  if (_queue) await _queue.close();
}

module.exports = { getQueue, enqueueIngestion, getJobStatus, startWorker, stopWorker };
