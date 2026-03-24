import { useState } from 'react';
import { X } from 'lucide-react';

const inputStyle = { background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff' };

export default function SessionForm({ session, onSave, onCancel }) {
  const [form, setForm] = useState({
    type: session?.type || 'lesson',
    title: session?.title || '',
    date: session?.date ? new Date(session.date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
    recordingUrl: session?.recordingUrl || '',
    transcription: session?.transcription || '',
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(form);
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50" style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(2px)' }}>
      <div className="glass w-full max-w-lg rounded-2xl p-6 max-h-[90vh] overflow-y-auto" style={{ boxShadow: '0 25px 50px rgba(0,0,0,0.5)' }}>
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-[13px] font-bold uppercase text-white" style={{ letterSpacing: '0.06em' }}>
            {session ? 'Edit Session' : 'New Session'}
          </h2>
          <button onClick={onCancel} style={{ color: '#475569' }}>
            <X size={18} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase mb-1.5" style={{ color: '#94a3b8', letterSpacing: '0.05em' }}>Type</label>
            <select
              value={form.type}
              onChange={(e) => setForm({ ...form, type: e.target.value })}
              className="w-full px-3 py-2.5 rounded-lg text-sm outline-none"
              style={inputStyle}
            >
              <option value="lesson">Lesson</option>
              <option value="commercial_call">Commercial Call</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase mb-1.5" style={{ color: '#94a3b8', letterSpacing: '0.05em' }}>Title *</label>
            <input
              type="text"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              required
              className="w-full px-3 py-2.5 rounded-lg text-sm outline-none transition-colors"
              style={inputStyle}
              onFocus={(e) => e.target.style.borderColor = 'rgba(232,121,47,0.5)'}
              onBlur={(e) => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}
            />
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase mb-1.5" style={{ color: '#94a3b8', letterSpacing: '0.05em' }}>Date *</label>
            <input
              type="date"
              value={form.date}
              onChange={(e) => setForm({ ...form, date: e.target.value })}
              required
              className="w-full px-3 py-2.5 rounded-lg text-sm outline-none transition-colors"
              style={inputStyle}
              onFocus={(e) => e.target.style.borderColor = 'rgba(232,121,47,0.5)'}
              onBlur={(e) => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}
            />
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase mb-1.5" style={{ color: '#94a3b8', letterSpacing: '0.05em' }}>Recording URL</label>
            <input
              type="url"
              value={form.recordingUrl}
              onChange={(e) => setForm({ ...form, recordingUrl: e.target.value })}
              placeholder="YouTube, Loom, Vimeo, Google Drive..."
              className="w-full px-3 py-2.5 rounded-lg text-sm outline-none transition-colors"
              style={inputStyle}
              onFocus={(e) => e.target.style.borderColor = 'rgba(232,121,47,0.5)'}
              onBlur={(e) => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}
            />
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase mb-1.5" style={{ color: '#94a3b8', letterSpacing: '0.05em' }}>Transcription</label>
            <textarea
              value={form.transcription}
              onChange={(e) => setForm({ ...form, transcription: e.target.value })}
              rows={6}
              placeholder="Paste session transcription here... AI summary will be generated automatically."
              className="w-full px-3 py-2.5 rounded-lg text-sm outline-none transition-colors resize-none"
              style={inputStyle}
              onFocus={(e) => e.target.style.borderColor = 'rgba(232,121,47,0.5)'}
              onBlur={(e) => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}
            />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onCancel} className="px-4 py-2 text-xs font-medium" style={{ color: '#64748b' }}>
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-lg text-white text-[11px] font-bold uppercase transition-transform hover:-translate-y-0.5"
              style={{ background: 'linear-gradient(135deg, #E8792F, #c45c1a)', letterSpacing: '0.05em', boxShadow: '0 0 20px rgba(232,121,47,0.35), 0 2px 8px rgba(0,0,0,0.3)' }}
            >
              {session ? 'Save Changes' : 'Create Session'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
