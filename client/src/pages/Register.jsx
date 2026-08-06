import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', password: '', confirm: '' });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => setForm(f => ({ ...f, [e.target.name]: e.target.value }));

  const validate = () => {
    const errs = {};
    if (!form.name || form.name.length < 2) errs.name = 'Name must be at least 2 characters';
    if (!form.email) errs.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(form.email)) errs.email = 'Invalid email';
    if (!form.password || form.password.length < 8) errs.password = 'Password must be at least 8 characters';
    if (form.password !== form.confirm) errs.confirm = 'Passwords do not match';
    return errs;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setLoading(true);
    try {
      await register(form.name, form.email, form.password);
      toast.success('Account created! Let\'s set your first goal.');
      navigate('/goals/new');
    } catch (err) {
      const msg = err.response?.data?.error?.message || 'Registration failed';
      toast.error(msg);
      if (err.response?.data?.error?.code === 'EMAIL_TAKEN') {
        setErrors({ email: 'Email is already taken' });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md animate-fade-in">
        <div className="text-center mb-8">
          <div className="inline-flex w-16 h-16 rounded-2xl bg-gradient-to-br from-primary-500 to-accent-500 items-center justify-center text-white font-bold text-3xl shadow-xl shadow-primary-500/30 mb-4">
            A
          </div>
          <h1 className="text-3xl font-bold text-white">Start your journey</h1>
          <p className="text-white/50 mt-1">AI-powered learning tailored to your goals</p>
        </div>

        <div className="glass-strong p-8 shadow-2xl">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="label" htmlFor="name">Full Name</label>
              <input
                id="name" name="name" type="text" autoComplete="name"
                className={`input ${errors.name ? 'border-red-500' : ''}`}
                placeholder="Alex Johnson"
                value={form.name} onChange={handleChange}
              />
              {errors.name && <p className="text-red-400 text-xs mt-1">{errors.name}</p>}
            </div>

            <div>
              <label className="label" htmlFor="reg-email">Email</label>
              <input
                id="reg-email" name="email" type="email" autoComplete="email"
                className={`input ${errors.email ? 'border-red-500' : ''}`}
                placeholder="you@example.com"
                value={form.email} onChange={handleChange}
              />
              {errors.email && <p className="text-red-400 text-xs mt-1">{errors.email}</p>}
            </div>

            <div>
              <label className="label" htmlFor="reg-password">Password</label>
              <input
                id="reg-password" name="password" type="password" autoComplete="new-password"
                className={`input ${errors.password ? 'border-red-500' : ''}`}
                placeholder="At least 8 characters"
                value={form.password} onChange={handleChange}
              />
              {errors.password && <p className="text-red-400 text-xs mt-1">{errors.password}</p>}
            </div>

            <div>
              <label className="label" htmlFor="confirm">Confirm Password</label>
              <input
                id="confirm" name="confirm" type="password" autoComplete="new-password"
                className={`input ${errors.confirm ? 'border-red-500' : ''}`}
                placeholder="Repeat password"
                value={form.confirm} onChange={handleChange}
              />
              {errors.confirm && <p className="text-red-400 text-xs mt-1">{errors.confirm}</p>}
            </div>

            <button type="submit" disabled={loading} className="btn-primary w-full justify-center py-3 text-base">
              {loading ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                  </svg>
                  Creating account…
                </span>
              ) : 'Create Account'}
            </button>
          </form>

          <p className="text-center text-white/40 text-sm mt-6">
            Already have an account?{' '}
            <Link to="/login" className="text-primary-400 hover:text-primary-300 font-medium transition-colors">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
