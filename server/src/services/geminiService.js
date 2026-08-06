/**
 * geminiService.js
 * ─────────────────
 * Central gateway for ALL Gemini API calls.
 * No route handler should import @google/generative-ai directly.
 *
 * Every function:
 *   1. Builds a strict-JSON prompt
 *   2. Calls Gemini
 *   3. Parses + validates the JSON response
 *   4. Retries once with a stricter prompt on parse failure
 *   5. Returns the parsed object or throws
 */

import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const MODEL = 'gemini-1.5-flash';

function getModel() {
  return genAI.getGenerativeModel({
    model: MODEL,
    generationConfig: {
      temperature: 0.7,
      maxOutputTokens: 8192,
    },
  });
}

/**
 * Call Gemini with strict-JSON enforcement.
 * @param {string} prompt
 * @param {number} attempt – 1 or 2
 * @returns {any} parsed JSON
 */
async function callGemini(prompt, attempt = 1) {
  const model = getModel();

  const strictPrefix = attempt === 1
    ? ''
    : '\n\nCRITICAL: Your previous response was not valid JSON. Return ONLY raw JSON with no markdown, no backticks, no commentary, no extra text of any kind. Start your response with { or [.\n\n';

  const fullPrompt = strictPrefix + prompt;

  const result = await model.generateContent(fullPrompt);
  const raw = result.response.text().trim();

  // Strip markdown code fences if model adds them despite instructions
  const cleaned = raw
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/, '')
    .trim();

  try {
    return JSON.parse(cleaned);
  } catch (parseErr) {
    if (attempt < 2) {
      console.warn('[GeminiService] JSON parse failed, retrying with stricter prompt…');
      return callGemini(prompt, 2);
    }
    throw new Error(`Gemini returned non-JSON after 2 attempts: ${cleaned.slice(0, 200)}`);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. Generate Roadmap
// ─────────────────────────────────────────────────────────────────────────────
/**
 * @param {{ title: string, targetRole: string, currentLevel: string, targetTimeframe: string, hoursPerDay: number }} goal
 */
export async function generateRoadmap(goal) {
  const prompt = `
You are an expert career coach and curriculum designer.

A learner has set the following goal:
- Goal: ${goal.title}
- Target Role: ${goal.targetRole}
- Current Level: ${goal.currentLevel}
- Target Timeframe: ${goal.targetTimeframe}
- Available Hours/Day: ${goal.hoursPerDay}

Create a comprehensive, realistic learning roadmap with 3-5 phases. Each phase should have 2-4 milestones, each milestone 2-4 modules, each module 2-3 lessons.

Respond with strict JSON only, matching this schema exactly. No markdown, no commentary, no backticks.

{
  "phases": [
    {
      "title": string,
      "order": number,
      "topicTag": string,
      "milestones": [
        {
          "title": string,
          "order": number,
          "topicTag": string,
          "modules": [
            {
              "title": string,
              "topicTag": string,
              "difficulty": "beginner" | "intermediate" | "advanced",
              "estimatedHours": number,
              "lessons": [
                { "title": string, "topicTag": string }
              ]
            }
          ]
        }
      ]
    }
  ]
}
`.trim();

  return callGemini(prompt);
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. Generate Quiz
// ─────────────────────────────────────────────────────────────────────────────
/**
 * @param {{ title: string, topicTag: string, difficulty: string }} node
 * @param {{ masteryScore: number }} masteryContext
 * @param {boolean} simplified – true when mastery < 0.5
 */
export async function generateQuiz(node, masteryContext, simplified = false) {
  const difficultyNote = simplified
    ? 'The learner is struggling. Start with 2 simpler scaffolding questions with clear analogies, then add 3 standard questions.'
    : `Match the difficulty to "${node.difficulty}" level.`;

  const prompt = `
You are an expert quiz generator for adaptive learning.

Topic: ${node.topicTag}
Module: ${node.title}
Difficulty: ${node.difficulty}
Current mastery score: ${(masteryContext?.masteryScore || 0).toFixed(2)} (0=none, 1=expert)

${difficultyNote}

Generate exactly 5 multiple-choice questions. Each question must have exactly 4 options (A, B, C, D) with exactly one correct answer.

Respond with strict JSON only. No markdown, no commentary.

{
  "questions": [
    {
      "id": string (short unique id like "q1"),
      "question": string,
      "options": { "A": string, "B": string, "C": string, "D": string },
      "correctAnswer": "A" | "B" | "C" | "D",
      "explanation": string
    }
  ]
}
`.trim();

  return callGemini(prompt);
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. Tutor Reply
// ─────────────────────────────────────────────────────────────────────────────
/**
 * @param {{ title: string, topicTag: string }} node
 * @param {Array<{ role: string, content: string }>} history
 * @param {string} question
 * @param {{ masteryScore: number }} masteryContext
 */
export async function tutorReply(node, history, question, masteryContext) {
  const historyText = history
    .slice(-10)
    .map(m => `${m.role === 'user' ? 'Student' : 'Tutor'}: ${m.content}`)
    .join('\n');

  const prompt = `
You are an expert AI tutor helping a student learn "${node.title}" (topic: ${node.topicTag}).
The student's current mastery score is ${(masteryContext?.masteryScore || 0).toFixed(2)}.

Conversation so far:
${historyText}

Student asks: ${question}

Reply helpfully, clearly, and concisely. Use analogies when the student seems confused.
Use markdown formatting for code or structured explanations.

Respond with strict JSON only. No markdown outside the "content" field.

{
  "content": string (your full reply, may contain markdown)
}
`.trim();

  const parsed = await callGemini(prompt);
  return parsed.content || parsed;
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. Extract JD Skills
// ─────────────────────────────────────────────────────────────────────────────
/**
 * @param {string} rawText – job description text (max 4000 chars, clamped)
 */
export async function extractJDSkills(rawText) {
  const clipped = rawText.slice(0, 4000);
  const prompt = `
You are a technical recruiter parsing a job description.

Job Description:
"""
${clipped}
"""

Extract all required and preferred skills, technologies, tools, and qualifications.
Categorize them into: technical_skills, soft_skills, tools, certifications, experience_requirements.

Respond with strict JSON only. No markdown, no commentary.

{
  "technical_skills": string[],
  "soft_skills": string[],
  "tools": string[],
  "certifications": string[],
  "experience_requirements": string[],
  "role": string,
  "seniority": string
}
`.trim();

  return callGemini(prompt);
}

// ─────────────────────────────────────────────────────────────────────────────
// 5. Compute Gap Analysis
// ─────────────────────────────────────────────────────────────────────────────
/**
 * @param {string[]} masteredSkills
 * @param {object} jdSkills – result from extractJDSkills
 */
export async function computeGapAnalysis(masteredSkills, jdSkills) {
  const prompt = `
You are a career coach performing a skills gap analysis.

Candidate's verified mastered skills:
${JSON.stringify(masteredSkills)}

Job requires:
${JSON.stringify(jdSkills)}

Compare the candidate's skills to the job requirements. Be generous in matching — if a candidate knows "JavaScript" and the job requires "Node.js", that's a partial match.

Respond with strict JSON only. No markdown, no commentary.

{
  "matchedSkills": [
    { "skill": string, "source": "technical_skills"|"soft_skills"|"tools"|"certifications"|"experience_requirements", "matchStrength": "exact"|"partial" }
  ],
  "missingSkills": [
    { "skill": string, "source": string, "priority": "high"|"medium"|"low", "suggestedLearningPath": string }
  ],
  "overallMatchPercent": number,
  "summary": string
}
`.trim();

  return callGemini(prompt);
}

// ─────────────────────────────────────────────────────────────────────────────
// 6. Next Interview Question
// ─────────────────────────────────────────────────────────────────────────────
/**
 * @param {{ targetRole: string, mode: string }} session
 * @param {Array<{ question: string, answer: string, score: number }>} turns
 * @param {string|null} lastAnswer
 * @param {number|null} lastScore
 */
export async function nextInterviewQuestion(session, turns, lastAnswer, lastScore) {
  const turnsSummary = turns
    .slice(-5)
    .map((t, i) => `Q${i + 1}: ${t.question}\nA: ${t.answer || '(no answer)'}\nScore: ${t.score ?? 'N/A'}`)
    .join('\n---\n');

  const adaptNote = lastScore == null
    ? 'This is the first question. Start with a warm-up level question.'
    : lastScore >= 0.8
      ? 'The candidate answered well. Escalate difficulty or move to a new topic.'
      : lastScore >= 0.5
        ? 'The candidate gave a partial answer. Ask a probing follow-up on the same concept.'
        : 'The candidate struggled. Ask a simpler clarifying question on the same concept.';

  const prompt = `
You are an expert technical interviewer for ${session.targetRole} roles.
Interview mode: ${session.mode} (dsa=Data Structures & Algorithms, system_design=System Design, behavioral=Behavioral/HR)

Previous turns:
${turnsSummary || 'None yet'}

${adaptNote}

Generate the next interview question appropriate for the mode and difficulty level.

Respond with strict JSON only. No markdown, no commentary.

{
  "question": string,
  "difficulty": "easy"|"medium"|"hard",
  "topic": string,
  "hints": string[]
}
`.trim();

  return callGemini(prompt);
}

// ─────────────────────────────────────────────────────────────────────────────
// 7. Score Interview Answer
// ─────────────────────────────────────────────────────────────────────────────
/**
 * @param {string} question
 * @param {string} answer
 * @param {string} mode
 * @param {string} targetRole
 */
export async function scoreInterviewAnswer(question, answer, mode, targetRole) {
  const prompt = `
You are an expert technical interviewer evaluating a candidate's answer.

Role: ${targetRole}
Mode: ${mode}
Question: ${question}
Candidate's Answer: ${answer}

Evaluate the answer on these dimensions:
- Correctness (0-1): Is the answer technically correct?
- Completeness (0-1): Does it cover all key points?
- Clarity (0-1): Is it well-explained?
- Depth (0-1): Does it show deep understanding?

Overall score = weighted average.

Respond with strict JSON only. No markdown, no commentary.

{
  "score": number (0 to 1),
  "correctness": number,
  "completeness": number,
  "clarity": number,
  "depth": number,
  "feedback": string (2-4 sentences of constructive feedback),
  "idealAnswer": string (a model answer outline),
  "strengths": string[],
  "improvements": string[]
}
`.trim();

  return callGemini(prompt);
}

// ─────────────────────────────────────────────────────────────────────────────
// 8. Generate Resume
// ─────────────────────────────────────────────────────────────────────────────
/**
 * @param {{ masteredTopics: string[], experiences: object[], interviewScores: number[], userName: string }} userActivity
 * @param {string} targetRole
 */
export async function generateResume(userActivity, targetRole) {
  const prompt = `
You are a professional resume writer and career coach.

Candidate: ${userActivity.userName}
Target Role: ${targetRole}
Mastered Topics/Skills: ${userActivity.masteredTopics.join(', ')}
Average Interview Score: ${userActivity.avgInterviewScore?.toFixed(2) ?? 'N/A'}
Experiences: ${JSON.stringify(userActivity.experiences?.slice(0, 10) || [])}

Generate a professional, ATS-optimized resume tailored to the ${targetRole} role.
Use the mastered skills as verified competencies. 

Respond with strict JSON only. No markdown, no commentary.

{
  "summary": string (2-3 sentence professional summary),
  "skills": {
    "technical": string[],
    "soft": string[]
  },
  "education": [
    { "degree": string, "institution": string, "year": string, "gpa": string }
  ],
  "projects": [
    { "name": string, "description": string, "technologies": string[], "highlights": string[] }
  ],
  "experience": [
    { "title": string, "company": string, "duration": string, "bullets": string[] }
  ],
  "certifications": string[],
  "targetRoleTips": string[]
}
`.trim();

  return callGemini(prompt);
}

// ─────────────────────────────────────────────────────────────────────────────
// 9. Generate Module Content
// ─────────────────────────────────────────────────────────────────────────────
/**
 * Generate lesson content for a roadmap node (called lazily on first open).
 * @param {{ title: string, topicTag: string, difficulty: string }} node
 */
export async function generateModuleContent(node) {
  const prompt = `
You are an expert educator creating a micro-lesson.

Topic: ${node.topicTag}
Lesson title: ${node.title}
Difficulty: ${node.difficulty}

Write a comprehensive but concise lesson that covers:
1. Core concept explanation
2. Real-world analogy
3. Key points (bullet list)
4. A short practical example or code snippet

Respond with strict JSON only. No markdown outside the content fields.

{
  "introduction": string,
  "analogy": string,
  "keyPoints": string[],
  "example": string (may contain code with markdown code fences),
  "summary": string
}
`.trim();

  return callGemini(prompt);
}
