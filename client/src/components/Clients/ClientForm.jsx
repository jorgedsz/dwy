import { useState, useEffect } from 'react';
import { X, Check } from 'lucide-react';
import api from '../../services/api';

const inputStyle = { background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff' };

function MultiUserSelect({ label, users, selected, onChange, color }) {
  const [open, setOpen] = useState(false);

  const toggle = (id) => {
    onChange(selected.includes(id) ? selected.filter((x) => x !== id) : [...selected, id]);
  };

  const selectedUsers = users.filter((u) => selected.includes(u.id));

  return (
    <div className="relative">
      <label className="block text-xs font-semibold uppercase mb-1.5" style={{ color: '#94a3b8', letterSpacing: '0.05em' }}>{label}</label>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full px-3 py-2.5 rounded-lg text-sm text-left outline-none transition-colors"
        style={{ ...inputStyle, borderColor: open ? 'rgba(232,121,47,0.5)' : 'rgba(255,255,255,0.1)' }}
      >
        {selectedUsers.length === 0 ? (
          <span style={{ color: '#475569' }}>Select users...</span>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {selectedUsers.map((u) => (
              <span
                key={u.id}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold"
                style={{ background: `${color}18`, color, border: `1px solid ${color}30` }}
              >
                {u.name || u.email}
                <X
                  size={10}
                  className="cursor-pointer opacity-60 hover:opacity-100"
                  onClick={(e) => { e.stopPropagation(); toggle(u.id); }}
                />
              </span>
            ))}
          </div>
        )}
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div
            className="absolute top-full left-0 right-0 mt-1 rounded-lg overflow-hidden z-20 max-h-48 overflow-y-auto"
            style={{ background: 'rgba(10,15,30,0.98)', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 8px 32px rgba(0,0,0,0.5)' }}
          >
            {users.map((u) => {
              const isSelected = selected.includes(u.id);
              return (
                <button
                  key={u.id}
                  type="button"
                  onClick={() => toggle(u.id)}
                  className="w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors"
                  style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}
                  onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.04)'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                >
                  <div
                    className="w-5 h-5 rounded flex items-center justify-center shrink-0"
                    style={isSelected
                      ? { background: color, border: `1px solid ${color}` }
                      : { background: 'transparent', border: '1px solid rgba(255,255,255,0.15)' }
                    }
                  >
                    {isSelected && <Check size={12} className="text-white" />}
                  </div>
                  <div className="min-w-0">
                    <div className="text-[13px] font-medium text-white truncate">{u.name || u.email}</div>
                    {u.name && <div className="text-[10px] truncate" style={{ color: '#475569' }}>{u.email}</div>}
                  </div>
                </button>
              );
            })}
            {users.length === 0 && (
              <div className="px-3 py-4 text-xs text-center" style={{ color: '#475569' }}>No users found</div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

export default function ClientForm({ client, onSave, onCancel }) {
  const [users, setUsers] = useState([]);
  const [form, setForm] = useState({
    name: client?.name || '',
    email: client?.email || '',
    phone: client?.phone || '',
    company: client?.company || '',
    notes: client?.notes || '',
  });

  const existingCs = (client?.assignments || []).filter((a) => a.role === 'cs').map((a) => a.userId);
  const existingOps = (client?.assignments || []).filter((a) => a.role === 'ops').map((a) => a.userId);

  const [csUserIds, setCsUserIds] = useState(existingCs);
  const [opsUserIds, setOpsUserIds] = useState(existingOps);

  useEffect(() => {
    api.get('/auth/users').then((res) => setUsers(res.data)).catch(() => {});
  }, []);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave({ ...form, csUserIds, opsUserIds });
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
            <MultiUserSelect label="CS Assigned" users={users} selected={csUserIds} onChange={setCsUserIds} color="#3b82f6" />
            <MultiUserSelect label="Ops Assigned" users={users} selected={opsUserIds} onChange={setOpsUserIds} color="#a855f7" />
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
