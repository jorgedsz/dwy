import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Users, Video, Clock, ListChecks, Square, CheckSquare } from 'lucide-react';
import api, { dashboardAPI, taskAPI } from '../../services/api';

export default function DashboardPage() {
  const [stats, setStats] = useState({ clients: 0, sessions: 0, recent: [] });
  const [pendingGroups, setPendingGroups] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [clientsRes, pendingRes] = await Promise.all([
          api.get('/clients'),
          dashboardAPI.getPendingTasks(),
        ]);
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
        setPendingGroups(pendingRes.data);
      } catch (err) {
        console.error('Dashboard load error:', err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const handleToggleTask = async (taskId) => {
    // Optimistically remove from list
    setPendingGroups(prev =>
      prev
        .map(group => ({
          ...group,
          tasks: group.tasks.filter(t => t.id !== taskId),
        }))
        .filter(group => group.tasks.length > 0)
    );

    try {
      await taskAPI.toggle(taskId);
    } catch (err) {
      console.error('Toggle task error:', err);
      // Refetch on error
      const res = await dashboardAPI.getPendingTasks();
      setPendingGroups(res.data);
    }
  };

  if (loading) return <div style={{ color: '#64748b' }}>Loading dashboard...</div>;

  const totalPending = pendingGroups.reduce((sum, g) => sum + g.tasks.length, 0);

  return (
    <div>
      <h1 className="text-[28px] font-extrabold mb-7" style={{ background: 'linear-gradient(135deg, #fff 30%, #E8792F 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', letterSpacing: '-0.02em', lineHeight: '1.2' }}>
        Dashboard
      </h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 mb-8">
        <div className="glass rounded-xl p-5 relative overflow-hidden">
          <div className="absolute bottom-0 left-0 right-0 h-0.5" style={{ background: 'linear-gradient(90deg, #4ade80, transparent)' }} />
          <div className="flex items-center gap-3 mb-2">
            <Users size={18} style={{ color: '#4ade80' }} />
            <span className="text-xs font-semibold uppercase" style={{ color: '#64748b', letterSpacing: '0.06em' }}>Total Clients</span>
          </div>
          <div className="text-3xl font-extrabold text-white">{stats.clients}</div>
        </div>
        <div className="glass rounded-xl p-5 relative overflow-hidden">
          <div className="absolute bottom-0 left-0 right-0 h-0.5" style={{ background: 'linear-gradient(90deg, #60a5fa, transparent)' }} />
          <div className="flex items-center gap-3 mb-2">
            <Video size={18} style={{ color: '#60a5fa' }} />
            <span className="text-xs font-semibold uppercase" style={{ color: '#64748b', letterSpacing: '0.06em' }}>Total Sessions</span>
          </div>
          <div className="text-3xl font-extrabold text-white">{stats.sessions}</div>
        </div>
        <div className="glass rounded-xl p-5 relative overflow-hidden">
          <div className="absolute bottom-0 left-0 right-0 h-0.5" style={{ background: 'linear-gradient(90deg, #f59e0b, transparent)' }} />
          <div className="flex items-center gap-3 mb-2">
            <ListChecks size={18} style={{ color: '#f59e0b' }} />
            <span className="text-xs font-semibold uppercase" style={{ color: '#64748b', letterSpacing: '0.06em' }}>Pending Tasks</span>
          </div>
          <div className="text-3xl font-extrabold text-white">{totalPending}</div>
        </div>
      </div>

      {pendingGroups.length > 0 && (
        <div className="glass rounded-xl overflow-hidden mb-6">
          <div className="p-5" style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
            <h2 className="text-[13px] font-bold uppercase flex items-center gap-2 text-white" style={{ letterSpacing: '0.06em' }}>
              <ListChecks size={15} style={{ color: '#f59e0b' }} />
              Pending Tasks
            </h2>
          </div>
          <div className="divide-y" style={{ borderColor: 'rgba(255,255,255,0.04)' }}>
            {pendingGroups.map(group => (
              <div key={group.clientId} className="px-5 py-4">
                <Link
                  to={`/clients/${group.clientId}`}
                  className="text-[13px] font-bold mb-2.5 flex items-center gap-2 hover:underline"
                  style={{ color: '#E8792F' }}
                >
                  {group.clientName}
                  <span className="text-[11px] font-normal px-1.5 py-0.5 rounded" style={{ background: 'rgba(245,158,11,0.12)', color: '#f59e0b' }}>
                    {group.tasks.length}
                  </span>
                </Link>
                <div className="space-y-1.5">
                  {group.tasks.map(task => (
                    <button
                      key={task.id}
                      onClick={() => handleToggleTask(task.id)}
                      className="flex items-start gap-2.5 w-full text-left group"
                    >
                      <Square size={15} className="mt-0.5 flex-shrink-0 opacity-50 group-hover:opacity-100 transition-opacity" style={{ color: '#f59e0b' }} />
                      <div className="min-w-0">
                        <span className="text-[13px]" style={{ color: '#cbd5e0', lineHeight: '1.65' }}>{task.text}</span>
                        <span className="text-[11px] ml-2" style={{ color: '#475569' }}>
                          {task.sessionTitle}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="glass rounded-xl overflow-hidden">
        <div className="p-5" style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
          <h2 className="text-[13px] font-bold uppercase flex items-center gap-2 text-white" style={{ letterSpacing: '0.06em' }}>
            <Clock size={15} style={{ color: '#E8792F' }} />
            Recent Sessions
          </h2>
        </div>
        {stats.recent.length === 0 ? (
          <div className="p-8 text-center text-sm" style={{ color: '#475569' }}>No sessions yet</div>
        ) : (
          <div>
            {stats.recent.map((s) => (
              <Link
                key={s.id}
                to={`/sessions/${s.id}`}
                className="flex items-center justify-between px-5 py-3.5 transition-colors"
                style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}
                onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.04)'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
              >
                <div>
                  <div className="text-[13px] font-semibold text-white">{s.title}</div>
                  <div className="text-xs" style={{ color: '#64748b' }}>{s.clientName}</div>
                </div>
                <div className="flex items-center gap-3">
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
                  <span className="text-[11px]" style={{ color: '#475569' }}>
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
