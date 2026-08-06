import jwt from 'jsonwebtoken';
import { createError } from './errorHandler.js';

/**
 * Verifies the Bearer access token and attaches req.userId.
 */
export function authMiddleware(req, _res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return next(createError(401, 'No token provided', 'UNAUTHORIZED'));
  }

  const token = header.slice(7);
  try {
    const payload = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
    req.userId = payload.userId;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return next(createError(401, 'Token expired', 'TOKEN_EXPIRED'));
    }
    return next(createError(401, 'Invalid token', 'UNAUTHORIZED'));
  }
}
