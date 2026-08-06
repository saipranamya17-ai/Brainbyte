import { Router } from 'express';
import { z } from 'zod';
import prisma from '../lib/prisma.js';
import { authMiddleware } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { createError } from '../middleware/errorHandler.js';
import { generateModuleContent } from '../services/geminiService.js';

const router = Router();
router.use(authMiddleware);

// ─── Experience CRUD ──────────────────────────────────────────────────────────
const experienceSchema = z.object({
  type: z.enum(['project', 'internship', 'job', 'certification']),
  title: z.string().min(2).max(200),
  description: z.string().min(5).max(2000),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  skills: z.array(z.string()).default([]),
});

router.post('/experience', validate(experienceSchema), async (req, res, next) => {
  try {
    const exp = await prisma.experience.create({
      data: { userId: req.userId, ...req.body },
    });
    res.status(201).json({ experience: exp });
  } catch (err) {
    next(err);
  }
});

router.get('/experience', async (req, res, next) => {
  try {
    const experiences = await prisma.experience.findMany({
      where: { userId: req.userId },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ experiences });
  } catch (err) {
    next(err);
  }
});

router.delete('/experience/:id', async (req, res, next) => {
  try {
    const exp = await prisma.experience.findFirst({
      where: { id: req.params.id, userId: req.userId },
    });
    if (!exp) return next(createError(404, 'Experience not found', 'NOT_FOUND'));
    await prisma.experience.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

// ─── Module Content (lazy-loaded) ─────────────────────────────────────────────
router.get('/module-content/:nodeId', async (req, res, next) => {
  try {
    const node = await prisma.roadmapNode.findFirst({
      where: {
        id: req.params.nodeId,
        roadmap: { goal: { userId: req.userId } },
      },
    });
    if (!node) return next(createError(404, 'Node not found', 'NOT_FOUND'));

    const content = await generateModuleContent(node);
    res.json({ content });
  } catch (err) {
    next(err);
  }
});

export default router;
