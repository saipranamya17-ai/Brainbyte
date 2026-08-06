import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../lib/api';
import toast from 'react-hot-toast';

const MODES = [
  { id: 'dsa',           label: 'Data Structures & Algorithms', icon: '🧮', desc: 'LeetCode-style problems, complexity analysis' },
  { id: 'system_design', label: 'System Design',                icon: '🏗️', desc: 'Scalability, architecture, distributed systems' },
  { id: 'behavioral',    label: 'Behavioral / HR',              icon: '🤝', desc: 'STAR-method, leadership, situational questions' },
];

export default function MockInterview() {
  const navigate = useNavigate();
  const [targetRole, setTargetRole] = useState('Software Engineer');
  const [mode, setMode] = useState('dsa');
  const [starting, setStarting] = useState(false);
  const [sessions, setSessions] = useState([]);
  const [sessionsLoading, setSessionsLoading] = useState(true);

  useEffect(() => {
    api.get('/interview')
      .then(r => setSessions(r.data.sessions || []))
      .finally(() => setSessionsLoading(false));
  }, []);

  const startSession = async () => {
    if (!targetRole.trim()) { toast.error('Please enter a target role'); return; }
    setStarting(true);
    try {
      const res = await api.post('/interview/start', { targetRole, mode });
      navigate(`/interview/${res.data.session.id}`);
    } catch (err) {
      toast.error(err.response?.data?.error?.message || 'Failed to start interview');
    } finally {
      setStarting(false);
    }
  };

  return (
    <div className="animate-fade-in max-w-3xl">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-white">Mock Interview</h2>
        <p className="text-white/50 mt-1">AI-adaptive interviews that escalate or simplify based on your answers</p>
      </div>

      {/* Start new session */}
      <div className="glass p-6 mb-8">
        <h3 className="font-semibold text-white mb-5">Start New Session</h3>

        <div className="mb-5">
          <label className="label" htmlFor="targetRole">Target Role</label>
          <input
            id="targetRole"
            type="text"
            className="input"
            value={targetRole}
            onChange={e => setTargetRole(e.target.value)}
            placeholder="e.g. Software Engineer, Data Scientist"
          />
        </div>

        <div className="mb-6">
          <label className="label">Interview Mode</label>
          <div className="grid grid-cols-1 gap-3">
            {MODES.map(m => (
              <button
                key={m.id}
                onClick={() => setMode(m.id)}
                className={`flex items-center gap-4 p-4 rounded-xl border text-left transition-all duration-200 ${
                  mode === m.id
                    ? 'bg-primary-500/20 border-primary-500/50 shadow-lg shadow-primary-500/10'
                    : 'bg-white/5 border-white/10 hover:bg-white/10'
                }`}
              >
                <span className="text-2xl">{m.icon}</span>
                <div>
                  <div className={`font-medium text-sm ${mode === m.id ? 'text-primary-300' : 'text-white'}`}>{m.label}</div>
                  <div className="text-xs text-white/40 mt-0.5">{m.desc}</div>
                </div>
                {mode === m.id && (
                  <div className="ml-auto w-4 h-4 rounded-full bg-primary-500 flex items-center justify-center">
                    <div className="w-2 h-2 rounded-full bg-white" />
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>

        <button onClick={startSession} disabled={starting} className="btn-primary w-full justify-center py-3">
          {starting ? (
            <span className="flex items-center gap-2">
              <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
              </svg>
              Starting Interview…
            </span>
          ) : '🎤 Start Interview'}
        </button>
      </div>

      {/* Past sessions */}
      <div>
        <h3 className="font-semibold text-white mb-4">Past Sessions</h3>
        {sessionsLoading ? (
          <div className="space-y-3">{[1,2].map(i => <div key={i} className="skeleton h-20" />)}</div>
        ) : sessions.length === 0 ? (
          <div className="text-center py-10 text-white/30 text-sm">No sessions yet. Start your first interview!</div>
        ) : (
          <div className="space-y-3">
            {sessions.map(s => {
              const scoreColor = s.avgScore >= 0.8 ? 'text-accent-400' : s.avgScore >= 0.6 ? 'text-yellow-400' : 'text-red-400';
              return (
                <div key={s.id}
                  className="glass rounded-xl p-4 flex items-center gap-4 cursor-pointer hover:border-primary-500/30 transition-all"
                  onClick={() => navigate(`/interview/${s.id}`)}>
                  <span className="text-2xl">{MODES.find(m => m.id === s.mode)?.icon || '🎤'}</span>
                  <div className="flex-1">
                    <div className="font-medium text-white text-sm">{s.targetRole}</div>
                    <div className="text-xs text-white/40 mt-0.5">
                      {MODES.find(m => m.id === s.mode)?.label} • {new Date(s.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                  {s.avgScore != null && (
                    <div className={`text-xl font-bold ${scoreColor}`}>
                      {Math.round(s.avgScore * 100)}%
                    </div>
                  )}
                  <div className="text-xs text-white/30">{s.questionCount} Qs</div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
