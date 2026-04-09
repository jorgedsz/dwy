import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, MessageSquare, Trash2 } from 'lucide-react';
import { chatbotAPI } from '../../services/api';

export default function ChatbotsPage() {
  const navigate = useNavigate();
  const [chatbots, setChatbots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  const load = async () => {
    try {
      const { data } = await chatbotAPI.list();
      setChatbots(data);
    } catch (err) {
      console.error('Failed to load chatbots:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleCreate = async () => {
    setCreating(true);
    try {
      const { data } = await chatbotAPI.create({ name: 'New Chatbot' });
      navigate(`/chatbots/${data.id}`);
    } catch (err) {
      console.error('Failed to create chatbot:', err);
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (e, id) => {
    e.stopPropagation();
    if (!window.confirm('Delete this chatbot?')) return;
    try {
      await chatbotAPI.delete(id);
      setChatbots(prev => prev.filter(c => c.id !== id));
    } catch (err) {
      console.error('Failed to delete chatbot:', err);
    }
  };

  if (loading) return <div style={{ color: '#64748b' }}>Loading chatbots...</div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-7">
        <h1 className="text-[22px] font-extrabold text-white">Chatbots</h1>
        <button
          onClick={handleCreate}
          disabled={creating}
          className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white rounded-lg transition-colors disabled:opacity-50"
          style={{ background: '#E8792F' }}
          onMouseEnter={e => { if (!creating) e.currentTarget.style.background = '#d06a28'; }}
          onMouseLeave={e => e.currentTarget.style.background = '#E8792F'}
        >
          <Plus size={15} />
          New Chatbot
        </button>
      </div>

      {chatbots.length === 0 ? (
        <div className="glass rounded-xl p-10 text-center" style={{ border: '1px solid rgba(255,255,255,0.06)' }}>
          <MessageSquare size={40} className="mx-auto mb-3" style={{ color: '#334155' }} />
          <p className="text-sm" style={{ color: '#64748b' }}>No chatbots yet. Create one to get started.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {chatbots.map(bot => {
            let ruleCount = 0;
            try {
              const cfg = bot.config ? JSON.parse(bot.config) : {};
              ruleCount = cfg.followUpRulesConfig?.rules?.length || 0;
            } catch { /* ignore */ }

            return (
              <div
                key={bot.id}
                onClick={() => navigate(`/chatbots/${bot.id}`)}
                className="glass rounded-xl p-5 cursor-pointer transition-all hover:scale-[1.01]"
                style={{ border: '1px solid rgba(255,255,255,0.06)' }}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <MessageSquare size={16} style={{ color: '#E8792F' }} />
                    <h3 className="text-sm font-semibold text-white">{bot.name}</h3>
                  </div>
                  <button
                    onClick={(e) => handleDelete(e, bot.id)}
                    className="p-1 rounded transition-colors"
                    style={{ color: '#475569' }}
                    onMouseEnter={e => e.currentTarget.style.color = '#f87171'}
                    onMouseLeave={e => e.currentTarget.style.color = '#475569'}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
                <div className="flex items-center gap-3 text-[11px]" style={{ color: '#64748b' }}>
                  <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${bot.active ? 'text-emerald-400 bg-emerald-400/10' : 'text-red-400 bg-red-400/10'}`}>
                    {bot.active ? 'Active' : 'Inactive'}
                  </span>
                  {ruleCount > 0 && (
                    <span>{ruleCount} follow-up rule{ruleCount !== 1 ? 's' : ''}</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
