import { useState, useEffect, useCallback } from 'react';
import { Search, Settings, AlertTriangle } from 'lucide-react';
import { waProjectsAPI } from '../../services/api';
import WaProjectCard from './WaProjectCard';
import WaBotConfigPanel from './WaBotConfigPanel';
import io from 'socket.io-client';

const STATUS_OPTIONS = [
  { value: 'all', label: 'All' },
  { value: 'activo', label: 'Active' },
  { value: 'en_riesgo', label: 'At Risk' },
  { value: 'pausado', label: 'Paused' },
  { value: 'completado', label: 'Completed' }
];

export default function WaProjectsDashboard() {
  const [projects, setProjects] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showConfig, setShowConfig] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const params = {};
      if (search) params.q = search;
      if (statusFilter !== 'all') params.status = statusFilter;
      const [projRes, statsRes] = await Promise.all([waProjectsAPI.list(params), waProjectsAPI.getStats()]);
      setProjects(projRes.data.projects);
      setStats(statsRes.data);
    } catch (err) { console.error(err); } finally { setLoading(false); }
  }, [search, statusFilter]);

  useEffect(() => { fetchData(); }, [fetchData]);

  useEffect(() => {
    const socket = io(window.location.origin);
    socket.on('whatsapp:project-update', () => fetchData());
    return () => socket.disconnect();
  }, [fetchData]);

  const atRiskProjects = projects.filter(p => p.estado === 'en_riesgo');
  const otherProjects = projects.filter(p => p.estado !== 'en_riesgo');

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">Project Monitoring</h1>
          <p className="text-sm mt-1" style={{ color: '#64748b' }}>WhatsApp-powered project tracking</p>
        </div>
        <button onClick={() => setShowConfig(!showConfig)} className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm transition-all" style={{ background: 'rgba(255,255,255,0.05)', color: '#A0AEC0', border: '1px solid rgba(255,255,255,0.07)' }}>
          <Settings size={14} /> Bot Config
        </button>
      </div>

      {/* Config Panel */}
      {showConfig && (
        <div className="rounded-xl p-6 mb-6" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
          <h2 className="text-lg font-semibold text-white mb-4">Bot Configuration</h2>
          <WaBotConfigPanel />
        </div>
      )}

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {[
            { label: 'Active Projects', value: stats.active, color: '#22c55e' },
            { label: 'At Risk', value: stats.atRisk, color: '#ef4444' },
            { label: 'Open Alerts', value: stats.unresolvedAlerts, color: '#eab308' },
            { label: 'Messages Today', value: stats.msgsToday, color: '#3b82f6' }
          ].map(s => (
            <div key={s.label} className="rounded-xl p-4" style={{ background: `${s.color}08`, border: `1px solid ${s.color}20` }}>
              <p className="text-2xl font-bold" style={{ color: s.color }}>{s.value}</p>
              <p className="text-xs mt-1" style={{ color: `${s.color}99` }}>{s.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Search & Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="flex-1 relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: '#64748b' }} />
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search projects..." className="w-full pl-9 pr-3 py-2 rounded-lg text-sm outline-none" style={{ background: 'rgba(255,255,255,0.04)', color: '#e2e8f0', border: '1px solid rgba(255,255,255,0.1)' }} />
        </div>
        <div className="flex gap-2">
          {STATUS_OPTIONS.map(opt => (
            <button key={opt.value} onClick={() => setStatusFilter(opt.value)} className="px-3 py-2 rounded-lg text-xs font-medium transition-all" style={statusFilter === opt.value ? { background: '#E8792F', color: '#fff' } : { background: 'rgba(255,255,255,0.04)', color: '#A0AEC0', border: '1px solid rgba(255,255,255,0.07)' }}>
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><div className="animate-spin rounded-full h-8 w-8 border-b-2" style={{ borderColor: '#E8792F' }} /></div>
      ) : projects.length === 0 ? (
        <div className="rounded-xl p-12 text-center" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
          <div className="text-5xl mb-4">📁</div>
          <h3 className="text-lg font-medium text-white mb-2">No projects yet</h3>
          <p className="text-sm" style={{ color: '#64748b' }}>Projects are auto-created when messages arrive in your WhatsApp groups.</p>
        </div>
      ) : (
        <>
          {atRiskProjects.length > 0 && (
            <div className="mb-6">
              <h2 className="text-xs font-semibold uppercase tracking-wider mb-3 flex items-center gap-2" style={{ color: '#ef4444' }}>
                <AlertTriangle size={13} /> At Risk ({atRiskProjects.length})
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {atRiskProjects.map(p => <WaProjectCard key={p.id} project={p} />)}
              </div>
            </div>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {otherProjects.map(p => <WaProjectCard key={p.id} project={p} />)}
          </div>
        </>
      )}
    </div>
  );
}
