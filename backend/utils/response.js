/**
 * Standardised API response helper.
 * Every controller should use these helpers to ensure consistent shape:
 * { success, data, error, status }
 */

const success = (res, data = null, message = 'Success', statusCode = 200) => {
  return res.status(statusCode).json({
    success: true,
    message,
    data,
  });
};

const created = (res, data = null, message = 'Created') => {
  return success(res, data, message, 201);
};

const error = (res, message = 'Internal Server Error', statusCode = 500, details = null) => {
  return res.status(statusCode).json({
    success: false,
    message,
    error: details,
  });
};

const notFound = (res, message = 'Resource not found') => {
  return error(res, message, 404);
};

const unauthorized = (res, message = 'Unauthorized') => {
  return error(res, message, 401);
};

const forbidden = (res, message = 'Forbidden') => {
  return error(res, message, 403);
};

const badRequest = (res, message = 'Bad Request', details = null) => {
  return error(res, message, 400, details);
};

module.exports = { success, created, error, notFound, unauthorized, forbidden, badRequest };
