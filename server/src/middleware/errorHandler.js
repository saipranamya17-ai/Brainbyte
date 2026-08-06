/**
 * Centralized Express error handler.
 * Returns consistent { error: { message, code } } shape.
 */
export function errorHandler(err, _req, res, _next) {
  const status = err.status || err.statusCode || 500;
  const code   = err.code   || 'INTERNAL_ERROR';
  const message = err.message || 'An unexpected error occurred';

  if (status === 500) {
    console.error('[ERROR]', err);
  }

  res.status(status).json({ error: { message, code } });
}

/**
 * Create an HTTP error with a status code and optional code string.
 */
export function createError(status, message, code) {
  const err = new Error(message);
  err.status = status;
  err.code = code || 'ERROR';
  return err;
}
