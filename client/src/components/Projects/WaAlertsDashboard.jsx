import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { waAlertsAPI } from '../../services/api';

const TIPO_ICONS = {
  cancelacion: { icon: '🚪', label: 'Cancellation' },
  reembolso: { icon: '🔸', label: 'Refund' },
  enojo: { icon: '😡', label: 'Anger' },
  urgente: { icon: '⚡', label: 'Urgent' },
  entrega: { icon: '📦', label: 'Delivery' },
  pago: { icon: '💳', label: 'Payment' }
};

const NIVEL_STYLES = {
  critico: { bg: 'rgba(239,68,68,0.12)', color: '#ef4444', border: 'rgba(239,68,68,0.2)' },
  alto: { bg: 'rgba(249,115,22,0.12)', color: '#f97316', border: 'rgba(249,115,22,0.2)' },
  medio: { bg: 'rgba(234,179,8,0.12)', color: '#eab308', border: 'rgba(234,179,8,0.2)' },
  bajo: { bg: 'rgba(59,130,246,0.12)', color: '#3b82f6', border: 'rgba(59,130,246,0.2)' }
};

export default function WaAlertsDashboard() {
  const navigate = useNavigate();
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchAlerts(); }, []);

  const fetchAlerts = async () => {
    try { const { data } = await waAlertsAPI.list(); setAlerts(data.alerts); } catch (err) { console.error(err); } finally { setLoading(false); }
  };

  const resolveAlert = async (id) => {
    try { await waAlertsAPI.resolve(id); setAlerts(prev => prev.filter(a => a.id !== id)); } catch (err) { console.error(err); }
  };

  const counts = alerts.reduce((acc, a) => { acc[a.nivel] = (acc[a.nivel] || 0) + 1; return acc; }, {});
  const grouped = alerts.reduce((acc, a) => { if (!acc[a.tipo]) acc[a.tipo] = []; acc[a.tipo].push(a); return acc; }, {});

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Alerts</h1>
        <p className="text-sm mt-1" style={{ color: '#64748b' }}>Unresolved alerts across all projects</p>
      </div>

      {/* Summary pills */}
      <div className="flex flex-wrap gap-3 mb-6">
        {['critico', 'alto', 'medio', 'bajo'].map(nivel => {
          if (!counts[nivel]) return null;
          const st = NIVEL_STYLES[nivel];
          return <span key={nivel} className="px-3 py-1.5 rounded-full text-xs font-medium" style={{ background: st.bg, color: st.color, border: `1px solid ${st.border}` }}>{nivel.charAt(0).toUpperCase() + nivel.slice(1)}: {counts[nivel]}</span>;
        })}
        {alerts.length === 0 && !loading && (
          <span className="px-3 py-1.5 rounded-full text-xs font-medium" style={{ background: 'rgba(34,197,94,0.12)', color: '#22c55e', border: '1px solid rgba(34,197,94,0.2)' }}>All clear!</span>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><div className="animate-spin rounded-full h-8 w-8 border-b-2" style={{ borderColor: '#E8792F' }} /></div>
      ) : alerts.length === 0 ? (
        <div className="rounded-xl p-12 text-center" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
          <div className="text-5xl mb-4">✅</div>
          <h3 className="text-lg font-medium text-white mb-2">No active alerts</h3>
          <p className="text-sm" style={{ color: '#64748b' }}>All alerts have been resolved. Great job!</p>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(grouped).map(([tipo, tipoAlerts]) => {
            const info = TIPO_ICONS[tipo] || { icon: '🔔', label: tipo };
            return (
              <div key={tipo}>
                <h2 className="text-xs font-semibold uppercase tracking-wider mb-3 flex items-center gap-2" style={{ color: '#94a3b8' }}>
                  <span className="text-lg">{info.icon}</span> {info.label} ({tipoAlerts.length})
                </h2>
                <div className="space-y-2">
                  {tipoAlerts.map(alert => {
                    const ns = NIVEL_STYLES[alert.nivel] || NIVEL_STYLES.medio;
                    return (
                      <div key={alert.id} className="rounded-lg p-4 flex items-start gap-4" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-[10px] px-2 py-0.5 rounded-full font-medium" style={{ background: ns.bg, color: ns.color, border: `1px solid ${ns.border}` }}>{alert.nivel}</span>
                            <button onClick={() => navigate(`/projects/${alert.project?.id}`)} className="text-sm font-medium hover:underline truncate" style={{ color: '#E8792F' }}>
                              {alert.project?.colorEmoji} {alert.project?.nombre}
                            </button>
                          </div>
                          <p className="text-sm" style={{ color: '#94a3b8' }}>{alert.descripcion}</p>
                          {alert.message && <p className="text-xs mt-1 truncate" style={{ color: '#475569' }}>{alert.message.sender}: "{alert.message.contenido}"</p>}
                          <p className="text-[10px] mt-1" style={{ color: '#334155' }}>{new Date(alert.createdAt).toLocaleString()}</p>
                        </div>
                        <button onClick={() => resolveAlert(alert.id)} className="px-3 py-1.5 rounded-lg text-xs font-medium flex-shrink-0 transition-colors" style={{ background: 'rgba(34,197,94,0.12)', color: '#22c55e', border: '1px solid rgba(34,197,94,0.2)' }}>
                          Resolve
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
