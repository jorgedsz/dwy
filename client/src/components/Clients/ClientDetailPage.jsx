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

  if (loading) return <div className="text-gray-500">Loading...</div>;
  if (!client) return <div className="text-gray-500">Client not found</div>;

  const filteredSessions = typeFilter === 'all'
    ? client.sessions
    : client.sessions.filter((s) => s.type === typeFilter);

  return (
    <div>
      <Link to="/clients" className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 mb-4">
        <ArrowLeft size={16} />
        Back to clients
      </Link>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{client.name}</h1>
            <div className="flex flex-wrap gap-4 mt-2 text-sm text-gray-500">
              {client.email && (
                <span className="flex items-center gap-1"><Mail size={14} />{client.email}</span>
              )}
              {client.phone && (
                <span className="flex items-center gap-1"><Phone size={14} />{client.phone}</span>
              )}
              {client.company && (
                <span className="flex items-center gap-1"><Building size={14} />{client.company}</span>
              )}
            </div>
            {client.notes && <p className="mt-3 text-sm text-gray-600">{client.notes}</p>}
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
      </div>

      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-semibold text-gray-900">Sessions</h2>
          <div className="flex gap-1 ml-4">
            {['all', 'commercial_call', 'lesson'].map((t) => (
              <button
                key={t}
                onClick={() => setTypeFilter(t)}
                className={`px-3 py-1 text-xs rounded-full font-medium ${
                  typeFilter === t
                    ? 'bg-blue-100 text-blue-700'
                    : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                }`}
              >
                {t === 'all' ? 'All' : t === 'commercial_call' ? 'Calls' : 'Lessons'}
              </button>
            ))}
          </div>
        </div>
        <button
          onClick={() => setShowSessionForm(true)}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-sm font-medium"
        >
          <Plus size={16} />
          Add Session
        </button>
      </div>

      {filteredSessions.length === 0 ? (
        <div className="text-center py-12 text-gray-500 bg-white rounded-xl border border-gray-200">
          No sessions yet
        </div>
      ) : (
        <div className="space-y-3">
          {filteredSessions.map((s) => (
            <Link
              key={s.id}
              to={`/sessions/${s.id}`}
              className="flex items-center justify-between bg-white rounded-xl shadow-sm border border-gray-200 p-4 hover:shadow-md transition-shadow"
            >
              <div>
                <div className="font-medium text-gray-900">{s.title}</div>
                <div className="text-sm text-gray-400">{new Date(s.date).toLocaleDateString()}</div>
              </div>
              <div className="flex items-center gap-3">
                {s.aiSummary && (
                  <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">AI Summary</span>
                )}
                <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                  s.type === 'commercial_call'
                    ? 'bg-purple-100 text-purple-700'
                    : 'bg-blue-100 text-blue-700'
                }`}>
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
