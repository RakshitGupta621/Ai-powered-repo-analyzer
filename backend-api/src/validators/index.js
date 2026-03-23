/**
 * Request validation middleware using express-validator.
 * Each exported array is a validation chain for a specific endpoint.
 */

const { body, param, query, validationResult } = require("express-validator");
const { badRequest } = require("../utils/response");

/**
 * Run validators and return 400 if any fail.
 */
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return badRequest(res, "Validation failed", errors.array());
  }
  next();
};

// ── Project validators ────────────────────────────────────────────────────────

const createProjectRules = [
  body("name")
    .trim()
    .notEmpty().withMessage("Project name is required")
    .isLength({ min: 2, max: 100 }).withMessage("Name must be 2–100 characters"),
  body("repoUrl")
    .optional()
    .isURL().withMessage("repoUrl must be a valid URL"),
  validate,
];

const projectIdRules = [
  param("projectId")
    .notEmpty().withMessage("projectId is required")
    .isUUID().withMessage("projectId must be a valid UUID"),
  validate,
];

// ── Ingest validators ─────────────────────────────────────────────────────────

const ingestRules = [
  body("projectId")
    .notEmpty().withMessage("projectId is required")
    .isUUID().withMessage("projectId must be a valid UUID"),
  validate,
];

const jobIdRules = [
  param("jobId")
    .notEmpty().withMessage("jobId is required"),
  validate,
];

// ── Query validators ──────────────────────────────────────────────────────────

const queryRules = [
  body("projectId")
    .notEmpty().withMessage("projectId is required")
    .isUUID().withMessage("projectId must be a valid UUID"),
  body("question")
    .trim()
    .notEmpty().withMessage("question is required")
    .isLength({ min: 3, max: 1000 }).withMessage("question must be 3–1000 characters"),
  body("topK")
    .optional({ nullable: true })
    .custom((val) => val === null || val === undefined || (Number.isInteger(val) && val >= 1 && val <= 20))
    .withMessage("topK must be 1–20"),
  validate,
];

module.exports = {
  createProjectRules,
  projectIdRules,
  ingestRules,
  jobIdRules,
  queryRules,
};