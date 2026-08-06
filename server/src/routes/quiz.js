import { Router } from 'express';
import { z } from 'zod';
import prisma from '../lib/prisma.js';
import { authMiddleware } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { createError } from '../middleware/errorHandler.js';
import { generateQuiz } from '../services/geminiService.js';

const router = Router();
router.use(authMiddleware);

// ─── Spaced repetition interval table (days) ─────────────────────────────────
const SR_INTERVALS = [2, 5, 14, 30];

function getNextInterval(reviewCount, passed) {
  if (!passed) return SR_INTERVALS[0]; // reset to 2 days on failure
  const idx = Math.min(reviewCount, SR_INTERVALS.length - 1);
  return SR_INTERVALS[idx];
}

function addDays(date, days) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

// ─────────────────────────────────────────────────────────────────────────────
// In-memory quiz key store (keyed by attemptId)
// For production, use Redis or DB. For this build, memory is fine.
// ─────────────────────────────────────────────────────────────────────────────
const quizKeys = new Map(); // attemptId -> { questions, correctAnswers }

// ─── Generate Quiz ────────────────────────────────────────────────────────────
const generateSchema = z.object({
  roadmapNodeId: z.string().uuid(),
});

router.post('/quiz/generate', validate(generateSchema), async (req, res, next) => {
  try {
    const { roadmapNodeId } = req.body;

    // Load node (verify it belongs to this user via roadmap->goal)
    const node = await prisma.roadmapNode.findUnique({
      where: { id: roadmapNodeId },
      include: { roadmap: { include: { goal: { select: { userId: true } } } } },
    });
    if (!node) return next(createError(404, 'Node not found', 'NOT_FOUND'));
    if (node.roadmap.goal.userId !== req.userId) return next(createError(403, 'Forbidden', 'FORBIDDEN'));

    // Get topic mastery for adaptive difficulty
    const mastery = await prisma.topicMastery.findUnique({
      where: { userId_topicTag: { userId: req.userId, topicTag: node.topicTag } },
    });

    const simplified = (mastery?.masteryScore ?? 0) < 0.5 && (mastery?.reviewCount ?? 0) > 0;

    // Generate via Gemini
    const quizData = await generateQuiz(node, mastery, simplified);

    // Create a pending attempt record (no score yet)
    const attempt = await prisma.quizAttempt.create({
      data: {
        userId: req.userId,
        roadmapNodeId,
        questionsJson: quizData.questions,
        answersJson: {},
        score: 0,
        timeSpentSeconds: 0,
      },
    });

    // Store answer key in memory
    const answerKey = {};
    for (const q of quizData.questions) {
      answerKey[q.id] = { correct: q.correctAnswer, explanation: q.explanation };
    }
    quizKeys.set(attempt.id, answerKey);

    // Send questions WITHOUT correctAnswer to the client
    const clientQuestions = quizData.questions.map(({ correctAnswer: _ca, ...q }) => q);
    res.json({ attemptId: attempt.id, questions: clientQuestions, nodeId: roadmapNodeId });
  } catch (err) {
    next(err);
  }
});

// ─── Submit Quiz ──────────────────────────────────────────────────────────────
const submitSchema = z.object({
  attemptId: z.string().uuid(),
  roadmapNodeId: z.string().uuid(),
  answers: z.record(z.string(), z.enum(['A', 'B', 'C', 'D'])),
  timeSpentSeconds: z.number().int().min(0).default(0),
});

