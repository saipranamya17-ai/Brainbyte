import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../lib/api';
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer,
  AreaChart, Area, CartesianGrid
} from 'recharts';

function StatCard({ label, value, sub, color = 'primary', icon }) {
  return (
    <div className="glass rounded-2xl p-5">
      <div className="flex items-start justify-between">
        <div>
          <div className="text-sm text-white/50 mb-1">{label}</div>
          <div className={`text-3xl font-bold ${
            color === 'primary' ? 'text-primary-400' :
            color === 'accent'  ? 'text-accent-400'  :
            color === 'yellow'  ? 'text-yellow-400'  :
            color === 'red'     ? 'text-red-400'     : 'text-white'
          }`}>{value}</div>
          {sub && <div className="text-xs text-white/30 mt-1">{sub}</div>}
        </div>
        <div className="text-2xl">{icon}</div>
      </div>
    </div>
  );
}

function MasteryHeatmap({ allMastery }) {
  if (!allMastery?.length) return null;
  const top = allMastery.slice(0, 20);

  return (
    <div className="glass rounded-2xl p-5">
      <h3 className="font-semibold text-white mb-4">Topic Mastery Heatmap</h3>
      <div className="grid grid-cols-2 gap-2">
        {top.map(tm => {
          const pct = Math.round(tm.masteryScore * 100);
          const color = pct >= 80 ? '#10b981' : pct >= 60 ? '#f59e0b' : pct >= 30 ? '#6172f3' : '#ef4444';
          return (
            <div key={tm.id} className="flex items-center gap-2 p-2 rounded-lg bg-white/5">
              <div className="w-2 h-8 rounded-full flex-shrink-0" style={{ backgroundColor: color, opacity: 0.4 + pct / 200 }} />
              <div className="flex-1 min-w-0">
                <div className="text-xs font-medium text-white/70 truncate">
                  {tm.topicTag.replace(/_/g, ' ')}
                </div>
                <div className="h-1 bg-white/10 rounded-full mt-1">
                  <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: color }} />
                </div>
              </div>
              <div className="text-xs font-bold" style={{ color }}>{pct}%</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="glass rounded-xl px-3 py-2 text-xs">
      <div className="text-white/60 mb-1">{label}</div>
      {payload.map((p, i) => (
        <div key={i} className="text-white font-medium">{p.name}: {p.value}{p.unit || ''}</div>
      ))}
    </div>
  );
};

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    api.get('/analytics/dashboard')
      .then(r => setData(r.data))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-4 gap-4">
          {[1,2,3,4].map(i => <div key={i} className="skeleton h-28" />)}
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="skeleton h-64" />
          <div className="skeleton h-64" />
        </div>
      </div>
    );
  }

  if (!data) return <div className="text-white/50 text-center py-20">Failed to load dashboard.</div>;

  const {
    careerReadinessScore, roadmapCompletion, masteredNodes, totalNodes,
    quizTrend, weakTopics, allMastery, interviewTrend, dueReviewCount,
    avgInterviewScore, avgGapMatchPercent, lastSession,
  } = data;

  const readinessScore = Math.round((careerReadinessScore || 0) * 100);
  const completionPct = Math.round((roadmapCompletion || 0) * 100);

  // Chart data
  const quizChartData = (quizTrend || []).slice(-15).map((a, i) => ({
    idx: i + 1,
    score: Math.round(a.score * 100),
    topic: a.topic,
  }));

  const interviewChartData = (interviewTrend || []).slice(-10).map((s, i) => ({
    idx: i + 1,
    score: Math.round(s.avgScore * 100),
    mode: s.mode,
  }));

  const hasNoGoal = totalNodes === 0;

  return (
    <div className="animate-fade-in space-y-6">
      {/* Welcome + Career Readiness */}
      <div className="glass-strong rounded-2xl p-6 flex items-center gap-6">
        {/* Big score ring (CSS-only) */}
        <div className="relative w-28 h-28 flex-shrink-0">
          <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
            <circle cx="50" cy="50" r="40" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="10" />
            <circle
              cx="50" cy="50" r="40" fill="none"
              stroke="url(#readinessGrad)"
              strokeWidth="10"
              strokeLinecap="round"
              strokeDasharray={`${2 * Math.PI * 40}`}
              strokeDashoffset={`${2 * Math.PI * 40 * (1 - readinessScore / 100)}`}
              style={{ transition: 'stroke-dashoffset 1s ease' }}
            />
            <defs>
              <linearGradient id="readinessGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#6172f3" />
                <stop offset="100%" stopColor="#10b981" />
              </linearGradient>
            </defs>
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <div className="text-2xl font-bold gradient-text">{readinessScore}%</div>
            <div className="text-xs text-white/40">Ready</div>
          </div>
        </div>

        <div className="flex-1">
          <div className="text-xl font-bold text-white">Career Readiness Score</div>
          <p className="text-white/50 text-sm mt-1">Composite of roadmap progress, gap analysis, and interview performance</p>
          <div className="grid grid-cols-3 gap-4 mt-4">
            <div>
              <div className="text-xs text-white/40 mb-0.5">Roadmap</div>
              <div className="text-sm font-semibold text-primary-400">{completionPct}%</div>
            </div>
            <div>
              <div className="text-xs text-white/40 mb-0.5">Gap Match</div>
              <div className="text-sm font-semibold text-yellow-400">{Math.round((avgGapMatchPercent || 0) * 100)}%</div>
            </div>
            <div>
              <div className="text-xs text-white/40 mb-0.5">Interview</div>
              <div className="text-sm font-semibold text-accent-400">{Math.round((avgInterviewScore || 0) * 100)}%</div>
            </div>
          </div>
        </div>

        {hasNoGoal && (
          <Link to="/goals/new" className="btn-primary whitespace-nowrap">
            🎯 Set Your First Goal
          </Link>
        )}
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon="📚" label="Modules Mastered" value={`${masteredNodes}/${totalNodes}`} sub={`${completionPct}% complete`} color="primary" />
        <StatCard icon="🔄" label="Reviews Due" value={dueReviewCount || 0} sub="topics need review" color={dueReviewCount > 0 ? 'red' : 'accent'} />
        <StatCard icon="🎤" label="Avg Interview Score" value={`${Math.round((avgInterviewScore || 0) * 100)}%`} sub={`${(interviewTrend || []).length} sessions`} color="accent" />
        <StatCard icon="💼" label="Skills Gap Match" value={`${Math.round((avgGapMatchPercent || 0) * 100)}%`} sub="vs job requirements" color="yellow" />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Quiz trend */}
        <div className="glass rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-white">Quiz Score Trend</h3>
            <span className="text-xs text-white/30">Last 15 attempts</span>
          </div>
          {quizChartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={quizChartData}>
                <defs>
                  <linearGradient id="quizGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6172f3" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#6172f3" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="idx" stroke="rgba(255,255,255,0.2)" tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 11 }} />
                <YAxis domain={[0, 100]} stroke="rgba(255,255,255,0.2)" tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 11 }} unit="%" />
                <Tooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="score" name="Score" unit="%" stroke="#6172f3" fill="url(#quizGrad)" strokeWidth={2} dot={{ fill: '#6172f3', r: 3 }} />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-48 flex items-center justify-center text-white/30 text-sm">
              No quiz data yet. <Link to="/roadmap" className="text-primary-400 ml-1">Start a module →</Link>
            </div>
          )}
        </div>

        {/* Interview trend */}
        <div className="glass rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-white">Interview Performance</h3>
            <Link to="/interview" className="text-xs text-primary-400 hover:text-primary-300">+ New Session</Link>
          </div>
          {interviewChartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={interviewChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="idx" stroke="rgba(255,255,255,0.2)" tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 11 }} />
                <YAxis domain={[0, 100]} stroke="rgba(255,255,255,0.2)" tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 11 }} unit="%" />
                <Tooltip content={<CustomTooltip />} />
                <Line type="monotone" dataKey="score" name="Score" unit="%" stroke="#10b981" strokeWidth={2} dot={{ fill: '#10b981', r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-48 flex items-center justify-center text-white/30 text-sm">
              No interviews yet. <Link to="/interview" className="text-primary-400 ml-1">Start now →</Link>
            </div>
          )}
        </div>
      </div>

      {/* Bottom row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Mastery heatmap */}
        <MasteryHeatmap allMastery={allMastery} />

        {/* Weak topics + quick actions */}
        <div className="space-y-4">
          {/* Weak topics */}
          {weakTopics?.length > 0 && (
            <div className="glass rounded-2xl p-5">
              <h3 className="font-semibold text-white mb-3">⚠️ Weak Topics</h3>
              <div className="space-y-2">
                {weakTopics.slice(0, 5).map(tm => (
                  <div key={tm.id} className="flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="text-sm text-white/70 truncate">{tm.topicTag.replace(/_/g, ' ')}</div>
                      <div className="h-1 bg-white/10 rounded-full mt-1">
                        <div className="h-full bg-red-400/60 rounded-full" style={{ width: `${tm.masteryScore * 100}%` }} />
                      </div>
                    </div>
                    <div className="text-xs font-bold text-red-400">{Math.round(tm.masteryScore * 100)}%</div>
                  </div>
                ))}
              </div>
              {dueReviewCount > 0 && (
                <Link to="/review" className="btn-primary w-full justify-center mt-4 text-sm">
                  🔄 Review {dueReviewCount} Due Topic{dueReviewCount !== 1 ? 's' : ''}
                </Link>
              )}
            </div>
          )}

          {/* Quick actions */}
          <div className="glass rounded-2xl p-5">
            <h3 className="font-semibold text-white mb-3">Quick Actions</h3>
            <div className="space-y-2">
              {[
                { to: '/roadmap',  icon: '🗺️', label: 'Continue Roadmap' },
                { to: '/review',   icon: '🔄', label: `Review Queue${dueReviewCount > 0 ? ` (${dueReviewCount} due)` : ''}` },
                { to: '/career',   icon: '💼', label: 'Analyze Job Description' },
                { to: '/interview',icon: '🎤', label: 'Practice Interview' },
                { to: '/resume',   icon: '📄', label: 'Generate Resume' },
              ].map(a => (
                <Link key={a.to} to={a.to}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/10 transition-all text-sm text-white/60 hover:text-white">
                  <span>{a.icon}</span>
                  <span>{a.label}</span>
                  <svg className="w-3 h-3 ml-auto text-white/20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
