import { useNavigate } from 'react-router-dom';

const STATUS_STYLES = {
  activo: { bg: 'rgba(34,197,94,0.12)', color: '#22c55e', border: 'rgba(34,197,94,0.2)' },
  pausado: { bg: 'rgba(234,179,8,0.12)', color: '#eab308', border: 'rgba(234,179,8,0.2)' },
  completado: { bg: 'rgba(59,130,246,0.12)', color: '#3b82f6', border: 'rgba(59,130,246,0.2)' },
  en_riesgo: { bg: 'rgba(239,68,68,0.12)', color: '#ef4444', border: 'rgba(239,68,68,0.2)' }
};

const PRIORITY_COLORS = { alta: '#ef4444', media: '#eab308', baja: '#22c55e' };

function timeAgo(date) {
  if (!date) return '';
  const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export default function WaProjectCard({ project }) {
  const navigate = useNavigate();
  const alertCount = project._count?.alerts ?? project.alertasCount ?? 0;
  const st = STATUS_STYLES[project.estado] || STATUS_STYLES.activo;

  return (
    <button
      onClick={() => navigate(`/projects/${project.id}`)}
      className="w-full text-left rounded-xl p-4 transition-all hover:scale-[1.01]"
      style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}
      onMouseEnter={(e) => e.currentTarget.style.borderColor = 'rgba(232,121,47,0.3)'}
      onMouseLeave={(e) => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)'}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-lg">{project.colorEmoji || '📁'}</span>
          <h3 className="font-semibold text-sm text-white truncate">{project.nombre}</h3>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className="w-2 h-2 rounded-full" style={{ background: PRIORITY_COLORS[project.prioridad] || PRIORITY_COLORS.media }} />
          <span className="text-[10px] px-2 py-0.5 rounded-full font-medium" style={{ background: st.bg, color: st.color, border: `1px solid ${st.border}` }}>
            {project.estado}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-4 mb-3 text-xs" style={{ color: '#64748b' }}>
        <span className="flex items-center gap-1">
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
          {project.totalMensajes}
        </span>
        {alertCount > 0 && (
          <span className="flex items-center gap-1" style={{ color: '#ef4444' }}>
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
            {alertCount}
          </span>
        )}
      </div>

      {project.ultimoMensaje && (
        <p className="text-xs line-clamp-2 mb-2" style={{ color: '#94a3b8' }}>{project.ultimoMensaje}</p>
      )}

      <div className="text-[10px]" style={{ color: '#475569' }}>{timeAgo(project.ultimaActividad)}</div>
    </button>
  );
}
