import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import { waProjectsAPI, waAlertsAPI } from '../../services/api';
import WaProjectChat from './WaProjectChat';

const STATUS_OPTIONS = ['activo', 'pausado', 'completado', 'en_riesgo'];
const PRIORITY_OPTIONS = ['alta', 'media', 'baja'];

const STATUS_STYLES = {
  activo: { bg: 'rgba(34,197,94,0.12)', color: '#22c55e', border: 'rgba(34,197,94,0.2)' },
  pausado: { bg: 'rgba(234,179,8,0.12)', color: '#eab308', border: 'rgba(234,179,8,0.2)' },
  completado: { bg: 'rgba(59,130,246,0.12)', color: '#3b82f6', border: 'rgba(59,130,246,0.2)' },
  en_riesgo: { bg: 'rgba(239,68,68,0.12)', color: '#ef4444', border: 'rgba(239,68,68,0.2)' }
};

const NIVEL_STYLES = {
  critico: { bg: 'rgba(239,68,68,0.12)', color: '#ef4444', border: 'rgba(239,68,68,0.2)' },
  alto: { bg: 'rgba(249,115,22,0.12)', color: '#f97316', border: 'rgba(249,115,22,0.2)' },
  medio: { bg: 'rgba(234,179,8,0.12)', color: '#eab308', border: 'rgba(234,179,8,0.2)' },
  bajo: { bg: 'rgba(59,130,246,0.12)', color: '#3b82f6', border: 'rgba(59,130,246,0.2)' }
};

