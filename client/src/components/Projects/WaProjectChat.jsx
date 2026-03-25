import { useState, useRef, useEffect } from 'react';
import { MessageSquare, X, Send } from 'lucide-react';
import { waProjectsAPI } from '../../services/api';

const SUGGESTIONS = ['How is the client?', 'Any active alerts?', 'What happened recently?', 'Summarize this project'];

export default function WaProjectChat({ projectId }) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [streaming, setStreaming] = useState(false);
  const scrollRef = useRef(null);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  const sendMessage = async (text) => {
    const userMsg = text || input.trim();
    if (!userMsg || streaming) return;
    setInput('');
    const newMessages = [...messages, { role: 'user', content: userMsg }];
    setMessages([...newMessages, { role: 'assistant', content: '' }]);
    setStreaming(true);
    let assistantContent = '';

    await waProjectsAPI.chat(projectId, newMessages,
      (chunk) => {
        assistantContent += chunk;
        setMessages(prev => { const u = [...prev]; u[u.length - 1] = { role: 'assistant', content: assistantContent }; return u; });
      },
      () => setStreaming(false),
      (err) => {
        setMessages(prev => { const u = [...prev]; u[u.length - 1] = { role: 'assistant', content: 'Error: ' + err }; return u; });
        setStreaming(false);
      }
    );
  };

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 w-14 h-14 rounded-full shadow-lg flex items-center justify-center transition-all z-40 hover:scale-105"
        style={{ background: 'linear-gradient(135deg, #E8792F, #d4621a)' }}
        title="PM Agent"
      >
        <MessageSquare size={22} color="#fff" />
      </button>
    );
  }

  return (
    <div className="fixed bottom-6 right-6 w-96 h-[32rem] rounded-2xl shadow-2xl flex flex-col z-40 overflow-hidden" style={{ background: '#111827', border: '1px solid rgba(255,255,255,0.1)' }}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: 'rgba(232,121,47,0.15)' }}>
            <MessageSquare size={14} color="#E8792F" />
          </div>
          <div>
            <p className="text-sm font-semibold text-white">PM Agent</p>
            <p className="text-[10px]" style={{ color: '#64748b' }}>AI Project Assistant</p>
          </div>
        </div>
        <button onClick={() => setOpen(false)} className="transition-colors" style={{ color: '#64748b' }}>
          <X size={18} />
        </button>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 && (
          <div className="text-center py-8">
            <p className="text-sm mb-4" style={{ color: '#64748b' }}>Ask me anything about this project</p>
            <div className="flex flex-wrap gap-2 justify-center">
              {SUGGESTIONS.map(s => (
                <button key={s} onClick={() => sendMessage(s)} className="text-[11px] px-3 py-1.5 rounded-full transition-colors" style={{ background: 'rgba(255,255,255,0.05)', color: '#94a3b8', border: '1px solid rgba(255,255,255,0.07)' }}>
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className="max-w-[80%] px-3 py-2 rounded-xl text-sm" style={msg.role === 'user' ? { background: '#E8792F', color: '#fff' } : { background: 'rgba(255,255,255,0.05)', color: '#e2e8f0' }}>
              <p className="whitespace-pre-wrap">{msg.content || (streaming && i === messages.length - 1 ? '...' : '')}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Input */}
      <div className="p-3" style={{ borderTop: '1px solid rgba(255,255,255,0.07)' }}>
        <form onSubmit={(e) => { e.preventDefault(); sendMessage(); }} className="flex gap-2">
          <input
            type="text" value={input} onChange={(e) => setInput(e.target.value)} placeholder="Ask PM Agent..."
            disabled={streaming}
            className="flex-1 text-sm px-3 py-2 rounded-lg outline-none disabled:opacity-50"
            style={{ background: 'rgba(255,255,255,0.05)', color: '#e2e8f0', border: '1px solid rgba(255,255,255,0.1)' }}
          />
          <button type="submit" disabled={!input.trim() || streaming} className="px-3 py-2 rounded-lg text-sm disabled:opacity-50 transition-colors" style={{ background: '#E8792F', color: '#fff' }}>
            <Send size={14} />
          </button>
        </form>
      </div>
    </div>
  );
}
