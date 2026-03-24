import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Edit, Trash2, Plus, Phone, Mail, Building, User, Calendar, Video, FileText, Clock } from 'lucide-react';
import api from '../../services/api';
import ClientForm from './ClientForm';
import SessionForm from '../Sessions/SessionForm';

export default function ClientDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [client, setClient] = useState(null);
  const [editing, setEditing] = useState(false);
  const [showSessionForm, setShowSessionForm] = useState(false);
  const [tab, setTab] = useState('profile');
  const [typeFilter, setTypeFilter] = useState('all');
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try {
      const res = await api.get(`/clients/${id}`);
      setClient(res.data);
    } catch (err) {
      console.error('Load client error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [id]);

  const handleUpdate = async (data) => {
    try {
      await api.put(`/clients/${id}`, data);
      setEditing(false);
      load();
    } catch (err) {
      console.error('Update client error:', err);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Delete this client and all their sessions?')) return;
    try {
      await api.delete(`/clients/${id}`);
      navigate('/clients');
    } catch (err) {
      console.error('Delete client error:', err);
    }
  };

  const handleCreateSession = async (data) => {
    try {
      await api.post('/sessions', { ...data, clientId: parseInt(id) });
      setShowSessionForm(false);
      load();
    } catch (err) {
      console.error('Create session error:', err);
    }
  };

  if (loading) return <div style={{ color: '#64748b' }}>Loading...</div>;
  if (!client) return <div style={{ color: '#64748b' }}>Client not found</div>;

  const filteredSessions = typeFilter === 'all'
    ? client.sessions
    : client.sessions.filter((s) => s.type === typeFilter);

  const totalCalls = client.sessions.filter((s) => s.type === 'commercial_call').length;
  const totalLessons = client.sessions.filter((s) => s.type === 'lesson').length;
  const lastSession = client.sessions.length > 0
    ? new Date(client.sessions[0].date).toLocaleDateString()
    : null;
  const initials = client.name.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2);

  return (
    <div>
      <Link to="/clients" className="inline-flex items-center gap-2 text-xs mb-5 transition-colors" style={{ color: '#64748b' }}
        onMouseEnter={(e) => e.currentTarget.style.color = '#E8792F'}
        onMouseLeave={(e) => e.currentTarget.style.color = '#64748b'}
      >
        <ArrowLeft size={14} />
        Back to clients
      </Link>

      {/* Header */}
      <div className="glass rounded-xl p-6 mb-6">
        <div className="flex items-center gap-5">
          <div
            className="w-16 h-16 rounded-xl flex items-center justify-center text-xl font-extrabold shrink-0"
            style={{ background: 'linear-gradient(135deg, #E8792F, #c45c1a)', color: '#fff', boxShadow: '0 0 24px rgba(232,121,47,0.3)' }}
          >
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-extrabold text-white">{client.name}</h1>
            <div className="flex flex-wrap gap-4 mt-1">
              {client.company && (
                <span className="flex items-center gap-1.5 text-xs" style={{ color: '#A0AEC0' }}><Building size={13} />{client.company}</span>
              )}
              {client.email && (
                <span className="flex items-center gap-1.5 text-xs" style={{ color: '#64748b' }}><Mail size={13} />{client.email}</span>
              )}
            </div>
          </div>
          <div className="flex gap-1">
            <button onClick={() => setEditing(true)} className="p-2 rounded-lg transition-colors" style={{ color: '#475569' }}
              onMouseEnter={(e) => { e.currentTarget.style.color = '#E8792F'; e.currentTarget.style.background = 'rgba(232,121,47,0.1)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.color = '#475569'; e.currentTarget.style.background = 'transparent'; }}
            >
              <Edit size={16} />
            </button>
            <button onClick={handleDelete} className="p-2 rounded-lg transition-colors" style={{ color: '#475569' }}
              onMouseEnter={(e) => { e.currentTarget.style.color = '#f87171'; e.currentTarget.style.background = 'rgba(239,68,68,0.1)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.color = '#475569'; e.currentTarget.style.background = 'transparent'; }}
            >
              <Trash2 size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6">
        {[
          { key: 'profile', label: 'Profile', icon: User },
          { key: 'sessions', label: 'Sessions', icon: Video },
        ].map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-[11px] font-bold uppercase transition-all"
            style={{
              letterSpacing: '0.05em',
              ...(tab === key
                ? { background: 'rgba(232,121,47,0.10)', color: '#E8792F', border: '1px solid rgba(232,121,47,0.25)' }
                : { background: 'rgba(255,255,255,0.04)', color: '#64748b', border: '1px solid transparent' })
            }}
          >
            <Icon size={14} />
            {label}
          </button>
        ))}
      </div>

      {/* Profile Tab */}
      {tab === 'profile' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Stats */}
          <div className="lg:col-span-3 grid grid-cols-2 md:grid-cols-4 gap-3.5">
            <div className="glass rounded-xl p-4 relative overflow-hidden">
              <div className="absolute bottom-0 left-0 right-0 h-0.5" style={{ background: 'linear-gradient(90deg, #60a5fa, transparent)' }} />
              <div className="flex items-center gap-2 mb-1">
                <Video size={14} style={{ color: '#60a5fa' }} />
                <span className="text-[10px] font-semibold uppercase" style={{ color: '#475569', letterSpacing: '0.06em' }}>Total Sessions</span>
              </div>
              <div className="text-2xl font-extrabold text-white">{client.sessions.length}</div>
            </div>
            <div className="glass rounded-xl p-4 relative overflow-hidden">
              <div className="absolute bottom-0 left-0 right-0 h-0.5" style={{ background: 'linear-gradient(90deg, #a855f7, transparent)' }} />
              <div className="flex items-center gap-2 mb-1">
                <Phone size={14} style={{ color: '#a855f7' }} />
                <span className="text-[10px] font-semibold uppercase" style={{ color: '#475569', letterSpacing: '0.06em' }}>Calls</span>
              </div>
              <div className="text-2xl font-extrabold text-white">{totalCalls}</div>
            </div>
            <div className="glass rounded-xl p-4 relative overflow-hidden">
              <div className="absolute bottom-0 left-0 right-0 h-0.5" style={{ background: 'linear-gradient(90deg, #4ade80, transparent)' }} />
              <div className="flex items-center gap-2 mb-1">
                <FileText size={14} style={{ color: '#4ade80' }} />
                <span className="text-[10px] font-semibold uppercase" style={{ color: '#475569', letterSpacing: '0.06em' }}>Lessons</span>
              </div>
              <div className="text-2xl font-extrabold text-white">{totalLessons}</div>
            </div>
            <div className="glass rounded-xl p-4 relative overflow-hidden">
              <div className="absolute bottom-0 left-0 right-0 h-0.5" style={{ background: 'linear-gradient(90deg, #E8792F, transparent)' }} />
              <div className="flex items-center gap-2 mb-1">
                <Clock size={14} style={{ color: '#E8792F' }} />
                <span className="text-[10px] font-semibold uppercase" style={{ color: '#475569', letterSpacing: '0.06em' }}>Last Session</span>
              </div>
              <div className="text-sm font-bold text-white">{lastSession || 'N/A'}</div>
            </div>
          </div>

          {/* Contact Info */}
          <div className="lg:col-span-2">
            <h2 className="text-[13px] font-bold uppercase mb-3" style={{ color: '#A0AEC0', letterSpacing: '0.06em' }}>Contact Information</h2>
            <div className="glass rounded-xl p-5 space-y-4">
              {[
                { icon: User, label: 'Full Name', value: client.name },
                { icon: Mail, label: 'Email', value: client.email },
                { icon: Phone, label: 'Phone', value: client.phone },
                { icon: Building, label: 'Company', value: client.company },
                { icon: Calendar, label: 'Client Since', value: new Date(client.createdAt).toLocaleDateString() },
              ].map(({ icon: Icon, label, value }) => (
                <div key={label} className="flex items-center gap-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.04)', paddingBottom: '12px' }}>
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: 'rgba(232,121,47,0.08)', border: '1px solid rgba(232,121,47,0.15)' }}>
                    <Icon size={14} style={{ color: '#E8792F' }} />
                  </div>
                  <div className="min-w-0">
                    <div className="text-[10px] font-semibold uppercase" style={{ color: '#475569', letterSpacing: '0.05em' }}>{label}</div>
                    <div className="text-[13px] font-medium text-white truncate">{value || <span style={{ color: '#334155' }}>Not provided</span>}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div>
            <h2 className="text-[13px] font-bold uppercase mb-3" style={{ color: '#A0AEC0', letterSpacing: '0.06em' }}>Notes</h2>
            <div className="glass rounded-xl p-5 h-[calc(100%-32px)]">
              {client.notes ? (
                <p className="text-[13px] whitespace-pre-wrap" style={{ color: '#cbd5e0', lineHeight: '1.65' }}>{client.notes}</p>
              ) : (
                <p className="text-xs" style={{ color: '#334155' }}>No notes added yet. Click edit to add notes about this client.</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Sessions Tab */}
      {tab === 'sessions' && (
        <>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <h2 className="text-[13px] font-bold uppercase text-white" style={{ letterSpacing: '0.06em' }}>Sessions</h2>
              <div className="flex gap-1">
                {['all', 'commercial_call', 'lesson'].map((t) => (
                  <button
                    key={t}
                    onClick={() => setTypeFilter(t)}
                    className="px-3 py-1 text-[10px] font-bold uppercase rounded-lg transition-all"
                    style={{
                      letterSpacing: '0.04em',
                      ...(typeFilter === t
                        ? { background: 'rgba(232,121,47,0.10)', color: '#E8792F', border: '1px solid rgba(232,121,47,0.25)' }
                        : { background: 'rgba(255,255,255,0.04)', color: '#64748b', border: '1px solid transparent' })
                    }}
                  >
                    {t === 'all' ? 'All' : t === 'commercial_call' ? 'Calls' : 'Lessons'}
                  </button>
                ))}
              </div>
            </div>
            <button
              onClick={() => setShowSessionForm(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-white text-[11px] font-bold uppercase transition-transform hover:-translate-y-0.5"
              style={{ background: 'linear-gradient(135deg, #E8792F, #c45c1a)', letterSpacing: '0.05em', boxShadow: '0 0 20px rgba(232,121,47,0.35), 0 2px 8px rgba(0,0,0,0.3)' }}
            >
              <Plus size={14} />
              Add Session
            </button>
          </div>

          {filteredSessions.length === 0 ? (
            <div className="glass rounded-xl p-12 text-center text-sm" style={{ color: '#475569' }}>
              No sessions yet
            </div>
          ) : (
            <div className="space-y-2">
              {filteredSessions.map((s) => (
                <Link
                  key={s.id}
                  to={`/sessions/${s.id}`}
                  className="flex items-center justify-between glass rounded-xl p-4 transition-all hover:-translate-y-0.5"
                  onMouseEnter={(e) => { e.currentTarget.style.boxShadow = '0 8px 32px rgba(0,0,0,0.4), 0 0 0 1px rgba(232,121,47,0.15)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.boxShadow = '0 4px 24px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.05)'; }}
                >
                  <div>
                    <div className="text-[13px] font-semibold text-white">{s.title}</div>
                    <div className="text-[11px]" style={{ color: '#475569' }}>{new Date(s.date).toLocaleDateString()}</div>
                  </div>
                  <div className="flex items-center gap-3">
                    {s.aiSummary && (
                      <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded" style={{ background: 'rgba(74,222,128,0.12)', color: '#4ade80', border: '1px solid rgba(74,222,128,0.2)', letterSpacing: '0.04em' }}>
                        AI Summary
                      </span>
                    )}
                    <span
                      className="text-[10px] font-bold uppercase px-2 py-0.5 rounded"
                      style={{
                        letterSpacing: '0.04em',
                        ...(s.type === 'commercial_call'
                          ? { background: 'rgba(168,85,247,0.12)', color: '#a855f7', border: '1px solid rgba(168,85,247,0.2)' }
                          : { background: 'rgba(96,165,250,0.12)', color: '#60a5fa', border: '1px solid rgba(96,165,250,0.2)' })
                      }}
                    >
                      {s.type === 'commercial_call' ? 'Call' : 'Lesson'}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </>
      )}

      {editing && <ClientForm client={client} onSave={handleUpdate} onCancel={() => setEditing(false)} />}
      {showSessionForm && <SessionForm clientId={id} onSave={handleCreateSession} onCancel={() => setShowSessionForm(false)} />}
    </div>
  );
}
