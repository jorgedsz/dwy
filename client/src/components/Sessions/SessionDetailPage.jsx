import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Edit, Trash2 } from 'lucide-react';
import api from '../../services/api';
import VideoEmbed from './VideoEmbed';
import AiSummaryPanel from './AiSummaryPanel';
import SessionForm from './SessionForm';

export default function SessionDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [session, setSession] = useState(null);
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try {
      const res = await api.get(`/sessions/${id}`);
      setSession(res.data);
    } catch (err) {
      console.error('Load session error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [id]);

  const handleUpdate = async (data) => {
    try {
      await api.put(`/sessions/${id}`, data);
      setEditing(false);
      load();
    } catch (err) {
      console.error('Update session error:', err);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Delete this session?')) return;
    try {
      await api.delete(`/sessions/${id}`);
      navigate(`/clients/${session.clientId}`);
    } catch (err) {
      console.error('Delete session error:', err);
    }
  };

  const handleAiUpdate = (data) => {
    setSession((prev) => ({ ...prev, ...data }));
  };

  if (loading) return <div style={{ color: '#64748b' }}>Loading...</div>;
  if (!session) return <div style={{ color: '#64748b' }}>Session not found</div>;

  return (
    <div>
      <Link
        to={`/clients/${session.clientId}`}
        className="inline-flex items-center gap-2 text-xs mb-5 transition-colors"
        style={{ color: '#64748b' }}
        onMouseEnter={(e) => e.currentTarget.style.color = '#E8792F'}
        onMouseLeave={(e) => e.currentTarget.style.color = '#64748b'}
      >
        <ArrowLeft size={14} />
        Back to {session.client?.name || 'client'}
      </Link>

      <div className="flex items-start justify-between mb-7">
        <div>
          <h1 className="text-xl font-extrabold text-white">{session.title}</h1>
          <div className="flex items-center gap-3 mt-2">
            <span
              className="text-[10px] font-bold uppercase px-2 py-0.5 rounded"
              style={{
                letterSpacing: '0.04em',
                ...(session.type === 'commercial_call'
                  ? { background: 'rgba(168,85,247,0.12)', color: '#a855f7', border: '1px solid rgba(168,85,247,0.2)' }
                  : { background: 'rgba(96,165,250,0.12)', color: '#60a5fa', border: '1px solid rgba(96,165,250,0.2)' })
              }}
            >
              {session.type === 'commercial_call' ? 'Commercial Call' : 'Lesson'}
            </span>
            <span className="text-[11px]" style={{ color: '#475569' }}>
              {new Date(session.date).toLocaleDateString()}
            </span>
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-6">
          {session.recordingUrl && (
            <div>
              <h2 className="text-[13px] font-bold uppercase mb-3" style={{ color: '#A0AEC0', letterSpacing: '0.06em' }}>Recording</h2>
              <VideoEmbed url={session.recordingUrl} />
            </div>
          )}

          <div>
            <h2 className="text-[13px] font-bold uppercase mb-3" style={{ color: '#A0AEC0', letterSpacing: '0.06em' }}>Transcription</h2>
            {session.transcription ? (
              <div className="glass rounded-xl p-5 max-h-96 overflow-y-auto">
                <p className="text-[13px] whitespace-pre-wrap" style={{ color: '#cbd5e0', lineHeight: '1.65' }}>{session.transcription}</p>
              </div>
            ) : (
              <div className="glass rounded-xl p-8 text-center text-xs" style={{ color: '#475569' }}>
                No transcription added yet
              </div>
            )}
          </div>
        </div>

        <div>
          <h2 className="text-[13px] font-bold uppercase mb-3" style={{ color: '#A0AEC0', letterSpacing: '0.06em' }}>AI Analysis</h2>
          <AiSummaryPanel session={session} onUpdate={handleAiUpdate} />
        </div>
      </div>

      {editing && <SessionForm session={session} onSave={handleUpdate} onCancel={() => setEditing(false)} />}
    </div>
  );
}
