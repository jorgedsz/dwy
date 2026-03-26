import { useState, useEffect, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Video, Phone, FileText, Sparkles, ChevronLeft, ChevronRight, Calendar } from 'lucide-react';
import { portalAPI } from '../../services/api';

function MiniCalendar({ sessions }) {
  const [current, setCurrent] = useState(new Date());
  const year = current.getFullYear();
  const month = current.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDay = (new Date(year, month, 1).getDay() + 6) % 7;
  const today = new Date();
  const monthName = current.toLocaleDateString('en', { month: 'long', year: 'numeric' });

  const sessionDates = new Set(
    sessions.map((s) => {
      const d = new Date(s.date);
      return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
    })
  );

  const prev = () => setCurrent(new Date(year, month - 1, 1));
  const next = () => setCurrent(new Date(year, month + 1, 1));

  const cells = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  return (
    <div className="glass rounded-xl p-5">
      <div className="flex items-center justify-between mb-4">
        <button onClick={prev} className="p-1 rounded transition-colors" style={{ color: '#64748b' }}
          onMouseEnter={(e) => e.currentTarget.style.color = '#E8792F'}
          onMouseLeave={(e) => e.currentTarget.style.color = '#64748b'}
        ><ChevronLeft size={16} /></button>
        <span className="text-[13px] font-bold text-white uppercase" style={{ letterSpacing: '0.04em' }}>{monthName}</span>
        <button onClick={next} className="p-1 rounded transition-colors" style={{ color: '#64748b' }}
          onMouseEnter={(e) => e.currentTarget.style.color = '#E8792F'}
          onMouseLeave={(e) => e.currentTarget.style.color = '#64748b'}
        ><ChevronRight size={16} /></button>
      </div>
      <div className="grid grid-cols-7 gap-0.5 text-center">
        {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => (
          <div key={i} className="text-[10px] font-semibold uppercase py-1" style={{ color: '#475569', letterSpacing: '0.04em' }}>{d}</div>
        ))}
        {cells.map((day, i) => {
          if (!day) return <div key={`e${i}`} />;
          const isToday = day === today.getDate() && month === today.getMonth() && year === today.getFullYear();
          const hasSession = sessionDates.has(`${year}-${month}-${day}`);
          return (
            <div
              key={i}
              className="relative w-8 h-8 flex items-center justify-center mx-auto rounded-lg text-[12px] font-medium"
              style={{
                color: isToday ? '#fff' : hasSession ? '#E8792F' : '#64748b',
                background: isToday ? '#E8792F' : hasSession ? 'rgba(232,121,47,0.1)' : 'transparent',
              }}
            >
              {day}
              {hasSession && !isToday && <div className="absolute bottom-0.5 w-1 h-1 rounded-full" style={{ background: '#E8792F' }} />}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function ClientPortalPage() {
  const { token } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');

  useEffect(() => {
    const fetchPortal = async () => {
      try {
        const res = await portalAPI.getClient(token);
        setData(res.data);
      } catch (err) {
        setError(err.response?.status === 404 ? 'Portal not found' : 'Failed to load portal');
      } finally {
        setLoading(false);
      }
    };
    fetchPortal();
  }, [token]);

  const filteredSessions = useMemo(() => {
    if (!data?.sessions) return [];
    if (typeFilter === 'all') return data.sessions;
    return data.sessions.filter((s) => s.type === typeFilter);
  }, [data?.sessions, typeFilter]);

  const stats = useMemo(() => {
    if (!data?.sessions) return { total: 0, calls: 0, lessons: 0, withSummary: 0 };
    return {
      total: data.sessions.length,
      calls: data.sessions.filter((s) => s.type === 'commercial_call').length,
      lessons: data.sessions.filter((s) => s.type === 'lesson').length,
      withSummary: data.sessions.filter((s) => s.aiSummary).length,
    };
  }, [data?.sessions]);

  if (loading) {
    return (
      <div className="min-h-screen dot-bg flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10" style={{ borderBottom: '2px solid #E8792F' }} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen dot-bg flex items-center justify-center">
        <div className="glass rounded-2xl p-10 text-center max-w-md">
          <div className="text-4xl mb-4">🔒</div>
          <h2 className="text-lg font-extrabold text-white mb-2">Portal Unavailable</h2>
          <p className="text-sm" style={{ color: '#64748b' }}>{error}</p>
        </div>
      </div>
    );
  }

  const { client, sessions } = data;
  const initials = client.name.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2);

  return (
    <div className="min-h-screen dot-bg">
      {/* Header */}
      <header style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', background: 'rgba(10,15,30,0.8)', backdropFilter: 'blur(12px)' }}>
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-lg font-extrabold text-white">Done With You</h1>
            <p className="text-[11px] font-semibold uppercase" style={{ color: '#E8792F', letterSpacing: '0.06em' }}>Client Portal</p>
          </div>
          <div className="flex items-center gap-3">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold text-white"
              style={{ background: 'linear-gradient(135deg, #E8792F, #c45c1a)' }}
            >
              {initials}
            </div>
            <span className="text-sm font-semibold text-white">{client.name}</span>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        {/* Profile Card */}
        <div className="glass rounded-2xl p-8 mb-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-72 h-72 pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(232,121,47,0.08), transparent 70%)', filter: 'blur(40px)' }} />
          <div className="flex items-center gap-6 relative">
            <div
              className="w-20 h-20 rounded-2xl flex items-center justify-center text-2xl font-extrabold shrink-0"
              style={{ background: 'linear-gradient(135deg, #E8792F, #c45c1a)', color: '#fff', boxShadow: '0 0 30px rgba(232,121,47,0.3)' }}
            >
              {initials}
            </div>
            <div>
              <h2 className="text-2xl font-extrabold text-white">{client.name}</h2>
              {client.company && (
                <p className="text-sm mt-1" style={{ color: '#A0AEC0' }}>{client.company}</p>
              )}
              {client.email && (
                <p className="text-xs mt-1" style={{ color: '#64748b' }}>{client.email}</p>
              )}
              <div className="flex items-center gap-1.5 mt-2">
                <Calendar size={12} style={{ color: '#475569' }} />
                <span className="text-xs" style={{ color: '#475569' }}>
                  Client since {new Date(client.createdAt).toLocaleDateString('en', { month: 'short', year: 'numeric' })}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Stats + Sessions */}
          <div className="lg:col-span-2 space-y-6">
            {/* Stats row */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { icon: Video, label: 'Sessions', value: stats.total, color: '#60a5fa' },
                { icon: Phone, label: 'Calls', value: stats.calls, color: '#a855f7' },
                { icon: FileText, label: 'Lessons', value: stats.lessons, color: '#4ade80' },
                { icon: Sparkles, label: 'AI Reports', value: stats.withSummary, color: '#E8792F' },
              ].map(({ icon: Icon, label, value, color }) => (
                <div key={label} className="glass rounded-xl p-4 relative overflow-hidden">
                  <div className="absolute bottom-0 left-0 right-0 h-0.5" style={{ background: `linear-gradient(90deg, ${color}, transparent)` }} />
                  <div className="flex items-center gap-2 mb-1">
                    <Icon size={14} style={{ color }} />
                    <span className="text-[10px] font-semibold uppercase" style={{ color: '#475569', letterSpacing: '0.06em' }}>{label}</span>
                  </div>
                  <div className="text-2xl font-extrabold text-white">{value}</div>
                </div>
              ))}
            </div>

            {/* Type Filter */}
            <div className="flex items-center gap-3">
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

            {/* Session List */}
            {filteredSessions.length === 0 ? (
              <div className="glass rounded-xl p-12 text-center text-sm" style={{ color: '#475569' }}>No sessions found</div>
            ) : (
              <div className="space-y-2">
                {filteredSessions.map((s) => (
                  <Link
                    key={s.id}
                    to={`/portal/${token}/sessions/${s.id}`}
                    className="flex items-center justify-between glass rounded-xl p-4 transition-all hover:-translate-y-0.5"
                    onMouseEnter={(e) => { e.currentTarget.style.boxShadow = '0 8px 32px rgba(0,0,0,0.4), 0 0 0 1px rgba(232,121,47,0.15)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.boxShadow = '0 4px 24px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.05)'; }}
                  >
                    <div>
                      <div className="text-[13px] font-bold text-white">{s.title}</div>
                      <div className="flex items-center gap-2 mt-1">
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
                        {s.aiSummary && (
                          <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded" style={{ background: 'rgba(74,222,128,0.12)', color: '#4ade80', border: '1px solid rgba(74,222,128,0.2)', letterSpacing: '0.04em' }}>
                            AI
                          </span>
                        )}
                        {s.pendingItems && (
                          <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded" style={{ background: 'rgba(232,121,47,0.12)', color: '#E8792F', border: '1px solid rgba(232,121,47,0.2)', letterSpacing: '0.04em' }}>
                            Pending
                          </span>
                        )}
                        <span className="text-[11px]" style={{ color: '#475569' }}>
                          {new Date(s.date).toLocaleDateString('en', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </span>
                      </div>
                    </div>
                    <svg className="w-4 h-4" fill="none" stroke="#475569" viewBox="0 0 24 24" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                    </svg>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Right sidebar: Calendar */}
          <div className="space-y-5">
            <MiniCalendar sessions={sessions} />
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="mt-16 pb-6">
        <p className="text-center text-[11px] font-semibold uppercase" style={{ color: '#334155', letterSpacing: '0.06em' }}>
          Done With You · Client Portal
        </p>
      </footer>
    </div>
  );
}
