import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import api from '../../services/api';

const inputStyle = { background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff' };

export default function ClientForm({ client, onSave, onCancel }) {
  const [users, setUsers] = useState([]);
  const [form, setForm] = useState({
    name: client?.name || '',
    email: client?.email || '',
    phone: client?.phone || '',
    company: client?.company || '',
    notes: client?.notes || '',
    csUserId: client?.csUserId || '',
    opsUserId: client?.opsUserId || '',
  });

  useEffect(() => {
    api.get('/auth/users').then((res) => setUsers(res.data)).catch(() => {});
  }, []);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave({
      ...form,
      csUserId: form.csUserId || null,
      opsUserId: form.opsUserId || null,
    });
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50" style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(2px)' }}>
      <div className="glass w-full max-w-lg rounded-2xl p-6 max-h-[90vh] overflow-y-auto" style={{ boxShadow: '0 25px 50px rgba(0,0,0,0.5)' }}>
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-[13px] font-bold uppercase text-white" style={{ letterSpacing: '0.06em' }}>
            {client ? 'Edit Client' : 'New Client'}
          </h2>
          <button onClick={onCancel} className="transition-colors" style={{ color: '#475569' }} onMouseEnter={(e) => e.currentTarget.style.color = '#A0AEC0'} onMouseLeave={(e) => e.currentTarget.style.color = '#475569'}>
            <X size={18} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          {[
            { label: 'Name *', key: 'name', type: 'text', required: true },
            { label: 'Email', key: 'email', type: 'email' },
            { label: 'Phone', key: 'phone', type: 'text' },
            { label: 'Company', key: 'company', type: 'text' },
          ].map(({ label, key, type, required }) => (
            <div key={key}>
              <label className="block text-xs font-semibold uppercase mb-1.5" style={{ color: '#94a3b8', letterSpacing: '0.05em' }}>{label}</label>
              <input
                type={type}
                value={form[key]}
                onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                required={required}
                className="w-full px-3 py-2.5 rounded-lg text-sm outline-none transition-colors"
                style={inputStyle}
                onFocus={(e) => e.target.style.borderColor = 'rgba(232,121,47,0.5)'}
                onBlur={(e) => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}
              />
            </div>
          ))}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase mb-1.5" style={{ color: '#94a3b8', letterSpacing: '0.05em' }}>CS Assigned</label>
              <select
                value={form.csUserId}
                onChange={(e) => setForm({ ...form, csUserId: e.target.value })}
                className="w-full px-3 py-2.5 rounded-lg text-sm outline-none"
                style={inputStyle}
              >
                <option value="">-- None --</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>{u.name || u.email}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase mb-1.5" style={{ color: '#94a3b8', letterSpacing: '0.05em' }}>Ops Assigned</label>
              <select
                value={form.opsUserId}
                onChange={(e) => setForm({ ...form, opsUserId: e.target.value })}
                className="w-full px-3 py-2.5 rounded-lg text-sm outline-none"
                style={inputStyle}
              >
                <option value="">-- None --</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>{u.name || u.email}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase mb-1.5" style={{ color: '#94a3b8', letterSpacing: '0.05em' }}>Notes</label>
            <textarea
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              rows={3}
              className="w-full px-3 py-2.5 rounded-lg text-sm outline-none transition-colors resize-none"
              style={inputStyle}
              onFocus={(e) => e.target.style.borderColor = 'rgba(232,121,47,0.5)'}
              onBlur={(e) => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}
            />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onCancel} className="px-4 py-2 text-xs font-medium transition-colors" style={{ color: '#64748b' }}>
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-lg text-white text-[11px] font-bold uppercase transition-transform hover:-translate-y-0.5"
              style={{ background: 'linear-gradient(135deg, #E8792F, #c45c1a)', letterSpacing: '0.05em', boxShadow: '0 0 20px rgba(232,121,47,0.35), 0 2px 8px rgba(0,0,0,0.3)' }}
            >
              {client ? 'Save Changes' : 'Create Client'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
