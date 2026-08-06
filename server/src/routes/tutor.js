import { Router } from 'express';
import { z } from 'zod';
import prisma from '../lib/prisma.js';
import { authMiddleware } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { createError } from '../middleware/errorHandler.js';
import { tutorReply } from '../services/geminiService.js';

const router = Router();
router.use(authMiddleware);

const messageSchema = z.object({
  roadmapNodeId: z.string().uuid().optional(),
  message: z.string().min(1).max(2000),
});

router.post('/message', validate(messageSchema), async (req, res, next) => {
  try {
    const { roadmapNodeId, message } = req.body;

    let node = null;
    if (roadmapNodeId) {
      node = await prisma.roadmapNode.findFirst({
        where: {
          id: roadmapNodeId,
          roadmap: { goal: { userId: req.userId } },
        },
      });
      if (!node) return next(createError(404, 'Node not found', 'NOT_FOUND'));
    }

    // Get conversation history
    const history = await prisma.tutorMessage.findMany({
      where: { userId: req.userId, roadmapNodeId: roadmapNodeId || null },
      orderBy: { createdAt: 'asc' },
      take: 20,
    });

    // Get mastery context
    let mastery = null;
    if (node) {
      mastery = await prisma.topicMastery.findUnique({
        where: { userId_topicTag: { userId: req.userId, topicTag: node.topicTag } },
      });
    }

    // Save user message
    await prisma.tutorMessage.create({
      data: { userId: req.userId, roadmapNodeId: roadmapNodeId || null, role: 'user', content: message },
    });

    // Get AI reply
    const nodeContext = node || { title: 'General Learning', topicTag: 'general' };
    const reply = await tutorReply(nodeContext, history, message, mastery);

    // Save assistant message
    const assistantMsg = await prisma.tutorMessage.create({
      data: {
        userId: req.userId,
        roadmapNodeId: roadmapNodeId || null,
        role: 'assistant',
        content: typeof reply === 'string' ? reply : JSON.stringify(reply),
      },
    });

    res.json({ message: assistantMsg });
  } catch (err) {
    next(err);
  }
});

// Get chat history for a node
router.get('/history', async (req, res, next) => {
  try {
    const { roadmapNodeId } = req.query;
    const messages = await prisma.tutorMessage.findMany({
      where: {
        userId: req.userId,
        roadmapNodeId: roadmapNodeId || null,
      },
      orderBy: { createdAt: 'asc' },
    });
    res.json({ messages });
  } catch (err) {
    next(err);
  }
});

export default router;
