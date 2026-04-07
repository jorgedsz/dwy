import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bot, Plus, Trash2, Copy } from 'lucide-react';
import { agentAPI } from '../../services/api';

export default function AgentsPage() {
  const [agents, setAgents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [creating, setCreating] = useState(false);
  const navigate = useNavigate();

  const load = async () => {
    try {
      const { data } = await agentAPI.list();
      setAgents(data);
    } catch (err) {
      console.error('Failed to load agents:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!newName.trim()) return;
    setCreating(true);
    try {
      const { data } = await agentAPI.create({ name: newName.trim() });
      navigate(`/agents/${data.id}`);
    } catch (err) {
      console.error('Failed to create agent:', err);
    } finally {
      setCreating(false);
    }
  };

  const handleDuplicate = async (e, id) => {
    e.stopPropagation();
    try {
      const { data } = await agentAPI.duplicate(id);
      setAgents(prev => [data, ...prev]);
    } catch (err) {
      console.error('Failed to duplicate agent:', err);
    }
  };

  const handleDelete = async (e, id) => {
    e.stopPropagation();
    if (!confirm('Delete this agent?')) return;
    try {
      await agentAPI.delete(id);
      setAgents(prev => prev.filter(a => a.id !== id));
    } catch (err) {
      console.error('Failed to delete agent:', err);
    }
  };

  if (loading) return <div style={{ color: '#64748b' }}>Loading agents...</div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-7">
        <h1 className="text-[28px] font-extrabold" style={{ background: 'linear-gradient(135deg, #fff 30%, #E8792F 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', letterSpacing: '-0.02em', lineHeight: '1.2' }}>
          AI Agents
        </h1>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white rounded-lg transition-colors"
          style={{ background: '#E8792F' }}
          onMouseEnter={e => e.currentTarget.style.background = '#d06a28'}
          onMouseLeave={e => e.currentTarget.style.background = '#E8792F'}
        >
          <Plus size={16} />
          New Agent
        </button>
      </div>

      {/* Create modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="glass rounded-xl w-full max-w-sm p-5" style={{ border: '1px solid rgba(255,255,255,0.1)' }}>
            <h3 className="text-base font-semibold text-white mb-4">Create Agent</h3>
            <form onSubmit={handleCreate}>
              <input
                autoFocus
                value={newName}
                onChange={e => setNewName(e.target.value)}
                placeholder="Agent name..."
                className="w-full px-3 py-2 text-sm rounded-lg text-white mb-4"
                style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', outline: 'none' }}
              />
              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => { setShowCreate(false); setNewName(''); }} className="px-3 py-1.5 text-sm rounded-lg" style={{ color: '#94a3b8' }}>
                  Cancel
                </button>
                <button type="submit" disabled={creating || !newName.trim()} className="px-4 py-1.5 text-sm font-semibold text-white rounded-lg disabled:opacity-50" style={{ background: '#E8792F' }}>
                  {creating ? 'Creating...' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {agents.length === 0 ? (
        <div className="glass rounded-xl p-12 text-center">
          <Bot size={48} className="mx-auto mb-4" style={{ color: '#475569' }} />
          <p className="text-sm" style={{ color: '#64748b' }}>No agents yet. Create one to get started.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {agents.map(agent => (
            <div
              key={agent.id}
              onClick={() => navigate(`/agents/${agent.id}`)}
              className="glass rounded-xl p-5 cursor-pointer transition-all group"
              style={{ border: '1px solid rgba(255,255,255,0.06)' }}
              onMouseEnter={e => e.currentTarget.style.borderColor = 'rgba(232,121,47,0.3)'}
              onMouseLeave={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)'}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: 'rgba(232,121,47,0.1)' }}>
                    <Bot size={20} style={{ color: '#E8792F' }} />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-white">{agent.name}</h3>
                    <p className="text-xs" style={{ color: '#64748b' }}>
                      {agent.language === 'es' ? 'Spanish' : 'English'}
                      {agent.vapiId && ' \u00B7 Synced to VAPI'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={(e) => handleDuplicate(e, agent.id)}
                    className="opacity-0 group-hover:opacity-100 p-1.5 rounded transition-all"
                    style={{ color: '#64748b' }}
                    onMouseEnter={e => e.currentTarget.style.color = '#E8792F'}
                    onMouseLeave={e => e.currentTarget.style.color = '#64748b'}
                    title="Duplicate"
                  >
                    <Copy size={14} />
                  </button>
                  <button
                    onClick={(e) => handleDelete(e, agent.id)}
                    className="opacity-0 group-hover:opacity-100 p-1.5 rounded transition-all"
                    style={{ color: '#64748b' }}
                    onMouseEnter={e => e.currentTarget.style.color = '#f87171'}
                    onMouseLeave={e => e.currentTarget.style.color = '#64748b'}
                    title="Delete"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
              {agent.firstMessage && (
                <p className="mt-3 text-xs truncate" style={{ color: '#94a3b8' }}>
                  {agent.firstMessage}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
