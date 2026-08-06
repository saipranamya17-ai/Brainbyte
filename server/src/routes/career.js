import { Router } from 'express';
import { z } from 'zod';
import prisma from '../lib/prisma.js';
import { authMiddleware } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { createError } from '../middleware/errorHandler.js';
import { extractJDSkills, computeGapAnalysis } from '../services/geminiService.js';

const router = Router();
router.use(authMiddleware);

// ─── Store JD + Extract Skills ────────────────────────────────────────────────
const jdSchema = z.object({
  rawText: z.string().min(50).max(10000),
});

router.post('/job-description', validate(jdSchema), async (req, res, next) => {
  try {
    const { rawText } = req.body;
    const skills = await extractJDSkills(rawText);

    const jd = await prisma.jobDescription.create({
      data: {
        userId: req.userId,
        rawText,
        extractedSkillsJson: skills,
      },
    });

    res.status(201).json({ jobDescription: jd });
  } catch (err) {
    next(err);
  }
});

router.get('/job-descriptions', async (req, res, next) => {
  try {
    const jds = await prisma.jobDescription.findMany({
      where: { userId: req.userId },
      orderBy: { createdAt: 'desc' },
      select: { id: true, extractedSkillsJson: true, createdAt: true, rawText: true },
    });
    // Show first 200 chars of rawText
    const safe = jds.map(j => ({ ...j, rawText: j.rawText.slice(0, 200) + '...' }));
    res.json({ jobDescriptions: safe });
  } catch (err) {
    next(err);
  }
});

// ─── Gap Analysis ─────────────────────────────────────────────────────────────
const gapSchema = z.object({
  jobDescriptionId: z.string().uuid(),
});

router.post('/gap-analysis', validate(gapSchema), async (req, res, next) => {
  try {
    const { jobDescriptionId } = req.body;

    const jd = await prisma.jobDescription.findFirst({
      where: { id: jobDescriptionId, userId: req.userId },
    });
    if (!jd) return next(createError(404, 'Job description not found', 'NOT_FOUND'));

    // Gather user's mastered topics (masteryScore >= 0.8)
    const masteredTopics = await prisma.topicMastery.findMany({
      where: { userId: req.userId, masteryScore: { gte: 0.8 } },
    });
    const masteredSkills = masteredTopics.map(t => t.topicTag);

    const gapResult = await computeGapAnalysis(masteredSkills, jd.extractedSkillsJson);

    const gap = await prisma.gapAnalysis.create({
      data: {
        userId: req.userId,
        jobDescriptionId,
        matchedSkillsJson: gapResult.matchedSkills || [],
        missingSkillsJson: gapResult.missingSkills || [],
      },
    });

    res.status(201).json({
      gapAnalysis: gap,
      summary: gapResult.summary,
      overallMatchPercent: gapResult.overallMatchPercent,
      matchedSkills: gapResult.matchedSkills,
      missingSkills: gapResult.missingSkills,
    });
  } catch (err) {
    next(err);
  }
});

router.get('/gap-analyses', async (req, res, next) => {
  try {
    const analyses = await prisma.gapAnalysis.findMany({
      where: { userId: req.userId },
      include: { jobDescription: { select: { rawText: true, extractedSkillsJson: true } } },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ analyses });
  } catch (err) {
    next(err);
  }
});

export default router;
