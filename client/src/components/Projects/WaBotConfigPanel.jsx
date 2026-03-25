import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { waBotConfigAPI } from '../../services/api';

export default function WaBotConfigPanel() {
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [tagInput, setTagInput] = useState('');
  const [blockInput, setBlockInput] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => { loadConfig(); }, []);

  const loadConfig = async () => {
    try {
      const { data } = await waBotConfigAPI.get();
      setConfig(data.config);
    } catch (err) {
      console.error(err);
      // Fallback to defaults if API fails (e.g. table not yet created)
      setConfig({ teamKeywords: [], blockedGroups: [], enabled: true });
    } finally {
      setLoading(false);
    }
  };

  const save = async () => {
    setSaving(true); setSuccess('');
    try {
      const { data } = await waBotConfigAPI.update({ teamKeywords: config.teamKeywords, blockedGroups: config.blockedGroups, enabled: config.enabled });
      setConfig(data.config); setSuccess('Saved!'); setTimeout(() => setSuccess(''), 2000);
    } catch (err) { console.error(err); } finally { setSaving(false); }
  };

  const addTag = (field, input, setInput) => {
    const val = input.trim();
    if (!val || config[field].includes(val)) return;
    setConfig({ ...config, [field]: [...config[field], val] }); setInput('');
  };

  const removeTag = (field, idx) => setConfig({ ...config, [field]: config[field].filter((_, i) => i !== idx) });

  if (loading) return <div className="flex justify-center py-8"><div className="animate-spin rounded-full h-6 w-6 border-b-2" style={{ borderColor: '#E8792F' }} /></div>;
  if (!config) return null;

  const inputStyle = { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', color: '#e2e8f0' };

  return (
    <div className="space-y-5">
      {/* Enable toggle */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-white">Bot Enabled</h3>
          <p className="text-[11px]" style={{ color: '#64748b' }}>Process incoming WhatsApp messages</p>
        </div>
        <button onClick={() => setConfig({ ...config, enabled: !config.enabled })} className="w-11 h-6 rounded-full p-0.5 transition-colors" style={{ background: config.enabled ? '#E8792F' : 'rgba(255,255,255,0.1)' }}>
          <div className={`w-5 h-5 rounded-full bg-white transition-transform ${config.enabled ? 'translate-x-5' : 'translate-x-0'}`} />
        </button>
      </div>

      {/* Team Keywords */}
      <div>
        <label className="block text-sm font-semibold text-white mb-1">Team Keywords</label>
        <p className="text-[11px] mb-2" style={{ color: '#64748b' }}>Messages from senders matching these won't trigger alerts</p>
        <div className="flex gap-2 mb-2">
          <input type="text" value={tagInput} onChange={(e) => setTagInput(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addTag('teamKeywords', tagInput, setTagInput); } }} placeholder="Add keyword..." className="flex-1 text-sm px-3 py-2 rounded-lg outline-none" style={inputStyle} />
          <button onClick={() => addTag('teamKeywords', tagInput, setTagInput)} className="px-3 py-2 rounded-lg text-sm text-white" style={{ background: '#E8792F' }}>Add</button>
        </div>
        <div className="flex flex-wrap gap-2">
          {config.teamKeywords.map((kw, i) => (
            <span key={i} className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-[11px]" style={{ background: 'rgba(232,121,47,0.12)', color: '#E8792F', border: '1px solid rgba(232,121,47,0.2)' }}>
              {kw}
              <button onClick={() => removeTag('teamKeywords', i)}><X size={10} /></button>
            </span>
          ))}
        </div>
      </div>

      {/* Blocked Groups */}
      <div>
        <label className="block text-sm font-semibold text-white mb-1">Blocked Groups</label>
        <p className="text-[11px] mb-2" style={{ color: '#64748b' }}>Group chat IDs to ignore</p>
        <div className="flex gap-2 mb-2">
          <input type="text" value={blockInput} onChange={(e) => setBlockInput(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addTag('blockedGroups', blockInput, setBlockInput); } }} placeholder="Add group ID..." className="flex-1 text-sm px-3 py-2 rounded-lg outline-none font-mono" style={inputStyle} />
          <button onClick={() => addTag('blockedGroups', blockInput, setBlockInput)} className="px-3 py-2 rounded-lg text-sm text-white" style={{ background: '#E8792F' }}>Add</button>
        </div>
        <div className="flex flex-wrap gap-2">
          {config.blockedGroups.map((gid, i) => (
            <span key={i} className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-[11px] font-mono" style={{ background: 'rgba(255,255,255,0.05)', color: '#94a3b8', border: '1px solid rgba(255,255,255,0.1)' }}>
              {gid.length > 24 ? gid.slice(0, 12) + '...' + gid.slice(-12) : gid}
              <button onClick={() => removeTag('blockedGroups', i)}><X size={10} /></button>
            </span>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button onClick={save} disabled={saving} className="px-4 py-2 rounded-lg text-sm font-medium text-white disabled:opacity-50" style={{ background: '#E8792F' }}>{saving ? 'Saving...' : 'Save Configuration'}</button>
        {success && <span className="text-sm" style={{ color: '#22c55e' }}>{success}</span>}
      </div>
    </div>
  );
}
