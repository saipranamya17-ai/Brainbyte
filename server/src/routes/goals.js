import { Router } from 'express';
import { z } from 'zod';
import prisma from '../lib/prisma.js';
import { authMiddleware } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { createError } from '../middleware/errorHandler.js';
import { generateRoadmap } from '../services/geminiService.js';

const router = Router();
router.use(authMiddleware);

// ─── Create Goal + Generate Roadmap ──────────────────────────────────────────
const createGoalSchema = z.object({
  title: z.string().min(3).max(200),
  targetRole: z.string().min(2).max(200),
  currentLevel: z.string().min(2).max(200),
  targetTimeframe: z.string().min(2).max(100),
  hoursPerDay: z.number().min(0.5).max(16).default(2),
});

router.post('/goals', validate(createGoalSchema), async (req, res, next) => {
  try {
    const { title, targetRole, currentLevel, targetTimeframe, hoursPerDay } = req.body;

    // Create goal
    const goal = await prisma.goal.create({
      data: { userId: req.userId, title, targetRole, currentLevel, targetTimeframe, hoursPerDay },
    });

    // Generate roadmap via Gemini
    let roadmapData;
    try {
      roadmapData = await generateRoadmap({ title, targetRole, currentLevel, targetTimeframe, hoursPerDay });
    } catch (err) {
      // If AI fails, still return the goal
      console.error('Roadmap generation failed:', err.message);
      return res.status(201).json({ goal, roadmap: null, error: 'Roadmap generation failed' });
    }

    // Persist roadmap
    const roadmap = await prisma.roadmap.create({
      data: { goalId: goal.id },
    });

    // Flatten the nested tree into RoadmapNode rows
    const nodes = [];
    for (const phase of roadmapData.phases || []) {
      const phaseNode = await prisma.roadmapNode.create({
        data: {
          roadmapId: roadmap.id,
          parentNodeId: null,
          type: 'phase',
          title: phase.title,
          topicTag: phase.topicTag || phase.title.toLowerCase().replace(/\s+/g, '_'),
          difficulty: 'beginner',
          estimatedHours: 0,
          orderIndex: phase.order || 0,
          status: 'active',
        },
      });
      nodes.push(phaseNode);

      for (const milestone of phase.milestones || []) {
        const milestoneNode = await prisma.roadmapNode.create({
          data: {
            roadmapId: roadmap.id,
            parentNodeId: phaseNode.id,
            type: 'milestone',
            title: milestone.title,
            topicTag: milestone.topicTag || milestone.title.toLowerCase().replace(/\s+/g, '_'),
            difficulty: 'beginner',
            estimatedHours: 0,
            orderIndex: milestone.order || 0,
            status: 'locked',
          },
        });
        nodes.push(milestoneNode);

        let isFirstModule = true;
        for (const mod of milestone.modules || []) {
          const moduleNode = await prisma.roadmapNode.create({
            data: {
              roadmapId: roadmap.id,
              parentNodeId: milestoneNode.id,
              type: 'module',
              title: mod.title,
              topicTag: mod.topicTag,
              difficulty: mod.difficulty || 'beginner',
              estimatedHours: mod.estimatedHours || 2,
              orderIndex: milestone.modules.indexOf(mod),
              status: isFirstModule ? 'active' : 'locked',
            },
          });
          nodes.push(moduleNode);
          isFirstModule = false;

          for (const lesson of mod.lessons || []) {
            const lessonNode = await prisma.roadmapNode.create({
              data: {
                roadmapId: roadmap.id,
                parentNodeId: moduleNode.id,
                type: 'lesson',
                title: lesson.title,
                topicTag: lesson.topicTag || lesson.title.toLowerCase().replace(/\s+/g, '_'),
                difficulty: mod.difficulty || 'beginner',
                estimatedHours: 0.5,
                orderIndex: (mod.lessons || []).indexOf(lesson),
                status: 'locked',
              },
            });
            nodes.push(lessonNode);
          }
        }
      }
    }

    res.status(201).json({ goal, roadmapId: roadmap.id, nodeCount: nodes.length });
  } catch (err) {
    next(err);
  }
});

// ─── Get Goal ─────────────────────────────────────────────────────────────────
router.get('/goals/:id', async (req, res, next) => {
  try {
    const goal = await prisma.goal.findFirst({
      where: { id: req.params.id, userId: req.userId },
      include: { roadmap: { select: { id: true, version: true, generatedAt: true } } },
    });
    if (!goal) return next(createError(404, 'Goal not found', 'NOT_FOUND'));
    res.json({ goal });
  } catch (err) {
    next(err);
  }
});

// ─── List Goals ───────────────────────────────────────────────────────────────
router.get('/goals', async (req, res, next) => {
  try {
    const goals = await prisma.goal.findMany({
      where: { userId: req.userId },
      include: { roadmap: { select: { id: true, generatedAt: true } } },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ goals });
  } catch (err) {
    next(err);
  }
});

// ─── Get Roadmap (nested tree) ────────────────────────────────────────────────
router.get('/roadmaps/:goalId', async (req, res, next) => {
  try {
    const goal = await prisma.goal.findFirst({
      where: { id: req.params.goalId, userId: req.userId },
    });
    if (!goal) return next(createError(404, 'Goal not found', 'NOT_FOUND'));

    const roadmap = await prisma.roadmap.findUnique({
      where: { goalId: req.params.goalId },
    });
    if (!roadmap) return next(createError(404, 'Roadmap not found', 'NOT_FOUND'));

    const allNodes = await prisma.roadmapNode.findMany({
      where: { roadmapId: roadmap.id },
      orderBy: [{ orderIndex: 'asc' }],
    });

    // Reconstruct nested tree from parentNodeId
    const nodeMap = {};
    for (const n of allNodes) {
      nodeMap[n.id] = { ...n, children: [] };
    }
    const roots = [];
    for (const n of allNodes) {
      if (n.parentNodeId && nodeMap[n.parentNodeId]) {
        nodeMap[n.parentNodeId].children.push(nodeMap[n.id]);
      } else if (!n.parentNodeId) {
        roots.push(nodeMap[n.id]);
      }
    }

    res.json({ roadmap: { ...roadmap, nodes: roots } });
  } catch (err) {
    next(err);
  }
});

// ─── Update Node Status + Unlock Next ─────────────────────────────────────────
const updateStatusSchema = z.object({
  status: z.enum(['locked', 'active', 'mastered']),
});

router.patch('/roadmap-nodes/:id/status', validate(updateStatusSchema), async (req, res, next) => {
  try {
    const node = await prisma.roadmapNode.findUnique({ where: { id: req.params.id } });
    if (!node) return next(createError(404, 'Node not found', 'NOT_FOUND'));

    // Verify ownership
    const roadmap = await prisma.roadmap.findUnique({
      where: { id: node.roadmapId },
      include: { goal: { select: { userId: true } } },
    });
    if (roadmap.goal.userId !== req.userId) {
      return next(createError(403, 'Forbidden', 'FORBIDDEN'));
    }

    const updated = await prisma.roadmapNode.update({
      where: { id: req.params.id },
      data: { status: req.body.status },
    });

    // If mastered, unlock the next sibling (same parent, next orderIndex)
    if (req.body.status === 'mastered' && node.parentNodeId) {
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
        await prisma.roadmapNode.update({
          where: { id: nextSibling.id },
          data: { status: 'active' },
        });
      }
    }

    res.json({ node: updated });
  } catch (err) {
    next(err);
  }
});

export default router;
