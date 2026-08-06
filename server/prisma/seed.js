/**
 * prisma/seed.js
 * ─────────────────
 * Creates a demo user with a partially-completed roadmap,
 * historical quiz attempts, a gap analysis, and an interview session
 * so the dashboard charts are populated immediately.
 */

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // ── Demo User ───────────────────────────────────────────────────────────────
  const existingUser = await prisma.user.findUnique({ where: { email: 'demo@adaptiskill.com' } });
  if (existingUser) {
    console.log('ℹ️  Demo user already exists, skipping seed.');
    return;
  }

  const passwordHash = await bcrypt.hash('Demo1234!', 12);
  const user = await prisma.user.create({
    data: {
      name: 'Alex Demo',
      email: 'demo@adaptiskill.com',
      passwordHash,
    },
  });
  console.log('✅ Created demo user:', user.email);

  // ── Goal ───────────────────────────────────────────────────────────────────
  const goal = await prisma.goal.create({
    data: {
      userId: user.id,
      title: 'Get a Software Engineer job at Google',
      targetRole: 'Software Engineer',
      currentLevel: '1st year B.Tech CSE student',
      targetTimeframe: '2 years',
      hoursPerDay: 3,
    },
  });

  // ── Roadmap ────────────────────────────────────────────────────────────────
  const roadmap = await prisma.roadmap.create({ data: { goalId: goal.id } });

  // Phase 1: CS Fundamentals
  const phase1 = await prisma.roadmapNode.create({
    data: {
      roadmapId: roadmap.id, parentNodeId: null, type: 'phase',
      title: 'CS Fundamentals', topicTag: 'cs_fundamentals',
      difficulty: 'beginner', estimatedHours: 0, orderIndex: 0, status: 'active',
    },
  });

  // Milestone 1.1: Data Structures
  const m1 = await prisma.roadmapNode.create({
    data: {
      roadmapId: roadmap.id, parentNodeId: phase1.id, type: 'milestone',
      title: 'Data Structures', topicTag: 'data_structures',
      difficulty: 'beginner', estimatedHours: 0, orderIndex: 0, status: 'active',
    },
  });

  const modules1 = [
    { title: 'Arrays & Strings', topicTag: 'arrays', difficulty: 'beginner', estimatedHours: 3, status: 'mastered' },
    { title: 'Linked Lists', topicTag: 'linked_lists', difficulty: 'beginner', estimatedHours: 4, status: 'mastered' },
    { title: 'Stacks & Queues', topicTag: 'stacks_queues', difficulty: 'beginner', estimatedHours: 3, status: 'mastered' },
    { title: 'Trees & Binary Search Trees', topicTag: 'trees', difficulty: 'intermediate', estimatedHours: 6, status: 'active' },
    { title: 'Graphs', topicTag: 'graphs', difficulty: 'intermediate', estimatedHours: 8, status: 'locked' },
  ];

  const createdModules = [];
  for (let i = 0; i < modules1.length; i++) {
    const mod = await prisma.roadmapNode.create({
      data: {
        roadmapId: roadmap.id, parentNodeId: m1.id, type: 'module',
        ...modules1[i], orderIndex: i,
      },
    });
    createdModules.push(mod);

    // Add lessons for each module
    for (let j = 0; j < 2; j++) {
      await prisma.roadmapNode.create({
        data: {
          roadmapId: roadmap.id, parentNodeId: mod.id, type: 'lesson',
          title: `${modules1[i].title} — Lesson ${j + 1}`,
          topicTag: modules1[i].topicTag,
          difficulty: modules1[i].difficulty,
          estimatedHours: 0.5, orderIndex: j,
          status: modules1[i].status === 'mastered' ? 'mastered' : 'locked',
        },
      });
    }
  }

  // Milestone 1.2: Algorithms
  const m2 = await prisma.roadmapNode.create({
    data: {
      roadmapId: roadmap.id, parentNodeId: phase1.id, type: 'milestone',
      title: 'Algorithms', topicTag: 'algorithms',
      difficulty: 'intermediate', estimatedHours: 0, orderIndex: 1, status: 'locked',
    },
  });

  const algoModules = [
    { title: 'Sorting Algorithms', topicTag: 'sorting', difficulty: 'beginner', estimatedHours: 4, status: 'locked' },
    { title: 'Dynamic Programming', topicTag: 'dynamic_programming', difficulty: 'advanced', estimatedHours: 12, status: 'locked' },
    { title: 'Graph Algorithms', topicTag: 'graph_algorithms', difficulty: 'advanced', estimatedHours: 10, status: 'locked' },
  ];
  for (let i = 0; i < algoModules.length; i++) {
    await prisma.roadmapNode.create({
      data: {
        roadmapId: roadmap.id, parentNodeId: m2.id, type: 'module',
        ...algoModules[i], orderIndex: i,
      },
    });
  }

  // Phase 2: System Design
  const phase2 = await prisma.roadmapNode.create({
    data: {
      roadmapId: roadmap.id, parentNodeId: null, type: 'phase',
      title: 'System Design', topicTag: 'system_design',
      difficulty: 'intermediate', estimatedHours: 0, orderIndex: 1, status: 'locked',
    },
  });
  const sdMilestone = await prisma.roadmapNode.create({
    data: {
      roadmapId: roadmap.id, parentNodeId: phase2.id, type: 'milestone',
      title: 'Distributed Systems Basics', topicTag: 'distributed_systems',
      difficulty: 'intermediate', estimatedHours: 0, orderIndex: 0, status: 'locked',
    },
  });
  await prisma.roadmapNode.create({
    data: {
      roadmapId: roadmap.id, parentNodeId: sdMilestone.id, type: 'module',
      title: 'Scalability Fundamentals', topicTag: 'scalability',
      difficulty: 'intermediate', estimatedHours: 6, orderIndex: 0, status: 'locked',
    },
  });

  console.log('✅ Created roadmap with', 2, 'phases');

  // ── Topic Mastery ──────────────────────────────────────────────────────────
  const masteryData = [
    { topicTag: 'arrays', masteryScore: 0.95, reviewCount: 4 },
    { topicTag: 'linked_lists', masteryScore: 0.88, reviewCount: 3 },
    { topicTag: 'stacks_queues', masteryScore: 0.82, reviewCount: 2 },
    { topicTag: 'trees', masteryScore: 0.45, reviewCount: 1 },
    { topicTag: 'sorting', masteryScore: 0.30, reviewCount: 1 },
  ];

  const now = new Date();
  for (const m of masteryData) {
    const nextReview = new Date(now);
    nextReview.setDate(nextReview.getDate() - 1); // make some due
    await prisma.topicMastery.create({
      data: {
        userId: user.id, ...m,
        lastReviewedAt: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
        nextReviewAt: nextReview,
      },
    });
  }
  console.log('✅ Created topic mastery records');

  // ── Quiz Attempts (historical, spread over past weeks) ─────────────────────
  const quizHistory = [
    { topicTag: 'arrays', score: 0.4, daysAgo: 28 },
    { topicTag: 'arrays', score: 0.6, daysAgo: 21 },
    { topicTag: 'arrays', score: 0.8, daysAgo: 14 },
    { topicTag: 'arrays', score: 0.95, daysAgo: 7 },
    { topicTag: 'linked_lists', score: 0.5, daysAgo: 18 },
    { topicTag: 'linked_lists', score: 0.75, daysAgo: 11 },
    { topicTag: 'linked_lists', score: 0.88, daysAgo: 5 },
    { topicTag: 'stacks_queues', score: 0.6, daysAgo: 10 },
    { topicTag: 'stacks_queues', score: 0.82, daysAgo: 3 },
    { topicTag: 'trees', score: 0.3, daysAgo: 2 },
    { topicTag: 'sorting', score: 0.2, daysAgo: 1 },
  ];

  for (const h of quizHistory) {
    const node = createdModules.find(m => m.topicTag === h.topicTag) || createdModules[0];
    const attemptDate = new Date(now.getTime() - h.daysAgo * 24 * 60 * 60 * 1000);
    await prisma.quizAttempt.create({
      data: {
        userId: user.id,
        roadmapNodeId: node.id,
        questionsJson: [{ id: 'q1', question: 'Sample question' }],
        answersJson: { q1: 'A' },
        score: h.score,
        timeSpentSeconds: 120 + Math.floor(Math.random() * 180),
        attemptedAt: attemptDate,
      },
    });
  }
  console.log('✅ Created', quizHistory.length, 'quiz attempts');

  // ── Job Description + Gap Analysis ────────────────────────────────────────
  const jd = await prisma.jobDescription.create({
    data: {
      userId: user.id,
      rawText: `
        Software Engineer, Google
        Requirements:
        - BS/MS in Computer Science or equivalent
        - Strong knowledge of data structures and algorithms
        - Experience with Python, Java, or C++
        - Familiarity with distributed systems
        - Problem-solving skills
        - Communication and collaboration skills
      `,
      extractedSkillsJson: {
        technical_skills: ['data structures', 'algorithms', 'python', 'java', 'c++'],
        soft_skills: ['problem-solving', 'communication', 'collaboration'],
        tools: [],
        certifications: [],
        experience_requirements: ['BS/MS CS or equivalent'],
        role: 'Software Engineer',
        seniority: 'entry-level',
      },
    },
  });

  await prisma.gapAnalysis.create({
    data: {
      userId: user.id,
      jobDescriptionId: jd.id,
      matchedSkillsJson: [
        { skill: 'data structures', source: 'technical_skills', matchStrength: 'exact' },
        { skill: 'algorithms', source: 'technical_skills', matchStrength: 'partial' },
        { skill: 'problem-solving', source: 'soft_skills', matchStrength: 'exact' },
      ],
      missingSkillsJson: [
        { skill: 'python', source: 'technical_skills', priority: 'high', suggestedLearningPath: 'Python Fundamentals module' },
        { skill: 'distributed systems', source: 'technical_skills', priority: 'medium', suggestedLearningPath: 'System Design phase' },
        { skill: 'java', source: 'technical_skills', priority: 'low', suggestedLearningPath: 'OOP in Java module' },
      ],
    },
  });
  console.log('✅ Created gap analysis');

  // ── Interview Session ──────────────────────────────────────────────────────
  const session = await prisma.interviewSession.create({
    data: { userId: user.id, targetRole: 'Software Engineer', mode: 'dsa' },
  });

  const interviewTurns = [
    { question: 'Reverse a linked list in O(n) time.', answer: 'Use three pointers: prev, current, next...', score: 0.85, feedback: 'Good explanation of the iterative approach.' },
    { question: 'Find the time complexity of binary search.', answer: 'O(log n) because we halve the search space.', score: 0.95, feedback: 'Excellent! Also mentioned space complexity correctly.' },
    { question: 'Explain dynamic programming with an example.', answer: 'DP breaks problems into overlapping subproblems...', score: 0.65, feedback: 'Good start, but could give a more concrete example.' },
  ];

  for (let i = 0; i < interviewTurns.length; i++) {
    await prisma.interviewTurn.create({
      data: { sessionId: session.id, orderIndex: i, ...interviewTurns[i], aiFeedback: interviewTurns[i].feedback },
    });
  }
  console.log('✅ Created interview session with', interviewTurns.length, 'turns');

  // ── Experience ─────────────────────────────────────────────────────────────
  await prisma.experience.create({
    data: {
      userId: user.id,
      type: 'project',
      title: 'Student Grade Management System',
      description: 'Built a full-stack web application for managing student grades using React and Node.js.',
      startDate: '2025-06',
      endDate: '2025-08',
      skills: ['React', 'Node.js', 'PostgreSQL', 'REST API'],
    },
  });
  console.log('✅ Created experience entry');

  console.log('\n🎉 Seed complete!');
  console.log('Demo user: demo@adaptiskill.com / Demo1234!');
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
