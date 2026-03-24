import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Edit, Trash2, Plus, Phone, Mail, Building } from 'lucide-react';
import api from '../../services/api';
import ClientForm from './ClientForm';
import SessionForm from '../Sessions/SessionForm';

export default function ClientDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [client, setClient] = useState(null);
  const [editing, setEditing] = useState(false);
  const [showSessionForm, setShowSessionForm] = useState(false);
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

  return (
    <div>
      <Link to="/clients" className="inline-flex items-center gap-2 text-xs mb-5 transition-colors" style={{ color: '#64748b' }}
        onMouseEnter={(e) => e.currentTarget.style.color = '#E8792F'}
        onMouseLeave={(e) => e.currentTarget.style.color = '#64748b'}
      >
        <ArrowLeft size={14} />
        Back to clients
      </Link>

      <div className="glass rounded-xl p-6 mb-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-xl font-extrabold text-white">{client.name}</h1>
            <div className="flex flex-wrap gap-4 mt-2">
              {client.email && (
                <span className="flex items-center gap-1.5 text-xs" style={{ color: '#64748b' }}><Mail size={13} />{client.email}</span>
              )}
              {client.phone && (
                <span className="flex items-center gap-1.5 text-xs" style={{ color: '#64748b' }}><Phone size={13} />{client.phone}</span>
              )}
              {client.company && (
                <span className="flex items-center gap-1.5 text-xs" style={{ color: '#64748b' }}><Building size={13} />{client.company}</span>
              )}
            </div>
            {client.notes && <p className="mt-3 text-xs" style={{ color: '#A0AEC0', lineHeight: '1.6' }}>{client.notes}</p>}
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

      {editing && <ClientForm client={client} onSave={handleUpdate} onCancel={() => setEditing(false)} />}
      {showSessionForm && <SessionForm clientId={id} onSave={handleCreateSession} onCancel={() => setShowSessionForm(false)} />}
    </div>
  );
}
