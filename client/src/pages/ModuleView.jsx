import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import api from '../lib/api';
import QuizCard from '../components/QuizCard';
import TutorChatPanel from '../components/TutorChatPanel';
import toast from 'react-hot-toast';
import ReactMarkdown from 'react-markdown';

export default function ModuleView() {
  const { nodeId } = useParams();
  const [node, setNode] = useState(null);
  const [content, setContent] = useState(null);
  const [contentLoading, setContentLoading] = useState(false);
  const [showQuiz, setShowQuiz] = useState(false);
  const [showTutor, setShowTutor] = useState(false);
  const [loading, setLoading] = useState(true);

  // We need to find the node by navigating to the profile endpoint
  useEffect(() => {
    // Fetch node content
    api.get(`/roadmaps/node/${nodeId}`).catch(() => {}).finally(() => setLoading(false));

    // Try loading node info from the roadmap
    // We'll just use the profile/module-content endpoint which also returns node info
    setLoading(false);
  }, [nodeId]);

  const loadContent = async () => {
    setContentLoading(true);
    try {
      const res = await api.get(`/profile/module-content/${nodeId}`);
      setContent(res.data.content);
    } catch (err) {
      toast.error('Failed to load lesson content');
    } finally {
      setContentLoading(false);
    }
  };

  useEffect(() => {
    loadContent();
  }, [nodeId]);

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="skeleton h-12 w-96" />
        <div className="skeleton h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      {/* Back nav */}
      <button onClick={() => window.history.back()} className="btn-ghost mb-6 text-white/50">
        ← Back to Roadmap
      </button>

      <div className="flex gap-6">
        {/* Main content */}
        <div className="flex-1 space-y-6">
          {/* Lesson Content */}
          {contentLoading ? (
            <div className="glass p-6 space-y-3">
              <div className="skeleton h-6 w-3/4" />
              <div className="skeleton h-4 w-full" />
              <div className="skeleton h-4 w-5/6" />
              <div className="skeleton h-4 w-4/5" />
              <div className="flex items-center gap-2 text-white/40 text-sm">
                <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                </svg>
                Generating lesson with Gemini AI…
              </div>
            </div>
          ) : content ? (
            <div className="glass p-6">
              <div className="prose-dark space-y-6">
                <div>
                  <h2 className="text-xl font-bold text-white mb-2">Introduction</h2>
                  <p className="text-white/80 leading-relaxed">{content.introduction}</p>
                </div>

                {content.analogy && (
                  <div className="p-4 rounded-xl bg-primary-500/10 border border-primary-500/20">
                    <div className="text-xs text-primary-400 font-semibold uppercase tracking-wider mb-1">💡 Analogy</div>
                    <p className="text-white/80 text-sm">{content.analogy}</p>
                  </div>
                )}

                {content.keyPoints && (
                  <div>
                    <h3 className="text-lg font-semibold text-white mb-3">Key Points</h3>
                    <ul className="space-y-2">
                      {content.keyPoints.map((pt, i) => (
                        <li key={i} className="flex items-start gap-2 text-white/80 text-sm">
                          <span className="text-accent-400 mt-0.5 flex-shrink-0">✓</span>
                          {pt}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {content.example && (
                  <div>
                    <h3 className="text-lg font-semibold text-white mb-3">Example</h3>
                    <div className="prose-dark">
                      <ReactMarkdown>{content.example}</ReactMarkdown>
                    </div>
                  </div>
                )}

                {content.summary && (
                  <div className="p-4 rounded-xl bg-accent-500/10 border border-accent-500/20">
                    <div className="text-xs text-accent-400 font-semibold uppercase tracking-wider mb-1">📌 Summary</div>
                    <p className="text-white/80 text-sm">{content.summary}</p>
                  </div>
                )}
              </div>
            </div>
          ) : null}

          {/* Actions */}
          <div className="flex gap-3">
            <button
              onClick={() => { setShowQuiz(true); setShowTutor(false); }}
              className="btn-primary"
            >
              📝 Take Quiz
            </button>
            <button
              onClick={() => { setShowTutor(o => !o); setShowQuiz(false); }}
              className="btn-secondary"
            >
              🤖 Ask AI Tutor
            </button>
          </div>

          {/* Quiz */}
          {showQuiz && <QuizCard nodeId={nodeId} onClose={() => setShowQuiz(false)} />}
        </div>

        {/* Tutor panel */}
        {showTutor && (
          <div className="w-96 flex-shrink-0">
            <TutorChatPanel nodeId={nodeId} onClose={() => setShowTutor(false)} />
          </div>
        )}
      </div>
    </div>
  );
}
