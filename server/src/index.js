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

// CORS — allow client origin and localhost
app.use(cors({
  origin: true, // Allow requesting origin for easy cross-domain deployment
  credentials: true,
}));

app.use(express.json({ limit: '2mb' }));
app.use(morgan('dev'));

// Root & Health check
app.get('/', (_req, res) => res.json({ status: 'ok', message: 'AdaptiSkill API Server is running 🚀' }));
app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));

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

// Centralized error handler (must be last)
app.use(errorHandler);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 AdaptiSkill server running on http://localhost:${PORT}`);
});
