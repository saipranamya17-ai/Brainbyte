import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const navItems = [
  { to: '/dashboard',  label: 'Dashboard',       icon: '📊' },
  { to: '/roadmap',    label: 'My Roadmap',       icon: '🗺️' },
  { to: '/review',     label: 'Review Queue',      icon: '🔄' },
  { to: '/career',     label: 'Career Prep',       icon: '💼' },
  { to: '/interview',  label: 'Mock Interview',    icon: '🎤' },
  { to: '/resume',     label: 'Resume Builder',    icon: '📄' },
];

export default function Sidebar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <aside className="w-64 flex-shrink-0 border-r border-white/10 flex flex-col"
      style={{ background: 'rgba(255,255,255,0.02)' }}>

      {/* Logo */}
      <div className="p-6 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center text-white font-bold text-lg shadow-lg shadow-primary-500/30">
            A
          </div>
          <div>
            <div className="font-bold text-white leading-none">AdaptiSkill</div>
            <div className="text-xs text-white/40 mt-0.5">AI Career Coach</div>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 p-4 space-y-1">
        {navItems.map(item => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
          >
            <span className="text-lg leading-none">{item.icon}</span>
            <span>{item.label}</span>
          </NavLink>
        ))}

        {/* Add goal shortcut */}
        <div className="pt-4 mt-4 border-t border-white/10">
          <NavLink to="/goals/new" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
            <span className="text-lg leading-none">🎯</span>
            <span>Set New Goal</span>
          </NavLink>
        </div>
      </nav>

      {/* User card */}
      <div className="p-4 border-t border-white/10">
        <div className="glass rounded-xl p-3 flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary-400 to-accent-400 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
            {user?.name?.[0]?.toUpperCase() || 'U'}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium text-white truncate">{user?.name}</div>
            <div className="text-xs text-white/40 truncate">{user?.email}</div>
          </div>
          <button onClick={handleLogout} className="btn-ghost p-1.5 text-red-400 hover:text-red-300 hover:bg-red-500/10" title="Logout">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
          </button>
        </div>
      </div>
    </aside>
  );
}
