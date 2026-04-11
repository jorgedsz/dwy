import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Save, Loader2, Copy, Check, ChevronDown, ChevronRight } from 'lucide-react';
import { chatbotAPI } from '../../services/api';

export default function ChatbotEdit() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isNew = id === 'new';

  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const [batchingExpanded, setBatchingExpanded] = useState(false);

  const [form, setForm] = useState({
    name: '',
    n8nWebhookUrl: '',
    active: true,
  });
  const [bufferSeconds, setBufferSeconds] = useState(0);
  const [systemPrompt, setSystemPrompt] = useState('');
  const [modelName, setModelName] = useState('');

  useEffect(() => {
    if (isNew) return;
    chatbotAPI.get(id)
      .then(({ data }) => {
        setForm({
          name: data.name || '',
          n8nWebhookUrl: data.n8nWebhookUrl || '',
          active: data.active !== false,
        });
        let config = {};
        try { config = data.config ? JSON.parse(data.config) : {}; } catch { /* ignore */ }
        setBufferSeconds(config.bufferSeconds || 0);
        setSystemPrompt(config.systemPrompt || '');
        setModelName(config.modelName || '');
      })
      .catch(err => console.error('Failed to load chatbot:', err))
      .finally(() => setLoading(false));
  }, [id]);

  const handleSave = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      const config = {};
      if (systemPrompt) config.systemPrompt = systemPrompt;
      if (modelName) config.modelName = modelName;
      config.bufferSeconds = bufferSeconds;

      const payload = {
        name: form.name,
        n8nWebhookUrl: form.n8nWebhookUrl,
        active: form.active,
        config,
      };

      if (isNew) {
        const { data } = await chatbotAPI.create(payload);
        navigate(`/chatbots/${data.id}`, { replace: true });
      } else {
        await chatbotAPI.update(id, payload);
      }
    } catch (err) {
      console.error('Save failed:', err);
    } finally {
      setSaving(false);
    }
  };

  const copyWebhookUrl = () => {
    if (isNew) return;
    const url = `${window.location.origin}/api/chatbots/${id}/webhook`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const glassStyle = {
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: '12px',
  };

  const inputStyle = {
    background: 'rgba(255,255,255,0.06)',
    border: '1px solid rgba(255,255,255,0.10)',
    borderRadius: '8px',
    color: '#fff',
  };

  if (loading) {
    return (
      <div className="dot-bg min-h-screen flex items-center justify-center">
        <Loader2 className="animate-spin" size={24} style={{ color: '#E8792F' }} />
      </div>
    );
  }

  return (
    <div className="dot-bg min-h-screen p-6">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={() => navigate('/chatbots')}
            className="p-2 rounded-lg hover:bg-white/5 transition"
            style={{ color: '#94a3b8' }}
          >
            <ArrowLeft size={18} />
          </button>
          <h1 className="text-xl font-bold text-white">
            {isNew ? 'New Chatbot' : 'Edit Chatbot'}
          </h1>
          <div className="flex-1" />
          <button
            onClick={handleSave}
            disabled={saving || !form.name.trim()}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition disabled:opacity-50"
            style={{ background: '#E8792F', color: '#fff' }}
          >
            {saving ? <Loader2 className="animate-spin" size={14} /> : <Save size={14} />}
            Save
          </button>
        </div>

        {/* Basic Info */}
        <div className="p-5 mb-4" style={glassStyle}>
          <h2 className="text-sm font-semibold text-white mb-4">Basic Info</h2>

          <label className="block mb-3">
            <span className="text-xs font-medium" style={{ color: '#94a3b8' }}>Name</span>
            <input
              type="text"
              value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              className="w-full mt-1 px-3 py-2 text-sm outline-none"
              style={inputStyle}
              placeholder="My Chatbot"
            />
          </label>

          <label className="block mb-3">
            <span className="text-xs font-medium" style={{ color: '#94a3b8' }}>n8n Webhook URL</span>
            <input
              type="text"
              value={form.n8nWebhookUrl}
              onChange={e => setForm(f => ({ ...f, n8nWebhookUrl: e.target.value }))}
              className="w-full mt-1 px-3 py-2 text-sm outline-none"
              style={inputStyle}
              placeholder="https://your-n8n.com/webhook/..."
            />
          </label>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={form.active}
              onChange={e => setForm(f => ({ ...f, active: e.target.checked }))}
              className="accent-[#E8792F]"
            />
            <span className="text-sm" style={{ color: '#94a3b8' }}>Active</span>
          </label>
        </div>

        {/* Webhook URL (only for existing chatbots) */}
        {!isNew && (
          <div className="p-5 mb-4" style={glassStyle}>
            <h2 className="text-sm font-semibold text-white mb-2">Webhook URL</h2>
            <p className="text-xs mb-3" style={{ color: '#64748b' }}>
              Send POST requests to this URL to trigger the chatbot.
            </p>
            <div className="flex items-center gap-2">
              <code
                className="flex-1 px-3 py-2 text-xs rounded-lg truncate"
                style={{ background: 'rgba(255,255,255,0.06)', color: '#94a3b8', border: '1px solid rgba(255,255,255,0.08)' }}
              >
                {`${window.location.origin}/api/chatbots/${id}/webhook`}
              </code>
              <button
                onClick={copyWebhookUrl}
                className="p-2 rounded-lg hover:bg-white/5 transition"
                style={{ color: copied ? '#4ade80' : '#94a3b8' }}
              >
                {copied ? <Check size={16} /> : <Copy size={16} />}
              </button>
            </div>
          </div>
        )}

        {/* AI Config */}
        <div className="p-5 mb-4" style={glassStyle}>
          <h2 className="text-sm font-semibold text-white mb-4">AI Configuration</h2>

          <label className="block mb-3">
            <span className="text-xs font-medium" style={{ color: '#94a3b8' }}>System Prompt</span>
            <textarea
              value={systemPrompt}
              onChange={e => setSystemPrompt(e.target.value)}
              rows={4}
              className="w-full mt-1 px-3 py-2 text-sm outline-none resize-y"
              style={inputStyle}
              placeholder="You are a helpful assistant..."
            />
          </label>

          <label className="block">
            <span className="text-xs font-medium" style={{ color: '#94a3b8' }}>Model</span>
            <input
              type="text"
              value={modelName}
              onChange={e => setModelName(e.target.value)}
              className="w-full mt-1 px-3 py-2 text-sm outline-none"
              style={inputStyle}
              placeholder="gpt-4o"
            />
          </label>
        </div>

        {/* Message Batching */}
        <div className="mb-4" style={glassStyle}>
          <button
            onClick={() => setBatchingExpanded(!batchingExpanded)}
            className="w-full p-5 flex items-center gap-2 text-left"
          >
            {batchingExpanded ? (
              <ChevronDown size={16} style={{ color: '#94a3b8' }} />
            ) : (
              <ChevronRight size={16} style={{ color: '#94a3b8' }} />
            )}
            <h2 className="text-sm font-semibold text-white">Message Batching</h2>
            <span className="text-xs ml-auto" style={{ color: bufferSeconds > 0 ? '#E8792F' : '#475569' }}>
              {bufferSeconds > 0 ? `${bufferSeconds}s delay` : 'Off'}
            </span>
          </button>

          {batchingExpanded && (
            <div className="px-5 pb-5 -mt-2">
              <p className="text-xs mb-3" style={{ color: '#64748b' }}>
                When enabled, incoming messages are buffered for the specified duration.
                If another message arrives during the wait, the timer resets.
                All buffered messages are merged into a single request to n8n,
                so the AI responds once instead of per-message.
              </p>

              <label className="block mb-3">
                <span className="text-xs font-medium" style={{ color: '#94a3b8' }}>
                  Buffer delay (seconds)
                </span>
                <div className="flex items-center gap-3 mt-1">
                  <input
                    type="number"
                    min={0}
                    max={30}
                    value={bufferSeconds}
                    onChange={e => setBufferSeconds(Math.max(0, Math.min(30, parseInt(e.target.value) || 0)))}
                    className="w-24 px-3 py-2 text-sm outline-none"
                    style={inputStyle}
                  />
                  <span className="text-xs" style={{ color: '#64748b' }}>
                    {bufferSeconds === 0 ? 'Disabled — messages forwarded immediately' : `${bufferSeconds}s`}
                  </span>
                </div>
              </label>

              {bufferSeconds > 0 && (
                <div
                  className="p-3 rounded-lg text-xs"
                  style={{ background: 'rgba(232,121,47,0.08)', border: '1px solid rgba(232,121,47,0.20)', color: '#E8792F' }}
                >
                  When buffering is active, the webhook returns <code className="font-mono">{'{ "queued": true }'}</code> immediately
                  instead of the n8n response. The merged message is forwarded after {bufferSeconds}s of silence.
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
