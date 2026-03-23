/**
 * Ingestion router
 */
const express = require("express");
const router = express.Router();
const ctrl = require("../controllers/ingestController");
const upload = require("../middleware/upload");
const { ingestLimiter } = require("../middleware/rateLimiter");
const { ingestRules, jobIdRules } = require("../validators");

// POST /api/ingest — upload ZIP + trigger ingestion
router.post("/", ingestLimiter, upload.single("file"), ingestRules, ctrl.startIngestion);

// GET /api/ingest/:jobId/status — poll job progress
router.get("/:jobId/status", jobIdRules, ctrl.getJobStatus);

module.exports = router;
