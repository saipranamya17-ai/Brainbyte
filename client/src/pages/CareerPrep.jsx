import { useState, useEffect } from 'react';
import api from '../lib/api';
import toast from 'react-hot-toast';
import GapReportTable from '../components/GapReportTable';

export default function CareerPrep() {
  const [tab, setTab] = useState('analyze'); // analyze | history
  const [jdText, setJdText] = useState('');
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState(null);
  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  const loadHistory = async () => {
    setHistoryLoading(true);
    try {
      const res = await api.get('/career/gap-analyses');
      setHistory(res.data.analyses || []);
    } catch { }
    finally { setHistoryLoading(false); }
  };

  useEffect(() => {
    if (tab === 'history') loadHistory();
  }, [tab]);

  const analyze = async () => {
    if (!jdText.trim() || jdText.length < 50) {
      toast.error('Please paste a full job description (at least 50 characters).');
      return;
    }
    setAnalyzing(true);
    setResult(null);
    try {
      // Step 1: Store JD + extract skills
      const jdRes = await api.post('/career/job-description', { rawText: jdText });
      const jdId = jdRes.data.jobDescription.id;

      // Step 2: Gap analysis
      const gapRes = await api.post('/career/gap-analysis', { jobDescriptionId: jdId });
      setResult(gapRes.data);
      toast.success('Gap analysis complete!');
    } catch (err) {
      toast.error(err.response?.data?.error?.message || 'Analysis failed');
    } finally {
      setAnalyzing(false);
    }
  };

  return (
    <div className="animate-fade-in">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-white">Career Gap Analysis</h2>
        <p className="text-white/50 mt-1">Paste a job description to see how your skills match up</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        {['analyze', 'history'].map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={t === tab ? 'btn-primary text-sm' : 'btn-secondary text-sm'}>
            {t === 'analyze' ? '🔍 New Analysis' : '📋 History'}
          </button>
        ))}
      </div>

      {tab === 'analyze' && (
        <div className="space-y-6">
          <div className="glass p-6">
            <label className="label">Paste Job Description</label>
            <textarea
              value={jdText}
              onChange={e => setJdText(e.target.value)}
              rows={10}
              className="input resize-none font-mono text-sm"
              placeholder={`Paste the full job description here...\n\nExample:\nSoftware Engineer @ Google\n- BS/MS in Computer Science\n- Strong algorithms & data structures\n- Experience with Python, Java...`}
            />
            <div className="flex items-center justify-between mt-3">
              <span className="text-xs text-white/30">{jdText.length}/10000 chars</span>
              <button onClick={analyze} disabled={analyzing || jdText.length < 50} className="btn-primary">
                {analyzing ? (
                  <span className="flex items-center gap-2">
                    <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                    </svg>
                    Analyzing with AI…
                  </span>
                ) : '🔍 Analyze Gaps'}
              </button>
            </div>
          </div>

          {result && <GapReportTable result={result} />}
        </div>
      )}

      {tab === 'history' && (
        <div>
          {historyLoading ? (
            <div className="space-y-3">{[1,2].map(i => <div key={i} className="skeleton h-24" />)}</div>
          ) : history.length === 0 ? (
            <div className="text-center py-16 text-white/40">
              No analyses yet. Analyze a job description to get started.
            </div>
          ) : (
            <div className="space-y-4">
              {history.map(a => {
                const matched = Array.isArray(a.matchedSkillsJson) ? a.matchedSkillsJson.length : 0;
                const missing = Array.isArray(a.missingSkillsJson) ? a.missingSkillsJson.length : 0;
                const pct = matched + missing > 0 ? Math.round(matched / (matched + missing) * 100) : 0;
                return (
                  <div key={a.id} className="glass rounded-xl p-5">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <div className="font-medium text-white">
                          {a.jobDescription?.extractedSkillsJson?.role || 'Job Analysis'}
                        </div>
                        <div className="text-xs text-white/40">{new Date(a.createdAt).toLocaleDateString()}</div>
                      </div>
                      <div className={`text-2xl font-bold ${pct >= 70 ? 'text-accent-400' : pct >= 40 ? 'text-yellow-400' : 'text-red-400'}`}>
                        {pct}%
                      </div>
                    </div>
                    <div className="flex gap-4 text-sm">
                      <span className="text-accent-400">✓ {matched} matched</span>
                      <span className="text-red-400">✗ {missing} missing</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