export default function WaProjectDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [project, setProject] = useState(null);
  const [messages, setMessages] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('activity');
  const [editFields, setEditFields] = useState({});
  const [saving, setSaving] = useState(false);

  const fetchProject = useCallback(async () => {
    try {
      const { data } = await waProjectsAPI.get(id);
      setProject(data.project);
      setEditFields({ estado: data.project.estado, prioridad: data.project.prioridad, responsable: data.project.responsable || '', cliente: data.project.cliente || '', descripcionEmpresa: data.project.descripcionEmpresa || '', objetivoProyecto: data.project.objetivoProyecto || '' });
    } catch (err) { console.error(err); }
  }, [id]);

  const fetchMessages = useCallback(async () => {
    try { const { data } = await waProjectsAPI.getMessages(id, { limit: 100 }); setMessages(data.messages); } catch (err) { console.error(err); }
  }, [id]);

  const fetchAlerts = useCallback(async () => {
    try { const { data } = await waProjectsAPI.getAlerts(id); setAlerts(data.alerts); } catch (err) { console.error(err); }
  }, [id]);

  useEffect(() => { Promise.all([fetchProject(), fetchMessages(), fetchAlerts()]).finally(() => setLoading(false)); }, [fetchProject, fetchMessages, fetchAlerts]);

  const saveProject = async () => {
    setSaving(true);
    try { const { data } = await waProjectsAPI.update(id, editFields); setProject(data.project); } catch (err) { console.error(err); } finally { setSaving(false); }
  };

  const resolveAlert = async (alertId) => {
    try { await waAlertsAPI.resolve(alertId); setAlerts(prev => prev.map(a => a.id === alertId ? { ...a, resuelta: true } : a)); } catch (err) { console.error(err); }
  };

  const resolveAll = async () => {
    try { await waAlertsAPI.resolveAllForProject(id); setAlerts(prev => prev.map(a => ({ ...a, resuelta: true }))); } catch (err) { console.error(err); }
  };

  if (loading) return <div className="flex justify-center py-24"><div className="animate-spin rounded-full h-8 w-8 border-b-2" style={{ borderColor: '#E8792F' }} /></div>;
  if (!project) return <div className="text-center py-12"><p style={{ color: '#64748b' }}>Project not found</p><button onClick={() => navigate('/projects')} className="mt-4 text-sm" style={{ color: '#E8792F' }}>Back to projects</button></div>;

  const unresolvedAlerts = alerts.filter(a => !a.resuelta);
  const st = STATUS_STYLES[project.estado] || STATUS_STYLES.activo;
  const inputStyle = { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', color: '#e2e8f0' };

  return (
    <div>
      {/* Back */}
      <button onClick={() => navigate('/projects')} className="flex items-center gap-1 text-sm mb-4 transition-colors" style={{ color: '#64748b' }} onMouseEnter={(e) => e.currentTarget.style.color = '#E8792F'} onMouseLeave={(e) => e.currentTarget.style.color = '#64748b'}>
        <ChevronLeft size={16} /> Back to projects
      </button>

      {/* Header */}
      <div className="rounded-xl p-6 mb-6" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <span className="text-3xl">{project.colorEmoji || '📁'}</span>
            <div>
              <h1 className="text-xl font-bold text-white">{project.nombre}</h1>
              <div className="flex items-center gap-3 mt-1 text-sm" style={{ color: '#64748b' }}>
                {project.cliente && <span>Client: {project.cliente}</span>}
                <span className="text-[10px] px-2 py-0.5 rounded-full font-medium" style={{ background: st.bg, color: st.color, border: `1px solid ${st.border}` }}>{project.estado}</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-6 text-sm" style={{ color: '#64748b' }}>
            <div className="text-center"><p className="text-lg font-bold text-white">{project.totalMensajes}</p><p className="text-xs">Messages</p></div>
            <div className="text-center"><p className="text-lg font-bold" style={{ color: '#ef4444' }}>{unresolvedAlerts.length}</p><p className="text-xs">Alerts</p></div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 rounded-lg p-1" style={{ background: 'rgba(255,255,255,0.03)' }}>
        {[{ id: 'activity', label: 'Activity' }, { id: 'alerts', label: `Alerts (${unresolvedAlerts.length})` }, { id: 'info', label: 'Info' }].map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)} className="flex-1 px-4 py-2 rounded-md text-sm font-medium transition-all" style={activeTab === tab.id ? { background: 'rgba(232,121,47,0.1)', color: '#E8792F', border: '1px solid rgba(232,121,47,0.18)' } : { color: '#64748b', border: '1px solid transparent' }}>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Activity Tab */}
      {activeTab === 'activity' && (
        <div className="rounded-xl overflow-hidden" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
          <div className="p-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
            <h2 className="text-sm font-semibold text-white">Message Feed</h2>
          </div>
          <div className="p-4 space-y-3 max-h-[600px] overflow-y-auto">
            {messages.length === 0 ? <p className="text-sm text-center py-8" style={{ color: '#64748b' }}>No messages yet</p> : messages.map(msg => (
              <div key={msg.id} className={`flex ${msg.esDelCliente ? 'justify-start' : 'justify-end'}`}>
                <div className="max-w-[75%] px-3 py-2 rounded-xl text-sm" style={msg.esDelCliente ? { background: 'rgba(255,255,255,0.05)', color: '#e2e8f0' } : { background: '#E8792F', color: '#fff' }}>
                  <p className="text-[10px] font-medium mb-1" style={{ opacity: 0.6 }}>{msg.sender}</p>
                  <p className="whitespace-pre-wrap">{msg.contenido}</p>
                  <p className="text-[9px] mt-1 text-right" style={{ opacity: 0.4 }}>{new Date(msg.timestamp).toLocaleString()}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Alerts Tab */}
      {activeTab === 'alerts' && (
        <div className="rounded-xl overflow-hidden" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
          <div className="p-4 flex items-center justify-between" style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
            <h2 className="text-sm font-semibold text-white">Project Alerts</h2>
            {unresolvedAlerts.length > 0 && <button onClick={resolveAll} className="text-xs px-3 py-1.5 rounded-lg" style={{ background: 'rgba(34,197,94,0.12)', color: '#22c55e', border: '1px solid rgba(34,197,94,0.2)' }}>Resolve All</button>}
          </div>
          <div className="p-4 space-y-3">
            {alerts.length === 0 ? <p className="text-sm text-center py-8" style={{ color: '#64748b' }}>No alerts</p> : alerts.map(alert => {
              const ns = NIVEL_STYLES[alert.nivel] || NIVEL_STYLES.medio;
              return (
                <div key={alert.id} className="p-3 rounded-lg" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', opacity: alert.resuelta ? 0.4 : 1 }}>
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[10px] px-2 py-0.5 rounded-full font-medium" style={{ background: ns.bg, color: ns.color, border: `1px solid ${ns.border}` }}>{alert.nivel}</span>
                        <span className="text-sm font-medium" style={{ color: '#94a3b8' }}>{alert.tipo}</span>
                        {alert.resuelta && <span className="text-xs" style={{ color: '#22c55e' }}>Resolved</span>}
                      </div>
                      <p className="text-sm" style={{ color: '#94a3b8' }}>{alert.descripcion}</p>
                      {alert.message && <p className="text-xs mt-1" style={{ color: '#475569' }}>{alert.message.sender}: "{alert.message.contenido?.substring(0, 100)}"</p>}
                      <p className="text-[10px] mt-1" style={{ color: '#334155' }}>{new Date(alert.createdAt).toLocaleString()}</p>
                    </div>
                    {!alert.resuelta && <button onClick={() => resolveAlert(alert.id)} className="px-3 py-1.5 rounded-lg text-xs font-medium flex-shrink-0" style={{ background: 'rgba(34,197,94,0.12)', color: '#22c55e', border: '1px solid rgba(34,197,94,0.2)' }}>Resolve</button>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Info Tab */}
      {activeTab === 'info' && (
        <div className="rounded-xl p-6" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
          <h2 className="text-sm font-semibold text-white mb-4">Project Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: '#64748b' }}>Status</label>
              <select value={editFields.estado} onChange={(e) => setEditFields({ ...editFields, estado: e.target.value })} className="w-full text-sm px-3 py-2 rounded-lg outline-none" style={inputStyle}>
                {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: '#64748b' }}>Priority</label>
              <select value={editFields.prioridad} onChange={(e) => setEditFields({ ...editFields, prioridad: e.target.value })} className="w-full text-sm px-3 py-2 rounded-lg outline-none" style={inputStyle}>
                {PRIORITY_OPTIONS.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: '#64748b' }}>Responsible</label>
              <input type="text" value={editFields.responsable} onChange={(e) => setEditFields({ ...editFields, responsable: e.target.value })} placeholder="Person in charge..." className="w-full text-sm px-3 py-2 rounded-lg outline-none" style={inputStyle} />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: '#64748b' }}>Client</label>
              <input type="text" value={editFields.cliente} onChange={(e) => setEditFields({ ...editFields, cliente: e.target.value })} placeholder="Client name..." className="w-full text-sm px-3 py-2 rounded-lg outline-none" style={inputStyle} />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-medium mb-1" style={{ color: '#64748b' }}>Company Description</label>
              <textarea value={editFields.descripcionEmpresa} onChange={(e) => setEditFields({ ...editFields, descripcionEmpresa: e.target.value })} rows={2} placeholder="Brief company description..." className="w-full text-sm px-3 py-2 rounded-lg outline-none resize-none" style={inputStyle} />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-medium mb-1" style={{ color: '#64748b' }}>Project Objective</label>
              <textarea value={editFields.objetivoProyecto} onChange={(e) => setEditFields({ ...editFields, objetivoProyecto: e.target.value })} rows={2} placeholder="What is the goal?" className="w-full text-sm px-3 py-2 rounded-lg outline-none resize-none" style={inputStyle} />
            </div>
          </div>
          <div className="mt-4">
            <button onClick={saveProject} disabled={saving} className="px-4 py-2 rounded-lg text-sm font-medium text-white disabled:opacity-50" style={{ background: '#E8792F' }}>{saving ? 'Saving...' : 'Save Changes'}</button>
          </div>
        </div>
      )}

      <WaProjectChat projectId={parseInt(id)} />
    </div>
  );
}
