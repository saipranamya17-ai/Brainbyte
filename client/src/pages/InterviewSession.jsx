import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../lib/api';
import toast from 'react-hot-toast';
import ReactMarkdown from 'react-markdown';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

export default function InterviewSession() {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const [session, setSession] = useState(null);
  const [turns, setTurns] = useState([]);
  const [currentTurn, setCurrentTurn] = useState(null);
  const [answer, setAnswer] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const [showSummary, setShowSummary] = useState(false);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const answerRef = useRef(null);
  const bottomRef = useRef(null);

  useEffect(() => {
    api.get(`/interview/${sessionId}/summary`)
      .then(r => {
        setSession(r.data.session);
        setTurns(r.data.turns || []);
        // Current = last turn without answer
        const pending = (r.data.turns || []).findLast?.(t => !t.answer)
          || (r.data.turns || []).slice().reverse().find(t => !t.answer);
        setCurrentTurn(pending || null);
        setSummary(r.data);
      })
      .finally(() => setLoading(false));
  }, [sessionId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [turns, feedback]);

  const submitAnswer = async () => {
    if (!answer.trim()) { toast.error('Please write your answer'); return; }
    if (!currentTurn) return;
    setSubmitting(true);
    try {
      const res = await api.post(`/interview/${sessionId}/turn`, { answer });
      const { feedback: fb, nextTurn } = res.data;

      // Update turns
      setTurns(prev => prev.map(t =>
        t.id === currentTurn.id
          ? { ...t, answer, aiFeedback: fb.feedback, score: fb.score }
          : t
      ).concat([nextTurn]));

      setFeedback({ ...fb, question: currentTurn.question });
      setCurrentTurn(nextTurn);
      setAnswer('');
    } catch (err) {
      toast.error(err.response?.data?.error?.message || 'Submission failed');
    } finally {
      setSubmitting(false);
    }
  };

  const endSession = async () => {
    try {
      const res = await api.get(`/interview/${sessionId}/summary`);
      setSummary(res.data);
      setShowSummary(true);
    } catch { setShowSummary(true); }
  };

  if (loading) {
    return <div className="space-y-4">{[1,2].map(i => <div key={i} className="skeleton h-32" />)}</div>;
  }

  if (showSummary && summary) {
    const scored = (summary.turns || []).filter(t => t.score != null);
    const trendData = scored.map((t, i) => ({ q: `Q${i+1}`, score: Math.round(t.score * 100) }));

    return (
      <div className="max-w-2xl animate-fade-in">
        <div className="text-center mb-8">
          <div className="text-5xl mb-3">🏆</div>
          <h2 className="text-2xl font-bold text-white">Interview Complete!</h2>
          <div className="text-4xl font-bold mt-4 gradient-text">
            {summary.avgScore != null ? Math.round(summary.avgScore * 100) : 0}%
          </div>
          <div className="text-white/50 text-sm mt-1">Overall Score</div>
        </div>

        {trendData.length > 1 && (
          <div className="glass rounded-xl p-5 mb-5">
            <div className="text-sm font-medium text-white/60 mb-3">Score per Question</div>
            <ResponsiveContainer width="100%" height={120}>
              <LineChart data={trendData}>
                <XAxis dataKey="q" stroke="#ffffff30" tick={{ fill: '#ffffff60', fontSize: 11 }} />
                <YAxis domain={[0, 100]} stroke="#ffffff30" tick={{ fill: '#ffffff60', fontSize: 11 }} />
                <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8 }} />
                <Line type="monotone" dataKey="score" stroke="#6172f3" strokeWidth={2} dot={{ fill: '#6172f3', r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Turn summary */}
        <div className="space-y-3 mb-6">
          {(summary.turns || []).filter(t => t.answer).map((t, i) => (
            <div key={t.id} className="glass rounded-xl p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="text-sm text-white/70 font-medium flex-1">Q{i+1}: {t.question.slice(0, 100)}…</div>
                {t.score != null && (
                  <div className={`text-sm font-bold flex-shrink-0 ${t.score >= 0.8 ? 'text-accent-400' : t.score >= 0.6 ? 'text-yellow-400' : 'text-red-400'}`}>
                    {Math.round(t.score * 100)}%
                  </div>
                )}
              </div>
              {t.aiFeedback && (
                <p className="text-xs text-white/40 mt-2">{t.aiFeedback}</p>
              )}
            </div>
          ))}
        </div>

        <div className="flex gap-3">
          <button onClick={() => navigate('/interview')} className="btn-secondary flex-1">New Session</button>
          <button onClick={() => navigate('/dashboard')} className="btn-primary flex-1">Back to Dashboard</button>
        </div>
      </div>
    );
  }

  const answered = turns.filter(t => t.answer);

  return (
    <div className="max-w-3xl animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-white">{session?.targetRole} Interview</h2>
          <div className="text-sm text-white/40 capitalize">{session?.mode?.replace('_', ' ')} Mode</div>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-sm text-white/40">{answered.length} answered</div>
          <button onClick={endSession} className="btn-secondary text-sm">End & View Summary</button>
        </div>
      </div>

      {/* Turn history */}
      <div className="space-y-4 mb-6">
        {answered.map((t, i) => (
          <div key={t.id} className="space-y-3">
            {/* Question */}
            <div className="flex justify-start">
              <div className="chat-bubble-ai max-w-2xl">
                <div className="text-xs text-primary-400 font-semibold mb-1">Q{i+1} — Interviewer</div>
                <p className="text-white/90 text-sm">{t.question}</p>
              </div>
            </div>
            {/* Answer */}
            <div className="flex justify-end">
              <div className="chat-bubble-user max-w-2xl">
                <p className="text-white/90 text-sm">{t.answer}</p>
              </div>
            </div>
            {/* Feedback */}
            {t.aiFeedback && (
              <div className="mx-4 p-3 rounded-xl bg-white/5 border border-white/10 text-sm">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-semibold text-white/50">AI Feedback</span>
                  {t.score != null && (
                    <span className={`text-xs font-bold ${t.score >= 0.8 ? 'text-accent-400' : t.score >= 0.6 ? 'text-yellow-400' : 'text-red-400'}`}>
                      {Math.round(t.score * 100)}%
                    </span>
                  )}
                </div>
                <p className="text-white/60 text-xs">{t.aiFeedback}</p>
              </div>
            )}
          </div>
        ))}

        {/* Current question */}
        {currentTurn && !currentTurn.answer && (
          <div className="flex justify-start">
            <div className="chat-bubble-ai max-w-2xl">
              <div className="text-xs text-primary-400 font-semibold mb-1">Q{answered.length + 1} — Interviewer</div>
              <p className="text-white/90 text-sm">{currentTurn.question}</p>
              {currentTurn.hints?.length > 0 && (
                <details className="mt-2">
                  <summary className="text-xs text-white/30 cursor-pointer hover:text-white/50">💡 Hints</summary>
                  <ul className="mt-1 space-y-0.5">
                    {currentTurn.hints.map((h, i) => <li key={i} className="text-xs text-white/40">• {h}</li>)}
                  </ul>
                </details>
              )}
            </div>
          </div>
        )}

        {submitting && (
          <div className="flex justify-start">
            <div className="chat-bubble-ai">
              <div className="flex gap-1 items-center">
                <div className="w-2 h-2 bg-primary-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="w-2 h-2 bg-primary-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="w-2 h-2 bg-primary-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Answer input */}
      {currentTurn && !currentTurn.answer && (
        <div className="glass rounded-xl p-4">
          <textarea
            ref={answerRef}
            value={answer}
            onChange={e => setAnswer(e.target.value)}
            rows={5}
            className="input resize-none mb-3 text-sm"
            placeholder="Type your answer here… Be thorough and structured. You can use code snippets."
            disabled={submitting}
            onKeyDown={e => {
              if (e.key === 'Enter' && e.ctrlKey) submitAnswer();
            }}
          />
          <div className="flex items-center justify-between">
            <span className="text-xs text-white/30">Ctrl+Enter to submit</span>
            <button onClick={submitAnswer} disabled={submitting || !answer.trim()} className="btn-primary">
              {submitting ? 'Evaluating…' : 'Submit Answer →'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
