import { useState, useEffect, useRef } from 'react';
import api from '../lib/api';
import toast from 'react-hot-toast';

const SECTION_LABELS = {
  summary: '📋 Professional Summary',
  skills: '🛠️ Skills',
  education: '🎓 Education',
  projects: '💡 Projects',
  experience: '💼 Experience',
  certifications: '🏅 Certifications',
};

export default function ResumeBuilder() {
  const [resumes, setResumes] = useState([]);
  const [selected, setSelected] = useState(null);
  const [targetRole, setTargetRole] = useState('Software Engineer');
  const [generating, setGenerating] = useState(false);
  const [loading, setLoading] = useState(true);
  const printRef = useRef(null);

  useEffect(() => {
    api.get('/resume')
      .then(r => {
        setResumes(r.data.resumes || []);
        if (r.data.resumes?.[0]) loadResume(r.data.resumes[0].id);
        else setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const loadResume = async (id) => {
    try {
      const res = await api.get(`/resume/${id}`);
      setSelected(res.data.resume);
    } catch { }
    finally { setLoading(false); }
  };

  const generate = async () => {
    setGenerating(true);
    try {
      const res = await api.post('/resume/generate', { targetRole });
      const newResume = res.data.resume;
      setResumes(r => [{ id: newResume.id, targetRole: newResume.targetRole, generatedAt: newResume.generatedAt }, ...r]);
      setSelected(newResume);
      toast.success('Resume generated!');
    } catch (err) {
      toast.error(err.response?.data?.error?.message || 'Generation failed');
    } finally {
      setGenerating(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const c = selected?.contentJson;

  return (
    <div className="animate-fade-in">
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">Resume Builder</h2>
          <p className="text-white/50 mt-1">AI-generated from your verified skills and progress</p>
        </div>
        {selected && (
          <button onClick={handlePrint} className="btn-secondary">
            🖨️ Export PDF
          </button>
        )}
      </div>

      {/* Generate panel */}
      <div className="glass p-5 mb-6 flex items-end gap-4">
        <div className="flex-1">
          <label className="label" htmlFor="resumeRole">Target Role</label>
          <input
            id="resumeRole" type="text"
            className="input"
            value={targetRole}
            onChange={e => setTargetRole(e.target.value)}
            placeholder="Software Engineer"
          />
        </div>
        <button onClick={generate} disabled={generating} className="btn-primary whitespace-nowrap">
          {generating ? (
            <span className="flex items-center gap-2">
              <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
              </svg>
              Generating…
            </span>
          ) : '✨ Generate from My Progress'}
        </button>
      </div>

      {/* Resume list */}
      {resumes.length > 0 && (
        <div className="flex gap-2 mb-5 overflow-x-auto pb-1">
          {resumes.map(r => (
            <button
              key={r.id}
              onClick={() => loadResume(r.id)}
              className={`flex-shrink-0 px-4 py-2 rounded-xl text-sm border transition-all ${
                selected?.id === r.id
                  ? 'bg-primary-500/20 border-primary-500/50 text-primary-300'
                  : 'bg-white/5 border-white/10 text-white/60 hover:bg-white/10'
              }`}
            >
              {r.targetRole} — {new Date(r.generatedAt).toLocaleDateString()}
            </button>
          ))}
        </div>
      )}

      {loading ? (
        <div className="space-y-4">{[1,2,3].map(i => <div key={i} className="skeleton h-32" />)}</div>
      ) : !selected ? (
        <div className="text-center py-20 text-white/40">
          <div className="text-4xl mb-3">📄</div>
          <p>Generate your first AI resume above.</p>
        </div>
      ) : (
        // ── RESUME DISPLAY (print-optimized) ──────────────────────────────────
        <div ref={printRef} className="glass rounded-2xl p-8 print:bg-white print:text-black print:shadow-none">
          {/* Header */}
          <div className="border-b border-white/10 pb-6 mb-6 print:border-gray-200">
            <div className="flex items-start justify-between">
              <div>
                <h1 className="text-3xl font-bold text-white print:text-black">{selected.contentJson?.name || 'Your Name'}</h1>
                <div className="text-lg text-primary-400 print:text-blue-600 mt-1">{selected.targetRole}</div>
              </div>
              <div className="text-right text-sm text-white/40 print:text-gray-500">
                <div>Generated: {new Date(selected.generatedAt).toLocaleDateString()}</div>
              </div>
            </div>
          </div>

          {/* Summary */}
          {c?.summary && (
            <section className="mb-6">
              <h2 className="text-sm font-bold text-white/60 print:text-gray-500 uppercase tracking-widest mb-2">{SECTION_LABELS.summary}</h2>
              <p className="text-white/80 print:text-gray-700 text-sm leading-relaxed">{c.summary}</p>
            </section>
          )}

          {/* Skills */}
          {c?.skills && (
            <section className="mb-6">
              <h2 className="text-sm font-bold text-white/60 print:text-gray-500 uppercase tracking-widest mb-3">{SECTION_LABELS.skills}</h2>
              <div className="space-y-2">
                {c.skills.technical?.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {c.skills.technical.map((s, i) => (
                      <span key={i} className="px-2.5 py-1 rounded-lg bg-primary-500/20 border border-primary-500/30 text-primary-300 text-xs font-medium print:bg-blue-50 print:text-blue-700 print:border-blue-200">
                        {s}
                      </span>
                    ))}
                  </div>
                )}
                {c.skills.soft?.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {c.skills.soft.map((s, i) => (
                      <span key={i} className="px-2.5 py-1 rounded-lg bg-white/10 border border-white/10 text-white/60 text-xs print:bg-gray-100 print:text-gray-600">
                        {s}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </section>
          )}

          {/* Experience */}
          {c?.experience?.length > 0 && (
            <section className="mb-6">
              <h2 className="text-sm font-bold text-white/60 print:text-gray-500 uppercase tracking-widest mb-3">{SECTION_LABELS.experience}</h2>
              <div className="space-y-4">
                {c.experience.map((exp, i) => (
                  <div key={i}>
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="font-semibold text-white print:text-black text-sm">{exp.title}</div>
                        <div className="text-primary-400 print:text-blue-600 text-sm">{exp.company}</div>
                      </div>
                      <div className="text-xs text-white/40 print:text-gray-500">{exp.duration}</div>
                    </div>
                    <ul className="mt-2 space-y-1">
                      {(exp.bullets || []).map((b, j) => (
                        <li key={j} className="text-sm text-white/70 print:text-gray-700 flex gap-2">
                          <span className="text-primary-400 flex-shrink-0">•</span>{b}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Projects */}
          {c?.projects?.length > 0 && (
            <section className="mb-6">
              <h2 className="text-sm font-bold text-white/60 print:text-gray-500 uppercase tracking-widest mb-3">{SECTION_LABELS.projects}</h2>
              <div className="space-y-4">
                {c.projects.map((p, i) => (
                  <div key={i}>
                    <div className="font-semibold text-white print:text-black text-sm">{p.name}</div>
                    <div className="text-xs text-white/40 print:text-gray-500 mb-1">
                      {(p.technologies || []).join(', ')}
                    </div>
                    <p className="text-sm text-white/70 print:text-gray-700">{p.description}</p>
                    {p.highlights?.map((h, j) => (
                      <div key={j} className="text-sm text-white/60 flex gap-2 mt-1">
                        <span className="text-accent-400 flex-shrink-0">•</span>{h}
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Education */}
          {c?.education?.length > 0 && (
            <section className="mb-6">
              <h2 className="text-sm font-bold text-white/60 print:text-gray-500 uppercase tracking-widest mb-3">{SECTION_LABELS.education}</h2>
              <div className="space-y-2">
                {c.education.map((e, i) => (
                  <div key={i} className="flex justify-between text-sm">
                    <div>
                      <span className="font-medium text-white print:text-black">{e.degree}</span>
                      <span className="text-white/50 print:text-gray-500"> — {e.institution}</span>
                    </div>
                    <div className="text-white/40 print:text-gray-500">{e.year}</div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Certifications */}
          {c?.certifications?.length > 0 && (
            <section>
              <h2 className="text-sm font-bold text-white/60 print:text-gray-500 uppercase tracking-widest mb-2">{SECTION_LABELS.certifications}</h2>
              <div className="flex flex-wrap gap-2">
                {c.certifications.map((cert, i) => (
                  <span key={i} className="text-sm text-white/70 print:text-gray-700">• {cert}</span>
                ))}
              </div>
            </section>
          )}

          {/* Tips */}
          {c?.targetRoleTips?.length > 0 && (
            <div className="mt-8 pt-6 border-t border-white/10 print:hidden">
              <h3 className="text-sm font-semibold text-white/50 mb-2">💡 AI Tips for {selected.targetRole}</h3>
              <ul className="space-y-1">
                {c.targetRoleTips.map((tip, i) => (
                  <li key={i} className="text-xs text-white/40">• {tip}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
