const success = (res, data, msg = "Success", code = 200) =>
  res.status(code).json({ success: true, message: msg, data });

const error = (res, msg, code = 500, errors = null) => {
  const body = { success: false, message: msg };
  if (errors) body.errors = errors;
  return res.status(code).json(body);
};

const notFound = (res, resource = "Resource") =>
  error(res, `${resource} not found`, 404);

const badRequest = (res, msg, errors = null) =>
  error(res, msg, 400, errors);

const unauthorized = (res, msg = "Unauthorized") =>
  error(res, msg, 401);

const tooManyRequests = (res) =>
  error(res, "Too many requests. Please slow down.", 429);

module.exports = { success, error, notFound, badRequest, unauthorized, tooManyRequests };
