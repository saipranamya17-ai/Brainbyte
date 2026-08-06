import { useState, useEffect } from 'react';
import api from '../lib/api';
import QuizCard from '../components/QuizCard';

export default function ReviewQueue() {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    api.get('/review/due')
      .then(r => setReviews(r.data.dueReviews || []))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="skeleton h-20 w-full" />)}</div>;
  }

  if (reviews.length === 0) {
    return (
      <div className="text-center py-20 animate-fade-in">
        <div className="text-5xl mb-4">🎉</div>
        <h2 className="text-xl font-semibold text-white">All caught up!</h2>
        <p className="text-white/50 mt-2">No reviews due today. Keep learning new modules!</p>
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-white">Review Queue</h2>
        <p className="text-white/50 mt-1">{reviews.length} topic{reviews.length !== 1 ? 's' : ''} due for review today</p>
      </div>

      {selected ? (
        <div>
          <button onClick={() => setSelected(null)} className="btn-ghost mb-4 text-white/50">← Back to Queue</button>
          <QuizCard nodeId={selected.node.id} onClose={() => setSelected(null)} onComplete={() => {
            setReviews(r => r.filter(x => x.topicTag !== selected.topicTag));
            setSelected(null);
          }} />
        </div>
      ) : (
        <div className="space-y-3">
          {reviews.map((review) => {
            const overdue = new Date(review.nextReviewAt) < new Date();
            return (
              <div key={review.id} className="glass rounded-xl p-5 flex items-center gap-4 hover:border-primary-500/30 transition-all cursor-pointer"
                onClick={() => setSelected(review)}>
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary-500/20 to-accent-500/20 flex items-center justify-center text-2xl flex-shrink-0">
                  🔄
                </div>
                <div className="flex-1">
                  <div className="font-medium text-white">{review.topicTag.replace(/_/g, ' ')}</div>
                  <div className="flex items-center gap-3 mt-1">
                    <div className="text-xs text-white/40">
                      Mastery: <span className="text-white/60 font-medium">{Math.round(review.masteryScore * 100)}%</span>
                    </div>
                    <span className="text-white/20">•</span>
                    <div className={`text-xs ${overdue ? 'text-red-400' : 'text-white/40'}`}>
                      {overdue ? '⚠️ Overdue' : `Due: ${new Date(review.nextReviewAt).toLocaleDateString()}`}
                    </div>
                  </div>
                  {/* Mastery bar */}
                  <div className="h-1 bg-white/10 rounded-full mt-2 w-48">
                    <div
                      className="h-full bg-gradient-to-r from-primary-500 to-accent-500 rounded-full"
                      style={{ width: `${review.masteryScore * 100}%` }}
                    />
                  </div>
                </div>
                <button className="btn-primary text-sm py-2">Review Now →</button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
