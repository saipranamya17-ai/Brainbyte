import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';

// Auth pages
import Login from './pages/Login';
import Register from './pages/Register';

// App pages
import Dashboard from './pages/Dashboard';
import OnboardingGoal from './pages/OnboardingGoal';
import RoadmapView from './pages/RoadmapView';
import ModuleView from './pages/ModuleView';
import ReviewQueue from './pages/ReviewQueue';
import CareerPrep from './pages/CareerPrep';
import MockInterview from './pages/MockInterview';
import InterviewSession from './pages/InterviewSession';
import ResumeBuilder from './pages/ResumeBuilder';

export default function App() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-primary-600/30 flex items-center justify-center animate-pulse-slow">
            <svg className="w-7 h-7 text-primary-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <p className="text-white/40 text-sm">Loading AdaptiSkill…</p>
        </div>
      </div>
    );
  }

  return (
    <Routes>
      {/* Public */}
      <Route path="/login"    element={user ? <Navigate to="/dashboard" replace /> : <Login />} />
      <Route path="/register" element={user ? <Navigate to="/dashboard" replace /> : <Register />} />

      {/* Protected */}
      <Route element={<ProtectedRoute />}>
        <Route element={<Layout />}>
          <Route path="/dashboard"             element={<Dashboard />} />
          <Route path="/goals/new"             element={<OnboardingGoal />} />
          <Route path="/roadmap/:goalId"       element={<RoadmapView />} />
          <Route path="/module/:nodeId"        element={<ModuleView />} />
          <Route path="/review"                element={<ReviewQueue />} />
          <Route path="/career"                element={<CareerPrep />} />
          <Route path="/interview"             element={<MockInterview />} />
          <Route path="/interview/:sessionId"  element={<InterviewSession />} />
          <Route path="/resume"                element={<ResumeBuilder />} />
        </Route>
      </Route>

      {/* Default */}
      <Route path="/" element={<Navigate to={user ? '/dashboard' : '/login'} replace />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
