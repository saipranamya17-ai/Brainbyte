import { useState, useEffect, useRef } from 'react';
import api from '../lib/api';
import toast from 'react-hot-toast';
import ReactMarkdown from 'react-markdown';

export default function TutorChatPanel({ nodeId, onClose }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const bottomRef = useRef(null);

  // Load history
  useEffect(() => {
    api.get(`/tutor/history?roadmapNodeId=${nodeId}`)
      .then(r => setMessages(r.data.messages || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [nodeId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!input.trim() || sending) return;

    const userMsg = { role: 'user', content: input, createdAt: new Date().toISOString() };
    setMessages(m => [...m, userMsg]);
    const q = input;
    setInput('');
    setSending(true);

    try {
      const res = await api.post('/tutor/message', { roadmapNodeId: nodeId, message: q });
      setMessages(m => [...m, res.data.message]);
    } catch (err) {
      toast.error('Tutor unavailable. Please try again.');
      setMessages(m => m.slice(0, -1));
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="glass-strong rounded-2xl flex flex-col h-[600px] animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-white/10">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center text-sm">🤖</div>
          <div>
            <div className="text-sm font-semibold text-white">AI Tutor</div>
            <div className="text-xs text-white/40">Powered by Gemini</div>
          </div>
        </div>
        <button onClick={onClose} className="btn-ghost p-1 text-white/40">✕</button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {loading ? (
          <div className="text-center text-white/30 text-sm py-4">Loading conversation…</div>
        ) : messages.length === 0 ? (
          <div className="text-center py-8">
            <div className="text-3xl mb-2">💬</div>
            <p className="text-white/40 text-sm">Ask anything about this topic!</p>
            <div className="mt-4 space-y-2">
              {[
                'Explain this concept simply',
                'Give me a real-world example',
                'What are common mistakes here?',
              ].map(s => (
                <button key={s} onClick={() => setInput(s)}
                  className="block w-full text-left text-xs px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-white/50 hover:text-white/80 transition-all">
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={msg.role === 'user' ? 'chat-bubble-user' : 'chat-bubble-ai'}>
                <div className="prose-dark text-sm">
                  <ReactMarkdown>{msg.content}</ReactMarkdown>
                </div>
                <div className="text-xs text-white/30 mt-1">
                  {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            </div>
          ))
        )}
        {sending && (
          <div className="flex justify-start">
            <div className="chat-bubble-ai">
              <div className="flex gap-1 items-center">
                <div className="w-2 h-2 bg-primary-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="w-2 h-2 bg-primary-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="w-2 h-2 bg-primary-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <form onSubmit={sendMessage} className="p-4 border-t border-white/10 flex gap-2">
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder="Ask the AI tutor…"
          className="input py-2 text-sm flex-1"
          disabled={sending}
        />
        <button type="submit" disabled={!input.trim() || sending} className="btn-primary py-2 px-3">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
          </svg>
        </button>
      </form>
    </div>
  );
}
