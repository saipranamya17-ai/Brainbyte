import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../lib/api';
import toast from 'react-hot-toast';

const CURRENT_LEVELS = [
  '1st year B.Tech / University student',
  '2nd year B.Tech / University student',
  '3rd year B.Tech / University student',
  '4th year B.Tech / University student',
  'Recent Graduate (0-1 year)',
  'Junior Developer (1-2 years)',
  'Mid-level Developer (2-5 years)',
  'Self-taught Beginner',
  'Career Switcher',
  'Other',
];

const TIMEFRAMES = [
  '3 months', '6 months', '1 year', '18 months', '2 years', '3 years',
];

export default function OnboardingGoal() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    title: '',
    targetRole: '',
    currentLevel: '',
    targetTimeframe: '1 year',
    hoursPerDay: 2,
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    const { name, value, type } = e.target;
    setForm(f => ({ ...f, [name]: type === 'number' ? parseFloat(value) : value }));
  };

  const validate = () => {
    const errs = {};
    if (!form.title || form.title.length < 3) errs.title = 'Please describe your goal (min 3 chars)';
    if (!form.targetRole || form.targetRole.length < 2) errs.targetRole = 'Please enter your target role';
    if (!form.currentLevel) errs.currentLevel = 'Please select your current level';
    if (form.hoursPerDay < 0.5 || form.hoursPerDay > 16) errs.hoursPerDay = 'Must be between 0.5 and 16';
    return errs;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setLoading(true);

    try {
      const res = await api.post('/goals', form);
      toast.success('🚀 Roadmap generated! Let\'s get started.');
      navigate(`/roadmap/${res.data.goal.id}`);
    } catch (err) {
      const msg = err.response?.data?.error?.message || 'Failed to create goal';
      toast.error(msg);
      const fields = err.response?.data?.error?.fields;
      if (fields) setErrors(fields);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto animate-fade-in">
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-white">Set Your Career Goal</h2>
        <p className="text-white/50 mt-2">
          Tell us where you want to go and we'll build you a personalized AI-powered roadmap.
        </p>
      </div>

      <div className="glass p-8">
        {loading && (
          <div className="mb-6 p-4 rounded-xl bg-primary-500/10 border border-primary-500/20 flex items-center gap-3">
            <svg className="animate-spin w-5 h-5 text-primary-400 flex-shrink-0" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
            </svg>
            <div>
              <div className="text-sm font-medium text-primary-300">Generating your personalized roadmap…</div>
              <div className="text-xs text-white/40 mt-0.5">This may take 10-20 seconds while Gemini AI builds your curriculum</div>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="label" htmlFor="goal-title">What's your career goal?</label>
            <input
              id="goal-title" name="title" type="text"
              className={`input ${errors.title ? 'border-red-500' : ''}`}
              placeholder="e.g. Get a Software Engineer job at Google"
              value={form.title} onChange={handleChange}
            />
            {errors.title && <p className="text-red-400 text-xs mt-1">{errors.title}</p>}
          </div>

          <div>
            <label className="label" htmlFor="targetRole">Target Role / Job Title</label>
            <input
              id="targetRole" name="targetRole" type="text"
              className={`input ${errors.targetRole ? 'border-red-500' : ''}`}
              placeholder="e.g. Software Engineer, Data Scientist, Product Manager"
              value={form.targetRole} onChange={handleChange}
            />
            {errors.targetRole && <p className="text-red-400 text-xs mt-1">{errors.targetRole}</p>}
          </div>

          <div>
            <label className="label" htmlFor="currentLevel">Your Current Level</label>
            <select
              id="currentLevel" name="currentLevel"
              className={`input ${errors.currentLevel ? 'border-red-500' : ''}`}
              value={form.currentLevel} onChange={handleChange}
            >
              <option value="">— Select your level —</option>
              {CURRENT_LEVELS.map(l => <option key={l} value={l}>{l}</option>)}
            </select>
            {errors.currentLevel && <p className="text-red-400 text-xs mt-1">{errors.currentLevel}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label" htmlFor="targetTimeframe">Target Timeframe</label>
              <select
                id="targetTimeframe" name="targetTimeframe"
                className="input"
                value={form.targetTimeframe} onChange={handleChange}
              >
                {TIMEFRAMES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="label" htmlFor="hoursPerDay">Hours/Day Available</label>
              <input
                id="hoursPerDay" name="hoursPerDay" type="number"
                min="0.5" max="16" step="0.5"
                className={`input ${errors.hoursPerDay ? 'border-red-500' : ''}`}
                value={form.hoursPerDay} onChange={handleChange}
              />
              {errors.hoursPerDay && <p className="text-red-400 text-xs mt-1">{errors.hoursPerDay}</p>}
            </div>
          </div>

          <button type="submit" disabled={loading} className="btn-primary w-full justify-center py-3 text-base">
            {loading ? (
              <span className="flex items-center gap-2">
                <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                </svg>
                Building Your Roadmap…
              </span>
            ) : '🚀 Generate My Roadmap'}
          </button>
        </form>
      </div>
    </div>
  );
}
