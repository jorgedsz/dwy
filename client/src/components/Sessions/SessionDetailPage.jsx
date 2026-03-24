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

  if (loading) return <div className="text-gray-500">Loading...</div>;
  if (!session) return <div className="text-gray-500">Session not found</div>;

  return (
    <div>
      <Link
        to={`/clients/${session.clientId}`}
        className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 mb-4"
      >
        <ArrowLeft size={16} />
        Back to {session.client?.name || 'client'}
      </Link>

      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{session.title}</h1>
          <div className="flex items-center gap-3 mt-1">
            <span className={`text-xs px-2 py-1 rounded-full font-medium ${
              session.type === 'commercial_call'
                ? 'bg-purple-100 text-purple-700'
                : 'bg-blue-100 text-blue-700'
            }`}>
              {session.type === 'commercial_call' ? 'Commercial Call' : 'Lesson'}
            </span>
            <span className="text-sm text-gray-400">
              {new Date(session.date).toLocaleDateString()}
            </span>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setEditing(true)} className="p-2 text-gray-400 hover:text-blue-600 rounded-lg hover:bg-blue-50">
            <Edit size={18} />
          </button>
          <button onClick={handleDelete} className="p-2 text-gray-400 hover:text-red-600 rounded-lg hover:bg-red-50">
            <Trash2 size={18} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-6">
          {session.recordingUrl && (
            <div>
              <h2 className="text-sm font-semibold text-gray-700 mb-3">Recording</h2>
              <VideoEmbed url={session.recordingUrl} />
            </div>
          )}

          <div>
            <h2 className="text-sm font-semibold text-gray-700 mb-3">Transcription</h2>
            {session.transcription ? (
              <div className="bg-white rounded-xl border border-gray-200 p-5 max-h-96 overflow-y-auto">
                <p className="text-sm text-gray-700 whitespace-pre-wrap">{session.transcription}</p>
              </div>
            ) : (
              <div className="bg-gray-50 rounded-xl border border-gray-200 p-5 text-center text-gray-400 text-sm">
                No transcription added yet
              </div>
            )}
          </div>
        </div>

        <div>
          <h2 className="text-sm font-semibold text-gray-700 mb-3">AI Analysis</h2>
          <AiSummaryPanel session={session} onUpdate={handleAiUpdate} />
        </div>
      </div>

      {editing && <SessionForm session={session} onSave={handleUpdate} onCancel={() => setEditing(false)} />}
    </div>
  );
}
