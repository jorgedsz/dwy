import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Save } from 'lucide-react';
import { agentAPI } from '../../services/api';
import TrainingCallModal from './TrainingCallModal';

export default function AgentEdit() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [agent, setAgent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showTrainingModal, setShowTrainingModal] = useState(false);
  const [form, setForm] = useState({
    name: '',
    firstMessage: '',
    systemPromptBase: '',
    language: 'en',
    voice: '',
    vapiPublicKey: '',
  });

  const loadAgent = async () => {
    try {
      const { data } = await agentAPI.get(id);
      setAgent(data);
      setForm({
        name: data.name || '',
        firstMessage: data.firstMessage || '',
        systemPromptBase: data.systemPromptBase || '',
        language: data.language || 'en',
        voice: data.voice || '',
        vapiPublicKey: data.vapiPublicKey || '',
      });
    } catch (err) {
      console.error('Failed to load agent:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadAgent(); }, [id]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const { data } = await agentAPI.update(id, form);
      setAgent(data);
    } catch (err) {
      console.error('Failed to save agent:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleTrainingAccepted = () => {
    // Reload agent data to reflect training changes
    loadAgent();
  };

  if (loading) return <div style={{ color: '#64748b' }}>Loading agent...</div>;
  if (!agent) return <div style={{ color: '#f87171' }}>Agent not found</div>;

  return (
    <div>
      {/* Top bar */}
      <div className="flex items-center justify-between mb-7">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/agents')}
            className="p-1.5 rounded-lg transition-colors"
            style={{ color: '#94a3b8' }}
            onMouseEnter={e => e.currentTarget.style.color = '#fff'}
            onMouseLeave={e => e.currentTarget.style.color = '#94a3b8'}
          >
            <ArrowLeft size={18} />
          </button>
          <h1 className="text-[22px] font-extrabold text-white">{agent.name}</h1>
        </div>
        <div className="flex items-center gap-3">
          {/* Training Mode button */}
          <button
            onClick={() => setShowTrainingModal(true)}
            className="flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg transition-colors"
            style={{ color: '#E8792F', border: '1px solid rgba(232,121,47,0.3)', background: 'rgba(232,121,47,0.08)' }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(232,121,47,0.15)'}
            onMouseLeave={e => e.currentTarget.style.background = 'rgba(232,121,47,0.08)'}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
            </svg>
            Training Mode
          </button>
          {/* Save button */}
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-5 py-2 text-sm font-semibold text-white rounded-lg transition-colors disabled:opacity-50"
            style={{ background: '#E8792F' }}
            onMouseEnter={e => { if (!saving) e.currentTarget.style.background = '#d06a28'; }}
            onMouseLeave={e => e.currentTarget.style.background = '#E8792F'}
          >
            {saving ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
            ) : (
              <Save size={15} />
            )}
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>

      {/* Form */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Left column */}
        <div className="space-y-5">
          {/* Name */}
          <div className="glass rounded-xl p-5" style={{ border: '1px solid rgba(255,255,255,0.06)' }}>
            <label className="block text-[11px] font-semibold uppercase tracking-wider mb-2" style={{ color: '#64748b' }}>
              Agent Name
            </label>
            <input
              value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              className="w-full px-3 py-2 text-sm rounded-lg text-white"
              style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', outline: 'none' }}
            />
          </div>

          {/* First Message */}
          <div className="glass rounded-xl p-5" style={{ border: '1px solid rgba(255,255,255,0.06)' }}>
            <label className="block text-[11px] font-semibold uppercase tracking-wider mb-2" style={{ color: '#64748b' }}>
              First Message
            </label>
            <textarea
              value={form.firstMessage}
              onChange={e => setForm(f => ({ ...f, firstMessage: e.target.value }))}
              rows={3}
              className="w-full px-3 py-2 text-sm rounded-lg text-white resize-none"
              style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', outline: 'none' }}
              placeholder="What the agent says when it picks up..."
            />
          </div>

          {/* Language & Voice */}
          <div className="glass rounded-xl p-5" style={{ border: '1px solid rgba(255,255,255,0.06)' }}>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wider mb-2" style={{ color: '#64748b' }}>
                  Language
                </label>
                <select
                  value={form.language}
                  onChange={e => setForm(f => ({ ...f, language: e.target.value }))}
                  className="w-full px-3 py-2 text-sm rounded-lg text-white"
                  style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', outline: 'none' }}
                >
                  <option value="en">English</option>
                  <option value="es">Spanish</option>
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wider mb-2" style={{ color: '#64748b' }}>
                  Voice ID
                </label>
                <input
                  value={form.voice}
                  onChange={e => setForm(f => ({ ...f, voice: e.target.value }))}
                  className="w-full px-3 py-2 text-sm rounded-lg text-white"
                  style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', outline: 'none' }}
                  placeholder="11labs voice ID"
                />
              </div>
            </div>
          </div>

          {/* VAPI Public Key */}
          <div className="glass rounded-xl p-5" style={{ border: '1px solid rgba(255,255,255,0.06)' }}>
            <label className="block text-[11px] font-semibold uppercase tracking-wider mb-2" style={{ color: '#64748b' }}>
              VAPI Public Key
            </label>
            <input
              value={form.vapiPublicKey}
              onChange={e => setForm(f => ({ ...f, vapiPublicKey: e.target.value }))}
              className="w-full px-3 py-2 text-sm rounded-lg text-white font-mono"
              style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', outline: 'none' }}
              placeholder="pk_..."
            />
            <p className="text-[11px] mt-1.5" style={{ color: '#475569' }}>
              Required for Training Mode. Get it from your VAPI dashboard.
            </p>
          </div>
        </div>

        {/* Right column */}
        <div>
          {/* System Prompt */}
          <div className="glass rounded-xl p-5" style={{ border: '1px solid rgba(255,255,255,0.06)' }}>
            <label className="block text-[11px] font-semibold uppercase tracking-wider mb-2" style={{ color: '#64748b' }}>
              System Prompt
            </label>
            <textarea
              value={form.systemPromptBase}
              onChange={e => setForm(f => ({ ...f, systemPromptBase: e.target.value }))}
              rows={18}
              className="w-full px-3 py-2 text-sm rounded-lg text-white resize-none font-mono"
              style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', outline: 'none', lineHeight: '1.6' }}
              placeholder="Instructions for how the agent should behave..."
            />
          </div>
        </div>
      </div>

      {/* Training Modal */}
      {showTrainingModal && (
        <TrainingCallModal
          agent={agent}
          onClose={() => setShowTrainingModal(false)}
          onAccepted={handleTrainingAccepted}
        />
      )}
    </div>
  );
}
