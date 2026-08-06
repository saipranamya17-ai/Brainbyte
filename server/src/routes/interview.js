import { Router } from 'express';
import { z } from 'zod';
import prisma from '../lib/prisma.js';
import { authMiddleware } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { createError } from '../middleware/errorHandler.js';
import { nextInterviewQuestion, scoreInterviewAnswer } from '../services/geminiService.js';

const router = Router();
router.use(authMiddleware);

// ─── Start Session ─────────────────────────────────────────────────────────────
const startSchema = z.object({
  targetRole: z.string().min(2).max(200),
  mode: z.enum(['dsa', 'system_design', 'behavioral']),
});

router.post('/start', validate(startSchema), async (req, res, next) => {
  try {
    const { targetRole, mode } = req.body;

    const session = await prisma.interviewSession.create({
      data: { userId: req.userId, targetRole, mode },
    });

    // Generate first question
    const qData = await nextInterviewQuestion(session, [], null, null);

    const turn = await prisma.interviewTurn.create({
      data: {
        sessionId: session.id,
        question: qData.question,
        orderIndex: 0,
      },
    });

    res.status(201).json({ session, firstTurn: { ...turn, hints: qData.hints, topic: qData.topic, difficulty: qData.difficulty } });
  } catch (err) {
    next(err);
  }
});

// ─── Submit Answer + Get Next Question ────────────────────────────────────────
const turnSchema = z.object({
  answer: z.string().min(1).max(5000),
});

router.post('/:sessionId/turn', validate(turnSchema), async (req, res, next) => {
  try {
    const { sessionId } = req.params;
    const { answer } = req.body;

    const session = await prisma.interviewSession.findFirst({
      where: { id: sessionId, userId: req.userId },
      include: { turns: { orderBy: { orderIndex: 'asc' } } },
    });
    if (!session) return next(createError(404, 'Session not found', 'NOT_FOUND'));

    // Find the unanswered turn (last one with no answer)
    const currentTurn = session.turns.findLast(t => !t.answer);
    if (!currentTurn) return next(createError(400, 'No pending question to answer', 'BAD_REQUEST'));

    // Score the answer
    const scoreData = await scoreInterviewAnswer(
      currentTurn.question,
      answer,
      session.mode,
      session.targetRole
    );

    // Update current turn with answer + feedback
    const updatedTurn = await prisma.interviewTurn.update({
      where: { id: currentTurn.id },
      data: {
        answer,
        aiFeedback: scoreData.feedback,
        score: scoreData.score,
      },
    });

    // Generate next question (conditioned on score)
    const completedTurns = session.turns.map(t =>
      t.id === currentTurn.id
        ? { ...t, answer, score: scoreData.score }
        : t
    );

    const nextQData = await nextInterviewQuestion(
      session,
      completedTurns,
      answer,
      scoreData.score
    );

    const nextTurn = await prisma.interviewTurn.create({
      data: {
        sessionId: session.id,
        question: nextQData.question,
        orderIndex: currentTurn.orderIndex + 1,
      },
    });

    res.json({
      feedback: {
        score: scoreData.score,
        feedback: scoreData.feedback,
        idealAnswer: scoreData.idealAnswer,
        strengths: scoreData.strengths,
        improvements: scoreData.improvements,
      },
      nextTurn: { ...nextTurn, hints: nextQData.hints, topic: nextQData.topic, difficulty: nextQData.difficulty },
    });
  } catch (err) {
    next(err);
  }
});

// ─── Session Summary ──────────────────────────────────────────────────────────
router.get('/:sessionId/summary', async (req, res, next) => {
  try {
    const session = await prisma.interviewSession.findFirst({
      where: { id: req.params.sessionId, userId: req.userId },
      include: { turns: { orderBy: { orderIndex: 'asc' } } },
    });
    if (!session) return next(createError(404, 'Session not found', 'NOT_FOUND'));

    const scoredTurns = session.turns.filter(t => t.score !== null);
    const avgScore = scoredTurns.length
      ? scoredTurns.reduce((s, t) => s + t.score, 0) / scoredTurns.length
      : 0;

    // Get prior sessions for trend
    const priorSessions = await prisma.interviewSession.findMany({
      where: { userId: req.userId, targetRole: session.targetRole, mode: session.mode },
      include: { turns: { select: { score: true } } },
      orderBy: { createdAt: 'asc' },
    });

    const trend = priorSessions.map(s => {
      const scored = s.turns.filter(t => t.score !== null);
      return {
        sessionId: s.id,
        date: s.createdAt,
        avgScore: scored.length ? scored.reduce((a, t) => a + t.score, 0) / scored.length : 0,
        questionCount: scored.length,
      };
    });

    res.json({ session, avgScore, trend, turns: session.turns });
  } catch (err) {
    next(err);
  }
});

// ─── List Sessions ────────────────────────────────────────────────────────────
router.get('/', async (req, res, next) => {
  try {
    const sessions = await prisma.interviewSession.findMany({
      where: { userId: req.userId },
      include: { turns: { select: { score: true } } },
      orderBy: { createdAt: 'desc' },
    });

    const enriched = sessions.map(s => {
      const scored = s.turns.filter(t => t.score !== null);
      return {
        ...s,
        avgScore: scored.length ? scored.reduce((a, t) => a + t.score, 0) / scored.length : null,
        questionCount: scored.length,
      };
    });

    res.json({ sessions: enriched });
  } catch (err) {
    next(err);
  }
});

export default router;
