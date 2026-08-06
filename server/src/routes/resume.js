import { Router } from 'express';
import { z } from 'zod';
import prisma from '../lib/prisma.js';
import { authMiddleware } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { createError } from '../middleware/errorHandler.js';
import { generateResume } from '../services/geminiService.js';

const router = Router();
router.use(authMiddleware);

// ─── Generate Resume ───────────────────────────────────────────────────────────
const generateSchema = z.object({
  targetRole: z.string().min(2).max(200),
});

router.post('/generate', validate(generateSchema), async (req, res, next) => {
  try {
    const { targetRole } = req.body;

    // Gather mastered topics
    const masteredTopics = await prisma.topicMastery.findMany({
      where: { userId: req.userId, masteryScore: { gte: 0.6 } },
    });

    // Gather experiences
    const experiences = await prisma.experience.findMany({
      where: { userId: req.userId },
      orderBy: { createdAt: 'desc' },
    });

    // Gather interview performance
    const interviewSessions = await prisma.interviewSession.findMany({
      where: { userId: req.userId },
      include: { turns: { select: { score: true } } },
    });
    const allScores = interviewSessions.flatMap(s => s.turns.map(t => t.score).filter(Boolean));
    const avgInterviewScore = allScores.length
      ? allScores.reduce((a, b) => a + b, 0) / allScores.length
      : null;

    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      select: { name: true },
    });

    const resumeData = await generateResume(
      {
        userName: user.name,
        masteredTopics: masteredTopics.map(t => t.topicTag),
        experiences,
        avgInterviewScore,
      },
      targetRole
    );

    const resume = await prisma.resume.create({
      data: { userId: req.userId, targetRole, contentJson: resumeData },
    });

    res.status(201).json({ resume });
  } catch (err) {
    next(err);
  }
});

// ─── Get Resume ───────────────────────────────────────────────────────────────
router.get('/:id', async (req, res, next) => {
  try {
    const resume = await prisma.resume.findFirst({
      where: { id: req.params.id, userId: req.userId },
    });
    if (!resume) return next(createError(404, 'Resume not found', 'NOT_FOUND'));
    res.json({ resume });
  } catch (err) {
    next(err);
  }
});

// ─── List Resumes ──────────────────────────────────────────────────────────────
router.get('/', async (req, res, next) => {
  try {
    const resumes = await prisma.resume.findMany({
      where: { userId: req.userId },
      orderBy: { generatedAt: 'desc' },
      select: { id: true, targetRole: true, generatedAt: true },
    });
    res.json({ resumes });
  } catch (err) {
    next(err);
  }
});

export default router;