router.post('/quiz/submit', validate(submitSchema), async (req, res, next) => {
  try {
    const { attemptId, roadmapNodeId, answers, timeSpentSeconds } = req.body;

    // Verify attempt belongs to user
    const attempt = await prisma.quizAttempt.findFirst({
      where: { id: attemptId, userId: req.userId, roadmapNodeId },
    });
    if (!attempt) return next(createError(404, 'Quiz attempt not found', 'NOT_FOUND'));

    // Get answer key
    const answerKey = quizKeys.get(attemptId);
    if (!answerKey) return next(createError(410, 'Quiz session expired. Please generate a new quiz.', 'SESSION_EXPIRED'));

    // Score the quiz
    const results = {};
    let correct = 0;
    const total = Object.keys(answerKey).length;

    for (const [qId, keyData] of Object.entries(answerKey)) {
      const userAnswer = answers[qId];
      const isCorrect = userAnswer === keyData.correct;
      if (isCorrect) correct++;
      results[qId] = {
        userAnswer,
        correctAnswer: keyData.correct,
        isCorrect,
        explanation: keyData.explanation,
      };
    }

    const score = total > 0 ? correct / total : 0;

    // Update attempt record
    await prisma.quizAttempt.update({
      where: { id: attemptId },
      data: { answersJson: answers, score, timeSpentSeconds },
    });

    // Clean up key
    quizKeys.delete(attemptId);

    // Update TopicMastery (EMA: newScore = 0.6*old + 0.4*thisScore)
    const node = await prisma.roadmapNode.findUnique({ where: { id: roadmapNodeId } });
    const existing = await prisma.topicMastery.findUnique({
      where: { userId_topicTag: { userId: req.userId, topicTag: node.topicTag } },
    });

    const oldScore = existing?.masteryScore ?? 0;
    const newScore = existing ? 0.6 * oldScore + 0.4 * score : score;
    const reviewCount = (existing?.reviewCount ?? 0) + 1;
    const passed = score >= 0.6;
    const intervalDays = getNextInterval(reviewCount - 1, passed);
    const nextReviewAt = addDays(new Date(), intervalDays);

    const mastery = await prisma.topicMastery.upsert({
      where: { userId_topicTag: { userId: req.userId, topicTag: node.topicTag } },
      update: {
        masteryScore: newScore,
        reviewCount,
        lastReviewedAt: new Date(),
        nextReviewAt,
      },
      create: {
        userId: req.userId,
        topicTag: node.topicTag,
        masteryScore: newScore,
        reviewCount: 1,
        lastReviewedAt: new Date(),
        nextReviewAt,
      },
    });

    // If mastery >= 0.8, mark node as mastered and unlock next
    let nodeUnlocked = null;
    if (newScore >= 0.8) {
      await prisma.roadmapNode.update({
        where: { id: roadmapNodeId },
        data: { status: 'mastered' },
      });

      // Unlock next sibling
      if (node.parentNodeId) {
        const nextSibling = await prisma.roadmapNode.findFirst({
          where: {
            roadmapId: node.roadmapId,
            parentNodeId: node.parentNodeId,
            orderIndex: { gt: node.orderIndex },
            status: 'locked',
          },
          orderBy: { orderIndex: 'asc' },
        });
        if (nextSibling) {
          nodeUnlocked = await prisma.roadmapNode.update({
            where: { id: nextSibling.id },
            data: { status: 'active' },
          });
        }
      }
    }

    res.json({
      score,
      correct,
      total,
      results,
      mastery: {
        topicTag: node.topicTag,
        oldScore,
        newScore: mastery.masteryScore,
        reviewCount: mastery.reviewCount,
        nextReviewAt: mastery.nextReviewAt,
        nodeMastered: newScore >= 0.8,
      },
      nodeUnlocked: nodeUnlocked ? { id: nodeUnlocked.id, title: nodeUnlocked.title } : null,
    });
  } catch (err) {
    next(err);
  }
});

// ─── Due Reviews ──────────────────────────────────────────────────────────────
router.get('/review/due', async (req, res, next) => {
  try {
    const dueTopics = await prisma.topicMastery.findMany({
      where: {
        userId: req.userId,
        nextReviewAt: { lte: new Date() },
        masteryScore: { gt: 0 },
      },
      orderBy: { nextReviewAt: 'asc' },
    });

    // For each due topic, find an associated active/mastered node
    const enriched = await Promise.all(dueTopics.map(async (tm) => {
      const node = await prisma.roadmapNode.findFirst({
        where: {
          topicTag: tm.topicTag,
          roadmap: { goal: { userId: req.userId } },
          status: { in: ['active', 'mastered'] },
        },
      });
      return { ...tm, node };
    }));

    res.json({ dueReviews: enriched.filter(d => d.node) });
  } catch (err) {
    next(err);
  }
});

export default router;
