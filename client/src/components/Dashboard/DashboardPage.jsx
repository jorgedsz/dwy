import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Users, Video, Clock } from 'lucide-react';
import api from '../../services/api';

export default function DashboardPage() {
  const [stats, setStats] = useState({ clients: 0, sessions: 0, recent: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const clientsRes = await api.get('/clients');
        const clients = clientsRes.data;
        let allSessions = [];
        for (const c of clients) {
          if (c._count?.sessions > 0) {
            const sessRes = await api.get(`/sessions/client/${c.id}`);
            allSessions.push(...sessRes.data.map((s) => ({ ...s, clientName: c.name })));
          }
        }
        allSessions.sort((a, b) => new Date(b.date) - new Date(a.date));
        setStats({
          clients: clients.length,
          sessions: allSessions.length,
          recent: allSessions.slice(0, 5),
        });
      } catch (err) {
        console.error('Dashboard load error:', err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) return <div className="text-gray-500">Loading dashboard...</div>;

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Dashboard</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center gap-3 mb-2">
            <Users size={20} className="text-blue-600" />
            <span className="text-sm text-gray-500">Total Clients</span>
          </div>
          <div className="text-3xl font-bold text-gray-900">{stats.clients}</div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center gap-3 mb-2">
            <Video size={20} className="text-green-600" />
            <span className="text-sm text-gray-500">Total Sessions</span>
          </div>
          <div className="text-3xl font-bold text-gray-900">{stats.sessions}</div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Clock size={18} />
            Recent Sessions
          </h2>
        </div>
        {stats.recent.length === 0 ? (
          <div className="p-6 text-gray-500 text-center">No sessions yet</div>
        ) : (
          <div className="divide-y divide-gray-100">
            {stats.recent.map((s) => (
              <Link
                key={s.id}
                to={`/sessions/${s.id}`}
                className="flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
              >
                <div>
                  <div className="font-medium text-gray-900">{s.title}</div>
                  <div className="text-sm text-gray-500">{s.clientName}</div>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                    s.type === 'commercial_call'
                      ? 'bg-purple-100 text-purple-700'
                      : 'bg-blue-100 text-blue-700'
                  }`}>
                    {s.type === 'commercial_call' ? 'Call' : 'Lesson'}
                  </span>
                  <span className="text-sm text-gray-400">
                    {new Date(s.date).toLocaleDateString()}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
