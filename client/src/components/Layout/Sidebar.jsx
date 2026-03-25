import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Users, FolderKanban, Bell, Smartphone, LogOut } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export default function Sidebar() {
  const { user, logout } = useAuth();

  const linkClass = ({ isActive }) =>
    `flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13px] transition-all ${
      isActive
        ? 'font-semibold'
        : 'font-normal hover:bg-white/[0.04]'
    }`;

  const linkStyle = (isActive) => isActive
    ? { color: '#E8792F', background: 'rgba(232,121,47,0.10)', border: '1px solid rgba(232,121,47,0.18)' }
    : { color: '#A0AEC0', border: '1px solid transparent' };

  return (
    <aside
      className="w-56 flex flex-col h-screen sticky top-0"
      style={{ background: 'linear-gradient(180deg, #0D1220, #0A0F1E)', borderRight: '1px solid rgba(255,255,255,0.07)' }}
    >
      {/* Orange halo */}
      <div className="absolute top-0 right-0 w-44 h-44 pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(232,121,47,0.08), transparent 70%)', filter: 'blur(30px)' }} />

      <div className="p-5 pb-4">
        <h1 className="text-lg font-extrabold" style={{ background: 'linear-gradient(135deg, #fff 30%, #E8792F 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          Done With You
        </h1>
      </div>

      {/* Divider */}
      <div className="mx-4 h-px" style={{ background: 'linear-gradient(90deg, transparent, rgba(232,121,47,0.25), transparent)' }} />

      <nav className="flex-1 p-3 space-y-1 mt-2">
        <NavLink to="/" end className={linkClass} style={({ isActive }) => linkStyle(isActive)}>
          <LayoutDashboard size={15} />
          Dashboard
        </NavLink>
        <NavLink to="/clients" className={linkClass} style={({ isActive }) => linkStyle(isActive)}>
          <Users size={15} />
          Clients
        </NavLink>

        {/* Section divider */}
        <div className="pt-4 pb-1">
          <p className="text-[10px] font-semibold uppercase tracking-wider px-3" style={{ color: '#475569' }}>Project Monitoring</p>
        </div>
        <NavLink to="/projects" className={linkClass} style={({ isActive }) => linkStyle(isActive)}>
          <FolderKanban size={15} />
          Projects
        </NavLink>
        <NavLink to="/alerts" className={linkClass} style={({ isActive }) => linkStyle(isActive)}>
          <Bell size={15} />
          Alerts
        </NavLink>

        {/* Section divider */}
        <div className="pt-4 pb-1">
          <p className="text-[10px] font-semibold uppercase tracking-wider px-3" style={{ color: '#475569' }}>Messaging</p>
        </div>
        <NavLink to="/whatsapp" className={linkClass} style={({ isActive }) => linkStyle(isActive)}>
          <Smartphone size={15} />
          WhatsApp
        </NavLink>
      </nav>

      <div className="p-4" style={{ borderTop: '1px solid rgba(255,255,255,0.07)' }}>
        <div className="text-xs truncate mb-2" style={{ color: '#64748b' }}>{user?.email}</div>
        <button
          onClick={logout}
          className="flex items-center gap-2 text-xs transition-colors"
          style={{ color: '#64748b' }}
          onMouseEnter={(e) => e.currentTarget.style.color = '#f87171'}
          onMouseLeave={(e) => e.currentTarget.style.color = '#64748b'}
        >
          <LogOut size={14} />
          Sign out
        </button>
      </div>
    </aside>
  );
}
