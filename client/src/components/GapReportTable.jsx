export default function GapReportTable({ result }) {
  const { matchedSkills = [], missingSkills = [], overallMatchPercent = 0, summary } = result;

  const pct = typeof overallMatchPercent === 'number' ? Math.round(overallMatchPercent) : 0;
  const color = pct >= 70 ? 'text-accent-400' : pct >= 40 ? 'text-yellow-400' : 'text-red-400';
  const barColor = pct >= 70 ? 'from-accent-500 to-accent-400' : pct >= 40 ? 'from-yellow-500 to-yellow-400' : 'from-red-500 to-red-400';

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Score card */}
      <div className="glass rounded-2xl p-6">
        <div className="flex items-center gap-6">
          <div className="text-center">
            <div className={`text-5xl font-bold ${color}`}>{pct}%</div>
            <div className="text-xs text-white/40 mt-1">Skills Match</div>
          </div>
          <div className="flex-1">
            <div className="h-3 bg-white/10 rounded-full overflow-hidden">
              <div
                className={`h-full bg-gradient-to-r ${barColor} rounded-full transition-all duration-700`}
                style={{ width: `${pct}%` }}
              />
            </div>
            {summary && <p className="text-white/60 text-sm mt-3 leading-relaxed">{summary}</p>}
          </div>
        </div>
      </div>

      {/* Matched skills */}
      {matchedSkills.length > 0 && (
        <div className="glass rounded-xl p-5">
          <h3 className="font-semibold text-white mb-3 flex items-center gap-2">
            <span className="text-accent-400">✓</span>
            Matched Skills ({matchedSkills.length})
          </h3>
          <div className="flex flex-wrap gap-2">
            {matchedSkills.map((s, i) => (
              <div key={i} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-accent-500/10 border border-accent-500/20 text-sm">
                <span className="text-accent-400">✓</span>
                <span className="text-white/80">{s.skill}</span>
                {s.matchStrength === 'partial' && (
                  <span className="text-xs text-white/30">(partial)</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Missing skills */}
      {missingSkills.length > 0 && (
        <div className="glass rounded-xl p-5">
          <h3 className="font-semibold text-white mb-3 flex items-center gap-2">
            <span className="text-red-400">✗</span>
            Skills to Develop ({missingSkills.length})
          </h3>
          <div className="space-y-3">
            {missingSkills.map((s, i) => (
              <div key={i} className="flex items-start gap-3 p-3 rounded-xl bg-red-500/5 border border-red-500/20">
                <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${
                  s.priority === 'high' ? 'bg-red-400' : s.priority === 'medium' ? 'bg-yellow-400' : 'bg-white/30'
                }`} />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-white/80 font-medium text-sm">{s.skill}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      s.priority === 'high' ? 'bg-red-500/20 text-red-400' :
                      s.priority === 'medium' ? 'bg-yellow-500/20 text-yellow-400' :
                      'bg-white/10 text-white/40'
                    }`}>{s.priority}</span>
                  </div>
                  {s.suggestedLearningPath && (
                    <div className="text-xs text-white/40 mt-1">→ {s.suggestedLearningPath}</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
