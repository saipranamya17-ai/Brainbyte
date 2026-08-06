import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import api from '../lib/api';

function NodeBadge({ status }) {
  if (status === 'mastered') return <span className="badge-mastered">✓ Mastered</span>;
  if (status === 'active')   return <span className="badge-active">▶ Active</span>;
  return <span className="badge-locked">🔒 Locked</span>;
}

function DiffBadge({ difficulty }) {
  return <span className={`badge-${difficulty}`}>{difficulty}</span>;
}

function ModuleNode({ node, depth = 0 }) {
  const [open, setOpen] = useState(depth < 2);
  const navigate = useNavigate();
  const hasChildren = node.children && node.children.length > 0;

  const isClickable = node.status === 'active' || node.status === 'mastered';
  const indentClass = depth === 0 ? '' : depth === 1 ? 'ml-6' : depth === 2 ? 'ml-12' : 'ml-16';

  return (
    <div className={`${indentClass} animate-fade-in`}>
      <div
        className={`
          glass rounded-xl p-4 mb-3 border transition-all duration-200
          ${node.status === 'mastered' ? 'border-accent-500/30 bg-accent-500/5' : ''}
          ${node.status === 'active'   ? 'border-primary-500/40 bg-primary-500/5 shadow-lg shadow-primary-500/10' : ''}
          ${node.status === 'locked'   ? 'opacity-50' : ''}
          ${isClickable && node.type === 'module' ? 'cursor-pointer hover:border-primary-400/60 hover:scale-[1.01]' : ''}
        `}
        onClick={() => {
          if (isClickable && node.type === 'module') navigate(`/module/${node.id}`);
          else if (hasChildren) setOpen(o => !o);
        }}
      >
        <div className="flex items-center gap-3">
          {/* Type icon */}
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm flex-shrink-0
            ${node.type === 'phase'     ? 'bg-purple-500/20 text-purple-400' : ''}
            ${node.type === 'milestone' ? 'bg-blue-500/20 text-blue-400'   : ''}
            ${node.type === 'module'    ? 'bg-primary-500/20 text-primary-400' : ''}
            ${node.type === 'lesson'    ? 'bg-white/10 text-white/60' : ''}
          `}>
            {node.type === 'phase'     && '🌐'}
            {node.type === 'milestone' && '🏁'}
            {node.type === 'module'    && '📚'}
            {node.type === 'lesson'    && '📝'}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`font-medium text-sm ${node.status === 'locked' ? 'text-white/50' : 'text-white'}`}>
                {node.title}
              </span>
              <NodeBadge status={node.status} />
              {node.difficulty !== 'beginner' || node.type === 'module' ? <DiffBadge difficulty={node.difficulty} /> : null}
            </div>
            {node.estimatedHours > 0 && (
              <div className="text-xs text-white/30 mt-0.5">~{node.estimatedHours}h</div>
            )}
          </div>

          {/* Expand toggle */}
          {hasChildren && (
            <button className="text-white/30 hover:text-white/60 transition-colors ml-auto">
              <svg className={`w-4 h-4 transition-transform ${open ? 'rotate-90' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          )}
          {/* Navigate arrow for modules */}
          {isClickable && node.type === 'module' && (
            <svg className="w-4 h-4 text-primary-400 ml-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          )}
        </div>
      </div>

      {/* Children */}
      {hasChildren && open && (
        <div className="mt-1">
          {node.children.map(child => (
            <ModuleNode key={child.id} node={child} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  );
}

export default function RoadmapView() {
  const { goalId } = useParams();
  const navigate = useNavigate();
  const [goal, setGoal] = useState(null);
  const [roadmap, setRoadmap] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!goalId) {
      // Try to load first goal
      api.get('/goals').then(r => {
        if (r.data.goals?.[0]) navigate(`/roadmap/${r.data.goals[0].id}`);
        else navigate('/goals/new');
      }).catch(() => navigate('/goals/new'));
      return;
    }

    Promise.all([
      api.get(`/goals/${goalId}`),
      api.get(`/roadmaps/${goalId}`),
    ]).then(([gr, rr]) => {
      setGoal(gr.data.goal);
      setRoadmap(rr.data.roadmap);
    }).catch(() => navigate('/goals/new'))
      .finally(() => setLoading(false));
  }, [goalId, navigate]);

  if (loading) {
    return (
      <div className="space-y-4">
        {[1,2,3].map(i => <div key={i} className="skeleton h-20 w-full" />)}
      </div>
    );
  }

  if (!roadmap?.nodes?.length) {
    return (
      <div className="text-center py-20">
        <div className="text-5xl mb-4">🗺️</div>
        <h2 className="text-xl font-semibold text-white">No roadmap yet</h2>
        <p className="text-white/50 mt-2">Set a goal and we'll build your personalized roadmap.</p>
        <Link to="/goals/new" className="btn-primary mt-6 inline-flex">Set Your Goal</Link>
      </div>
    );
  }

  // Count mastered nodes
  const flatten = (nodes) => nodes.flatMap(n => [n, ...flatten(n.children || [])]);
  const allNodes = flatten(roadmap.nodes);
  const moduleNodes = allNodes.filter(n => n.type === 'module' || n.type === 'lesson');
  const masteredCount = moduleNodes.filter(n => n.status === 'mastered').length;
  const completion = moduleNodes.length ? Math.round(masteredCount / moduleNodes.length * 100) : 0;

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-2xl font-bold text-white">{goal?.title}</h2>
            <div className="flex items-center gap-3 mt-2">
              <span className="text-sm text-white/50">Target: <strong className="text-white/70">{goal?.targetRole}</strong></span>
              <span className="text-white/30">•</span>
              <span className="text-sm text-white/50">{goal?.targetTimeframe}</span>
            </div>
          </div>
          <Link to="/goals/new" className="btn-secondary text-sm">+ New Goal</Link>
        </div>

        {/* Progress bar */}
        <div className="mt-5 glass rounded-xl p-4 flex items-center gap-4">
          <div className="flex-1">
            <div className="flex justify-between text-sm mb-2">
              <span className="text-white/60">Overall Progress</span>
              <span className="text-white font-semibold">{completion}%</span>
            </div>
            <div className="h-2 bg-white/10 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-primary-500 to-accent-500 rounded-full transition-all duration-500"
                style={{ width: `${completion}%` }}
              />
            </div>
          </div>
          <div className="text-right">
            <div className="text-lg font-bold text-white">{masteredCount}/{moduleNodes.length}</div>
            <div className="text-xs text-white/40">modules mastered</div>
          </div>
        </div>
      </div>

      {/* Tree */}
      <div className="space-y-2">
        {roadmap.nodes.map(node => (
          <ModuleNode key={node.id} node={node} depth={0} />
        ))}
      </div>
    </div>
  );
}
