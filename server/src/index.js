import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import morgan from 'morgan';

import authRoutes from './routes/auth.js';
import goalRoutes from './routes/goals.js';
import quizRoutes from './routes/quiz.js';
import tutorRoutes from './routes/tutor.js';
import careerRoutes from './routes/career.js';
import interviewRoutes from './routes/interview.js';
import resumeRoutes from './routes/resume.js';
import analyticsRoutes from './routes/analytics.js';
import profileRoutes from './routes/profile.js';
import { errorHandler } from './middleware/errorHandler.js';

const app = express();

// CORS — lock to client origin
app.use(cors({
  origin: process.env.CLIENT_ORIGIN || 'http://localhost:5173',
  credentials: true,
}));

app.use(express.json({ limit: '2mb' }));
app.use(morgan('dev'));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api', goalRoutes);
app.use('/api', quizRoutes);
app.use('/api/tutor', tutorRoutes);
app.use('/api/career', careerRoutes);
app.use('/api/interview', interviewRoutes);
app.use('/api/resume', resumeRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/profile', profileRoutes);

// Health check
app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));

// Centralized error handler (must be last)
app.use(errorHandler);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 AdaptiSkill server running on http://localhost:${PORT}`);
});
