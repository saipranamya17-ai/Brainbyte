import { Router } from 'express';
import { z } from 'zod';
import prisma from '../lib/prisma.js';
import { authMiddleware } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';

const router = Router();
router.use(authMiddleware);

// ─── Analytics Dashboard ──────────────────────────────────────────────────────
router.get('/dashboard', async (req, res, next) => {
  try {
    const userId = req.userId;

    // 1. Roadmap completion %
    const goals = await prisma.goal.findMany({
      where: { userId, status: 'active' },
      include: { roadmap: true },
    });

    let totalNodes = 0, masteredNodes = 0;
    for (const goal of goals) {
      if (!goal.roadmap) continue;
      const nodes = await prisma.roadmapNode.findMany({
        where: { roadmapId: goal.roadmap.id, type: { in: ['module', 'lesson'] } },
      });
      totalNodes += nodes.length;
      masteredNodes += nodes.filter(n => n.status === 'mastered').length;
    }
    const roadmapCompletion = totalNodes > 0 ? masteredNodes / totalNodes : 0;

    // 2. Quiz score trend (last 20 attempts)
    const recentAttempts = await prisma.quizAttempt.findMany({
      where: { userId },
      orderBy: { attemptedAt: 'asc' },
      take: 20,
      include: { roadmapNode: { select: { topicTag: true, title: true } } },
    });
    const quizTrend = recentAttempts.map(a => ({
      date: a.attemptedAt,
      score: a.score,
      topic: a.roadmapNode.topicTag,
      title: a.roadmapNode.title,
    }));

    // 3. Weak topics (mastery < 0.5)
    const weakTopics = await prisma.topicMastery.findMany({
      where: { userId, masteryScore: { lt: 0.5 } },
      orderBy: { nextReviewAt: 'asc' },
    });

    // 4. All topic mastery for heatmap
    const allMastery = await prisma.topicMastery.findMany({
      where: { userId },
      orderBy: { masteryScore: 'desc' },
    });

    // 5. Interview readiness trend
    const interviewSessions = await prisma.interviewSession.findMany({
      where: { userId },
      include: { turns: { select: { score: true, orderIndex: true } } },
      orderBy: { createdAt: 'asc' },
    });
    const interviewTrend = interviewSessions.map(s => {
      const scored = s.turns.filter(t => t.score !== null);
      return {
        date: s.createdAt,
        mode: s.mode,
        targetRole: s.targetRole,
        avgScore: scored.length ? scored.reduce((a, t) => a + t.score, 0) / scored.length : 0,
        questionCount: scored.length,
      };
    });
    const avgInterviewScore = interviewTrend.length
      ? interviewTrend.reduce((a, t) => a + t.avgScore, 0) / interviewTrend.length
      : 0;

    // 6. Gap analysis match %
    const gapAnalyses = await prisma.gapAnalysis.findMany({ where: { userId } });
    let avgGapMatchPercent = 0;
    if (gapAnalyses.length) {
      // Each gapAnalysis has matchedSkillsJson array
      const totalMatch = gapAnalyses.reduce((sum, g) => {
        const matched = Array.isArray(g.matchedSkillsJson) ? g.matchedSkillsJson.length : 0;
        const missing = Array.isArray(g.missingSkillsJson) ? g.missingSkillsJson.length : 0;
        const total = matched + missing;
        return sum + (total > 0 ? matched / total : 0);
      }, 0);
      avgGapMatchPercent = totalMatch / gapAnalyses.length;
    }

    // 7. Composite career readiness score
    const careerReadinessScore =
      0.4 * roadmapCompletion +
      0.3 * avgGapMatchPercent +
      0.3 * avgInterviewScore;

    // 8. Due review count
    const dueReviewCount = await prisma.topicMastery.count({
      where: { userId, nextReviewAt: { lte: new Date() }, masteryScore: { gt: 0 } },
    });

    // 9. Last interview session
    const lastSession = interviewSessions[interviewSessions.length - 1] || null;

    res.json({
      roadmapCompletion,
      totalNodes,
      masteredNodes,
      quizTrend,
      weakTopics,
      allMastery,
      interviewTrend,
      avgInterviewScore,
      avgGapMatchPercent,
      careerReadinessScore,
      dueReviewCount,
      lastSession: lastSession
        ? { ...lastSession, avgScore: interviewTrend[interviewTrend.length - 1]?.avgScore }
        : null,
    });
  } catch (err) {
    next(err);
  }
});

export default router;
