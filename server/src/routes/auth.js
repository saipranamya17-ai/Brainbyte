import { Router } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import prisma from '../lib/prisma.js';
import { validate } from '../middleware/validate.js';
import { createError } from '../middleware/errorHandler.js';

const router = Router();

const BCRYPT_ROUNDS = 12;
const ACCESS_EXPIRY = '15m';
const REFRESH_EXPIRY = '7d';

function issueTokens(userId) {
  const accessToken = jwt.sign(
    { userId },
    process.env.JWT_ACCESS_SECRET,
    { expiresIn: ACCESS_EXPIRY }
  );
  const refreshToken = jwt.sign(
    { userId },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: REFRESH_EXPIRY }
  );
  return { accessToken, refreshToken };
}

// ─── Register ────────────────────────────────────────────────────────────────
const registerSchema = z.object({
  name: z.string().min(2).max(100),
  email: z.string().email(),
  password: z.string().min(8).max(128),
});

router.post('/register', validate(registerSchema), async (req, res, next) => {
  try {
    const { name, email, password } = req.body;

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return next(createError(409, 'Email already in use', 'EMAIL_TAKEN'));
    }

    const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
    const user = await prisma.user.create({
      data: { name, email, passwordHash },
      select: { id: true, name: true, email: true, createdAt: true },
    });

    const tokens = issueTokens(user.id);
    res.status(201).json({ user, ...tokens });
  } catch (err) {
    next(err);
  }
});

// ─── Login ────────────────────────────────────────────────────────────────────
const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

router.post('/login', validate(loginSchema), async (req, res, next) => {
  try {
    const { email, password } = req.body;

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return next(createError(401, 'Invalid credentials', 'INVALID_CREDENTIALS'));
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      return next(createError(401, 'Invalid credentials', 'INVALID_CREDENTIALS'));
    }

    const tokens = issueTokens(user.id);
    const { passwordHash: _pw, ...safeUser } = user;
    res.json({ user: safeUser, ...tokens });
  } catch (err) {
    next(err);
  }
});

// ─── Refresh ──────────────────────────────────────────────────────────────────
const refreshSchema = z.object({
  refreshToken: z.string().min(1),
});

router.post('/refresh', validate(refreshSchema), async (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    let payload;
    try {
      payload = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    } catch {
      return next(createError(401, 'Invalid or expired refresh token', 'REFRESH_INVALID'));
    }

    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: { id: true, name: true, email: true },
    });
    if (!user) {
      return next(createError(401, 'User not found', 'USER_NOT_FOUND'));
    }

    const accessToken = jwt.sign(
      { userId: user.id },
      process.env.JWT_ACCESS_SECRET,
      { expiresIn: ACCESS_EXPIRY }
    );
    res.json({ accessToken, user });
  } catch (err) {
    next(err);
  }
});

// ─── Me ───────────────────────────────────────────────────────────────────────
import { authMiddleware } from '../middleware/auth.js';

router.get('/me', authMiddleware, async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      select: { id: true, name: true, email: true, createdAt: true },
    });
    if (!user) return next(createError(404, 'User not found', 'USER_NOT_FOUND'));
    res.json({ user });
  } catch (err) {
    next(err);
  }
});

export default router;
