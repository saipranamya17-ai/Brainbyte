import { useState } from 'react';
import api from '../lib/api';
import toast from 'react-hot-toast';

export default function QuizCard({ nodeId, onClose, onComplete }) {
  const [phase, setPhase] = useState('idle'); // idle | loading | quiz | submitted
  const [questions, setQuestions] = useState([]);
  const [attemptId, setAttemptId] = useState(null);
  const [answers, setAnswers] = useState({});
  const [currentQ, setCurrentQ] = useState(0);
  const [result, setResult] = useState(null);
  const [startTime, setStartTime] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const generateQuiz = async () => {
    setPhase('loading');
    try {
      const res = await api.post('/quiz/generate', { roadmapNodeId: nodeId });
      setQuestions(res.data.questions);
      setAttemptId(res.data.attemptId);
      setCurrentQ(0);
      setAnswers({});
      setStartTime(Date.now());
      setPhase('quiz');
    } catch (err) {
      toast.error('Failed to generate quiz. Please try again.');
      setPhase('idle');
    }
  };

  const selectAnswer = (qId, option) => {
    setAnswers(a => ({ ...a, [qId]: option }));
  };

  const submitQuiz = async () => {
    if (Object.keys(answers).length < questions.length) {
      toast.error('Please answer all questions before submitting.');
      return;
    }
    setSubmitting(true);
    const elapsed = Math.round((Date.now() - startTime) / 1000);
    try {
      const res = await api.post('/quiz/submit', {
        attemptId,
        roadmapNodeId: nodeId,
        answers,
        timeSpentSeconds: elapsed,
      });
      setResult(res.data);
      setPhase('submitted');
      onComplete?.();
    } catch (err) {
      toast.error(err.response?.data?.error?.message || 'Submission failed');
    } finally {
      setSubmitting(false);
    }
  };

  const q = questions[currentQ];

  return (
    <div className="glass rounded-2xl p-6 animate-fade-in">
      <div className="flex items-center justify-between mb-5">
        <h3 className="font-semibold text-white">📝 Quick Quiz</h3>
        <button onClick={onClose} className="btn-ghost p-1 text-white/40">✕</button>
      </div>

      {/* IDLE */}
      {phase === 'idle' && (
        <div className="text-center py-6">
          <div className="text-4xl mb-3">🧠</div>
          <p className="text-white/60 text-sm mb-5">Test your understanding with 5 AI-generated questions tailored to your current mastery level.</p>
          <button onClick={generateQuiz} className="btn-primary">Start Quiz</button>
        </div>
      )}

      {/* LOADING */}
      {phase === 'loading' && (
        <div className="text-center py-8">
          <svg className="animate-spin w-10 h-10 text-primary-400 mx-auto mb-3" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
          </svg>
          <p className="text-white/50 text-sm">Generating adaptive quiz…</p>
        </div>
      )}

      {/* QUIZ */}
      {phase === 'quiz' && q && (
        <div>
          {/* Progress */}
          <div className="flex items-center justify-between text-xs text-white/40 mb-4">
            <span>Question {currentQ + 1} of {questions.length}</span>
            <div className="flex gap-1">
              {questions.map((_, i) => (
                <div key={i} className={`w-2 h-2 rounded-full transition-colors ${
                  i < currentQ ? 'bg-accent-400' : i === currentQ ? 'bg-primary-400' : 'bg-white/20'
                }`} />
              ))}
            </div>
          </div>

          {/* Question */}
          <p className="text-white font-medium mb-5 leading-relaxed">{q.question}</p>

          {/* Options */}
          <div className="space-y-3 mb-6">
            {Object.entries(q.options || {}).map(([key, text]) => (
              <button
                key={key}
                onClick={() => selectAnswer(q.id, key)}
                className={`w-full text-left px-4 py-3 rounded-xl border text-sm transition-all duration-200 ${
                  answers[q.id] === key
                    ? 'bg-primary-500/20 border-primary-500/60 text-white'
                    : 'bg-white/5 border-white/10 text-white/70 hover:bg-white/10 hover:border-white/20'
                }`}
              >
                <span className="font-semibold text-primary-400 mr-2">{key}.</span>
                {text}
              </button>
            ))}
          </div>

          {/* Navigation */}
          <div className="flex gap-3">
            {currentQ > 0 && (
              <button onClick={() => setCurrentQ(q => q - 1)} className="btn-secondary flex-1">← Back</button>
            )}
            {currentQ < questions.length - 1 ? (
              <button
                onClick={() => setCurrentQ(q => q + 1)}
                disabled={!answers[q.id]}
                className="btn-primary flex-1"
              >
                Next →
              </button>
            ) : (
              <button
                onClick={submitQuiz}
                disabled={submitting || Object.keys(answers).length < questions.length}
                className="btn-primary flex-1"
              >
                {submitting ? 'Submitting…' : 'Submit Quiz'}
              </button>
            )}
          </div>
        </div>
      )}

      {/* RESULTS */}
      {phase === 'submitted' && result && (
        <div className="animate-fade-in">
          {/* Score circle */}
          <div className="text-center mb-6">
            <div className={`inline-flex w-20 h-20 rounded-full items-center justify-center text-3xl font-bold mb-2 ${
              result.score >= 0.8 ? 'bg-accent-500/20 text-accent-400 border-2 border-accent-500/40' :
              result.score >= 0.6 ? 'bg-yellow-500/20 text-yellow-400 border-2 border-yellow-500/40' :
              'bg-red-500/20 text-red-400 border-2 border-red-500/40'
            }`}>
              {Math.round(result.score * 100)}%
            </div>
            <div className="text-white font-semibold">
              {result.correct}/{result.total} correct
            </div>
            {result.mastery?.nodeMastered && (
              <div className="mt-2 badge-mastered">🎉 Module Mastered!</div>
            )}
          </div>

          {/* Mastery update */}
          {result.mastery && (
            <div className="glass rounded-xl p-3 mb-4 text-sm">
              <div className="flex justify-between text-white/60 mb-1">
                <span>Topic Mastery</span>
                <span className="text-white font-medium">{Math.round(result.mastery.newScore * 100)}%</span>
              </div>
              <div className="h-1.5 bg-white/10 rounded-full">
                <div
                  className="h-full bg-gradient-to-r from-primary-500 to-accent-500 rounded-full transition-all"
                  style={{ width: `${result.mastery.newScore * 100}%` }}
                />
              </div>
              {result.mastery.nextReviewAt && (
                <div className="text-xs text-white/30 mt-1.5">
                  Next review: {new Date(result.mastery.nextReviewAt).toLocaleDateString()}
                </div>
              )}
            </div>
          )}

          {/* Question review */}
          <div className="space-y-3 mb-4 max-h-60 overflow-y-auto">
            {questions.map((q, i) => {
              const r = result.results?.[q.id];
              return (
                <div key={q.id} className={`p-3 rounded-xl text-xs border ${
                  r?.isCorrect ? 'bg-accent-500/10 border-accent-500/20' : 'bg-red-500/10 border-red-500/20'
                }`}>
                  <div className="font-medium text-white/80 mb-1">
                    {r?.isCorrect ? '✓' : '✗'} Q{i+1}: {q.question.slice(0, 80)}...
                  </div>
                  {!r?.isCorrect && r?.correctAnswer && (
                    <div className="text-white/50">
                      Correct: {r.correctAnswer}. {r.explanation?.slice(0, 100)}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="flex gap-3">
            <button onClick={generateQuiz} className="btn-secondary flex-1 text-sm">Retry Quiz</button>
            <button onClick={onClose} className="btn-primary flex-1 text-sm">Continue</button>
          </div>
        </div>
      )}
    </div>
  );
}
