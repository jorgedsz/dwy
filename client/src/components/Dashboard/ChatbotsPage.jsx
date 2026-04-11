import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Plus, Bot, Loader2, Trash2, Settings } from 'lucide-react';
import { chatbotAPI } from '../../services/api';

export default function ChatbotsPage() {
  const [chatbots, setChatbots] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    chatbotAPI.list()
      .then(({ data }) => setChatbots(data || []))
      .catch(err => console.error('Failed to load chatbots:', err))
      .finally(() => setLoading(false));
  }, []);

  async function handleDelete(id) {
    if (!confirm('Delete this chatbot?')) return;
    try {
      await chatbotAPI.delete(id);
      setChatbots(prev => prev.filter(c => c.id !== id));
    } catch (err) {
      console.error('Delete failed:', err);
    }
  }

  const glassStyle = {
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: '12px',
  };

  return (
    <div className="dot-bg min-h-screen p-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-xl font-bold text-white">Chatbots</h1>
          <button
            onClick={() => navigate('/chatbots/new')}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition"
            style={{ background: '#E8792F', color: '#fff' }}
          >
            <Plus size={16} /> New Chatbot
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-48">
            <Loader2 className="animate-spin" size={24} style={{ color: '#E8792F' }} />
          </div>
        ) : chatbots.length === 0 ? (
          <div className="text-center py-16" style={glassStyle}>
            <Bot size={40} className="mx-auto mb-3" style={{ color: '#475569' }} />
            <p className="text-sm" style={{ color: '#94a3b8' }}>No chatbots yet. Create your first one!</p>
          </div>
        ) : (
          <div className="space-y-3">
            {chatbots.map(bot => (
              <div key={bot.id} className="p-4 flex items-center justify-between" style={glassStyle}>
                <Link to={`/chatbots/${bot.id}`} className="flex-1 min-w-0">
                  <h3 className="text-sm font-medium text-white truncate">{bot.name}</h3>
                  <p className="text-xs mt-0.5" style={{ color: '#64748b' }}>
                    {bot.active ? 'Active' : 'Disabled'}
                    {bot.n8nWebhookUrl ? ' · n8n connected' : ''}
                  </p>
                </Link>
                <div className="flex items-center gap-2 ml-3">
                  <button
                    onClick={() => navigate(`/chatbots/${bot.id}`)}
                    className="p-2 rounded-lg hover:bg-white/5 transition"
                    style={{ color: '#94a3b8' }}
                  >
                    <Settings size={16} />
                  </button>
                  <button
                    onClick={() => handleDelete(bot.id)}
                    className="p-2 rounded-lg hover:bg-white/5 transition"
                    style={{ color: '#f87171' }}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
