/**
 * Global error handler middleware.
 * Must be registered LAST in the Express app (after all routes).
 */

const logger = require("../utils/logger");
const { error } = require("../utils/response");

function errorHandler(err, req, res, next) {
  const statusCode = err.status || err.statusCode || 500;
  const message =
    statusCode < 500
      ? err.message
      : "An unexpected error occurred. Please try again.";

  logger.error("Unhandled error", {
    method: req.method,
    path: req.path,
    status: statusCode,
    message: err.message,
    stack: process.env.NODE_ENV === "development" ? err.stack : undefined,
  });

  return error(res, message, statusCode);
}

/**
 * 404 handler — catches any unmatched routes.
 */
function notFoundHandler(req, res) {
  return error(res, `Route ${req.method} ${req.path} not found`, 404);
}

module.exports = { errorHandler, notFoundHandler };
