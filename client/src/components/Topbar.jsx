import { useLocation } from 'react-router-dom';

const titles = {
  '/dashboard':  { label: 'Dashboard',       emoji: '📊' },
  '/review':     { label: 'Review Queue',      emoji: '🔄' },
  '/career':     { label: 'Career Prep',       emoji: '💼' },
  '/interview':  { label: 'Mock Interview',    emoji: '🎤' },
  '/resume':     { label: 'Resume Builder',    emoji: '📄' },
  '/goals/new':  { label: 'Set New Goal',      emoji: '🎯' },
};

export default function Topbar() {
  const location = useLocation();
  const match = Object.entries(titles).find(([path]) => location.pathname.startsWith(path));
  const info = match?.[1] || { label: 'AdaptiSkill', emoji: '⚡' };

  return (
    <header className="h-16 border-b border-white/10 flex items-center px-6 flex-shrink-0"
      style={{ background: 'rgba(255,255,255,0.02)' }}>
      <div className="flex items-center gap-3">
        <span className="text-2xl">{info.emoji}</span>
        <h1 className="text-lg font-semibold text-white">{info.label}</h1>
      </div>
      <div className="ml-auto flex items-center gap-3">
        <a href="https://ai.google.dev" target="_blank" rel="noopener noreferrer"
           className="text-xs text-white/30 hover:text-white/50 transition-colors">
          Powered by Gemini AI
        </a>
      </div>
    </header>
  );
}
