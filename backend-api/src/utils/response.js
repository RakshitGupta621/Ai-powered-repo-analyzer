/**
 * Standardized API response helpers.
 * Ensures a consistent response envelope across all endpoints.
 */

/**
 * @param {import('express').Response} res
 * @param {*} data
 * @param {string} [message]
 * @param {number} [statusCode]
 */
function success(res, data, message = "Success", statusCode = 200) {
  return res.status(statusCode).json({
    success: true,
    message,
    data,
  });
}

/**
 * @param {import('express').Response} res
 * @param {string} message
 * @param {number} [statusCode]
 * @param {*} [errors]
 */
function error(res, message, statusCode = 500, errors = null) {
  const body = { success: false, message };
  if (errors) body.errors = errors;
  return res.status(statusCode).json(body);
}

function notFound(res, resource = "Resource") {
  return error(res, `${resource} not found`, 404);
}

function badRequest(res, message, errors = null) {
  return error(res, message, 400, errors);
}

function unauthorized(res, message = "Unauthorized") {
  return error(res, message, 401);
}

function tooManyRequests(res) {
  return error(res, "Too many requests. Please slow down.", 429);
}

module.exports = { success, error, notFound, badRequest, unauthorized, tooManyRequests };
