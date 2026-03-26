import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Edit, Trash2, Plus, Phone, Mail, Building, User, Calendar,
  Video, FileText, Clock, Shield, Settings, Users, Sparkles, ChevronLeft, ChevronRight,
  MessageSquare, AlertTriangle, Share2, Check, X, BarChart3, RefreshCw, TrendingUp,
  GitCompare, ListChecks, DollarSign, Loader2
} from 'lucide-react';
import api, { portalAPI } from '../../services/api';
import ClientForm from './ClientForm';
import SessionForm from '../Sessions/SessionForm';

function MiniCalendar({ sessions }) {
  const [current, setCurrent] = useState(new Date());
  const year = current.getFullYear();
  const month = current.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDay = (new Date(year, month, 1).getDay() + 6) % 7; // Monday start
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

export default function ClientDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [client, setClient] = useState(null);
  const [editing, setEditing] = useState(false);
  const [showSessionForm, setShowSessionForm] = useState(false);
  const [tab, setTab] = useState('overview');
  const [typeFilter, setTypeFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [portalCopied, setPortalCopied] = useState(false);
  const [editingSince, setEditingSince] = useState(false);
  const [sinceValue, setSinceValue] = useState('');
  const [contractedSessions, setContractedSessions] = useState(null);
  const [showNotes, setShowNotes] = useState(false);
  const [notesValue, setNotesValue] = useState('');
  const [analysis, setAnalysis] = useState(null);
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [analysisError, setAnalysisError] = useState(null);

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

  useEffect(() => {
    if (client) {
      const d = client.startDate || client.createdAt;
      setSinceValue(d ? new Date(d).toISOString().split('T')[0] : '');
      setContractedSessions(client.contractedSessions);
      setNotesValue(client.notes || '');
    }
  }, [client]);

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
      const res = await api.post('/sessions', { ...data, clientId: parseInt(id) });
      setShowSessionForm(false);
      if (data.transcription) {
        navigate(`/sessions/${res.data.id}`);
      } else {
        load();
      }
    } catch (err) {
      console.error('Create session error:', err);
    }
  };

  const handleSaveSince = async (dateStr) => {
    try {
      await api.put(`/clients/${id}`, { startDate: dateStr || null });
      setEditingSince(false);
      load();
    } catch (err) {
      console.error('Save start date error:', err);
    }
  };

  const handleContractedChange = async (value) => {
    const val = value === '' ? null : parseInt(value);
    setContractedSessions(val);
    try {
      await api.put(`/clients/${id}`, { contractedSessions: val });
      load();
    } catch (err) {
      console.error('Save contracted sessions error:', err);
    }
  };

  const handleSaveNotes = async () => {
    try {
      await api.put(`/clients/${id}`, { notes: notesValue });
      setShowNotes(false);
      load();
    } catch (err) {
      console.error('Save notes error:', err);
    }
  };

  const handleSharePortal = async () => {
    try {
      const res = await portalAPI.generateToken(id);
      const portalUrl = `${window.location.origin}/portal/${res.data.portalToken}`;
      await navigator.clipboard.writeText(portalUrl);
      setPortalCopied(true);
      setTimeout(() => setPortalCopied(false), 2000);
    } catch (err) {
      console.error('Share portal error:', err);
    }
  };

  const handleGenerateAnalysis = async () => {
    setAnalysisLoading(true);
    setAnalysisError(null);
    try {
      const res = await api.post(`/sessions/client/${id}/analysis`);
      setAnalysis(res.data);
    } catch (err) {
      setAnalysisError(err.response?.data?.error || 'Failed to generate analysis');
    } finally {
      setAnalysisLoading(false);
    }
  };

  if (loading) return <div style={{ color: '#64748b' }}>Loading...</div>;
  if (!client) return <div style={{ color: '#64748b' }}>Client not found</div>;

  const filteredSessions = typeFilter === 'all'
    ? client.sessions
    : client.sessions.filter((s) => s.type === typeFilter);

  const totalLessons = client.sessions.filter((s) => s.type === 'lesson').length;
  const withSummary = client.sessions.filter((s) => s.aiSummary).length;
  const initials = client.name.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2);
  const csAssigned = (client.assignments || []).filter((a) => a.role === 'cs');
  const opsAssigned = (client.assignments || []).filter((a) => a.role === 'ops');

  const tabs = [
    { key: 'overview', label: 'Overview', icon: User },
    { key: 'sessions', label: 'Sessions', icon: Video },
    { key: 'team', label: 'Team', icon: Users },
    { key: 'notes', label: 'Notes', icon: FileText },
    { key: 'analysis', label: 'Analysis', icon: BarChart3 },
  ];

  // Group sessions by date for timeline
  const groupedSessions = {};
  client.sessions.slice(0, 10).forEach((s) => {
    const dateKey = new Date(s.date).toLocaleDateString('en', { weekday: 'long', month: 'short', day: 'numeric' }).toUpperCase();
    if (!groupedSessions[dateKey]) groupedSessions[dateKey] = [];
    groupedSessions[dateKey].push(s);
  });

  return (
    <div>
      <Link to="/clients" className="inline-flex items-center gap-2 text-xs mb-5 transition-colors" style={{ color: '#64748b' }}
        onMouseEnter={(e) => e.currentTarget.style.color = '#E8792F'}
        onMouseLeave={(e) => e.currentTarget.style.color = '#64748b'}
      >
        <ArrowLeft size={14} />
        Back to clients
      </Link>

      {/* Profile Header */}
      <div className="glass rounded-2xl p-8 mb-0 relative overflow-hidden">
        {/* Decorative gradient */}
        <div className="absolute top-0 right-0 w-72 h-72 pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(232,121,47,0.08), transparent 70%)', filter: 'blur(40px)' }} />

        <div className="flex items-start gap-6 relative">
          {/* Avatar */}
          <div
            className="w-24 h-24 rounded-2xl flex items-center justify-center text-3xl font-extrabold shrink-0"
            style={{ background: 'linear-gradient(135deg, #E8792F, #c45c1a)', color: '#fff', boxShadow: '0 0 30px rgba(232,121,47,0.3)' }}
          >
            {initials}
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between">
              <div>
                <h1 className="text-2xl font-extrabold text-white leading-tight">{client.name}</h1>
                {client.company && (
                  <div className="flex items-center gap-1.5 mt-1">
                    <Building size={13} style={{ color: '#E8792F' }} />
                    <span className="text-sm" style={{ color: '#A0AEC0' }}>{client.company}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Contact pills */}
            <div className="flex flex-wrap gap-3 mt-3">
              {client.email && (
                <span className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', color: '#A0AEC0' }}>
                  <Mail size={12} />{client.email}
                </span>
              )}
              {client.phone && (
                <span className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', color: '#A0AEC0' }}>
                  <Phone size={12} />{client.phone}
                </span>
              )}
              {editingSince ? (
                <span className="flex items-center gap-1.5 text-xs px-2 py-1 rounded-lg" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(232,121,47,0.4)' }}>
                  <Calendar size={12} style={{ color: '#E8792F' }} />
                  <input
                    type="date"
                    value={sinceValue}
                    onChange={(e) => setSinceValue(e.target.value)}
                    className="bg-transparent text-xs outline-none"
                    style={{ color: '#fff', colorScheme: 'dark' }}
                    autoFocus
                  />
                  <button
                    onClick={() => handleSaveSince(sinceValue)}
                    className="px-1.5 py-0.5 rounded text-[10px] font-bold"
                    style={{ background: 'rgba(232,121,47,0.2)', color: '#E8792F' }}
                  >
                    Save
                  </button>
                  <button
                    onClick={() => setEditingSince(false)}
                    className="px-1 py-0.5 rounded text-[10px]"
                    style={{ color: '#64748b' }}
                  >
                    <X size={12} />
                  </button>
                </span>
              ) : (
                <button
                  onClick={() => setEditingSince(true)}
                  className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg transition-colors"
                  style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', color: '#64748b' }}
                  onMouseEnter={(e) => e.currentTarget.style.borderColor = 'rgba(232,121,47,0.3)'}
                  onMouseLeave={(e) => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)'}
                  title="Click to edit start date"
                >
                  <Calendar size={12} />Client since {new Date(client.startDate || client.createdAt).toLocaleDateString('en', { month: 'short', year: 'numeric' })}
                  <Edit size={10} style={{ color: '#475569' }} />
                </button>
              )}
            </div>

            {client.notes && (
              <p className="mt-3 text-[13px] line-clamp-2" style={{ color: '#64748b', lineHeight: '1.6' }}>{client.notes}</p>
            )}

            {/* Action buttons row */}
            <div className="flex flex-wrap gap-2 mt-4">
              <button
                onClick={() => setEditing(true)}
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-[11px] font-bold uppercase transition-all"
                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#A0AEC0', letterSpacing: '0.04em' }}
                onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'rgba(232,121,47,0.3)'; e.currentTarget.style.color = '#E8792F'; }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'; e.currentTarget.style.color = '#A0AEC0'; }}
              >
                <Edit size={13} />Edit
              </button>
              <button
                onClick={() => setShowSessionForm(true)}
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-[11px] font-bold uppercase transition-transform hover:-translate-y-0.5"
                style={{ background: 'linear-gradient(135deg, #E8792F, #c45c1a)', color: '#fff', letterSpacing: '0.04em', boxShadow: '0 0 16px rgba(232,121,47,0.3)' }}
              >
                <Plus size={13} />Add Session
              </button>
              <button
                onClick={handleSharePortal}
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-[11px] font-bold uppercase transition-all"
                style={{
                  letterSpacing: '0.04em',
                  ...(portalCopied
                    ? { background: 'rgba(74,222,128,0.10)', border: '1px solid rgba(74,222,128,0.25)', color: '#4ade80' }
                    : { background: 'rgba(232,121,47,0.08)', border: '1px solid rgba(232,121,47,0.25)', color: '#E8792F' })
                }}
              >
                {portalCopied ? <><Check size={11} />Link Copied!</> : <><Share2 size={11} />Share Portal</>}
              </button>
              <button
                onClick={handleDelete}
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-[11px] font-bold uppercase transition-all"
                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#64748b', letterSpacing: '0.04em' }}
                onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'rgba(239,68,68,0.3)'; e.currentTarget.style.color = '#f87171'; }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'; e.currentTarget.style.color = '#64748b'; }}
              >
                <Trash2 size={13} />Delete
              </button>
            </div>
          </div>

          {/* Right-side report card */}
          <div className="hidden lg:flex flex-col gap-3 flex-shrink-0" style={{ width: '280px' }}>
            {/* Contracted + Summary side by side */}
            <div className="grid grid-cols-2 gap-3">
              {/* Contracted Sessions */}
              <div className="rounded-xl p-3" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                <div className="text-[10px] font-bold uppercase mb-2" style={{ color: '#475569', letterSpacing: '0.06em' }}>Contracted</div>
                <select
                  value={contractedSessions ?? ''}
                  onChange={(e) => handleContractedChange(e.target.value)}
                  className="w-full px-2 py-1.5 rounded-lg text-xs font-semibold outline-none cursor-pointer"
                  style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', colorScheme: 'dark' }}
                >
                  <option value="">Not set</option>
                  {[4, 8, 12, 16, 20, 24].map((n) => (
                    <option key={n} value={n}>{n} sessions</option>
                  ))}
                </select>
                {contractedSessions && (
                  <div className="mt-2">
                    <div className="flex items-center justify-between text-[10px] mb-1">
                      <span style={{ color: '#64748b' }}>Lessons</span>
                      <span style={{ color: '#F1F5F9' }}>{totalLessons}/{contractedSessions}</span>
                    </div>
                    <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${Math.min((totalLessons / contractedSessions) * 100, 100)}%`,
                          background: totalLessons >= contractedSessions
                            ? 'linear-gradient(90deg, #f87171, #ef4444)'
                            : 'linear-gradient(90deg, #E8792F, #f59e0b)',
                        }}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Quick Stats + Notes */}
              <div className="rounded-xl p-3" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                <div className="text-[10px] font-bold uppercase mb-2" style={{ color: '#475569', letterSpacing: '0.06em' }}>Summary</div>
                <div className="space-y-1.5">
                  {[
                    { label: 'Lessons', value: totalLessons, color: '#60a5fa' },
                    { label: 'AI Reports', value: withSummary, color: '#E8792F' },
                  ].map(({ label, value, color }) => (
                    <div key={label} className="flex items-center justify-between">
                      <span className="text-[10px]" style={{ color: '#64748b' }}>{label}</span>
                      <span className="text-[12px] font-bold" style={{ color }}>{value}</span>
                    </div>
                  ))}
                </div>
                <button
                  onClick={() => setShowNotes(true)}
                  className="w-full mt-2.5 pt-2 flex items-center gap-1.5 text-[10px] font-semibold transition-colors"
                  style={{ borderTop: '1px solid rgba(255,255,255,0.06)', color: '#64748b' }}
                  onMouseEnter={(e) => e.currentTarget.style.color = '#E8792F'}
                  onMouseLeave={(e) => e.currentTarget.style.color = '#64748b'}
                >
                  <FileText size={10} />
                  {client.notes ? 'View Notes' : 'Add Notes'}
                </button>
              </div>
            </div>

            {/* Team */}
            {(csAssigned.length > 0 || opsAssigned.length > 0) && (
              <div className="rounded-xl p-3" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                <div className="text-[10px] font-bold uppercase mb-2" style={{ color: '#475569', letterSpacing: '0.06em' }}>Team</div>
                <div className="space-y-1.5">
                  {[...csAssigned, ...opsAssigned].map((a) => (
                    <div key={a.id} className="flex items-center gap-2">
                      <div
                        className="w-5 h-5 rounded flex items-center justify-center text-[9px] font-bold text-white flex-shrink-0"
                        style={{ background: a.role === 'cs' ? '#3b82f6' : '#a855f7' }}
                      >
                        {(a.user.name || a.user.email)[0].toUpperCase()}
                      </div>
                      <span className="text-[11px] truncate" style={{ color: '#94a3b8' }}>{a.user.name || a.user.email}</span>
                      <span className="text-[9px] font-bold uppercase ml-auto flex-shrink-0" style={{ color: a.role === 'cs' ? '#3b82f6' : '#a855f7' }}>{a.role}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Icon Tabs Bar */}
      <div className="glass rounded-b-2xl rounded-t-none mb-6" style={{ borderTop: '1px solid rgba(255,255,255,0.04)' }}>
        <div className="flex">
          {tabs.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className="flex-1 flex flex-col items-center gap-1.5 py-4 transition-all relative"
              style={{ color: tab === key ? '#E8792F' : '#475569' }}
              onMouseEnter={(e) => { if (tab !== key) e.currentTarget.style.color = '#A0AEC0'; }}
              onMouseLeave={(e) => { if (tab !== key) e.currentTarget.style.color = '#475569'; }}
            >
              <Icon size={20} />
              <span className="text-[11px] font-bold uppercase" style={{ letterSpacing: '0.05em' }}>{label}</span>
              {tab === key && <div className="absolute bottom-0 left-1/4 right-1/4 h-0.5" style={{ background: '#E8792F', borderRadius: '1px' }} />}
            </button>
          ))}
        </div>
      </div>

      {/* ===== OVERVIEW TAB ===== */}
      {tab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Left: Stats + Recent Timeline */}
          <div className="lg:col-span-2 space-y-5">
            {/* Stats row */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { icon: Video, label: 'Sessions', value: client.sessions.length, color: '#60a5fa' },
                { icon: FileText, label: 'Lessons', value: totalLessons, color: '#4ade80' },
                { icon: Phone, label: 'Calls', value: client.sessions.filter((s) => s.type === 'commercial_call').length, color: '#a855f7' },
                { icon: Sparkles, label: 'AI Reports', value: withSummary, color: '#E8792F' },
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

            {/* Recent Sessions Timeline */}
            <div>
              <h2 className="text-[13px] font-bold uppercase mb-4 flex items-center gap-2" style={{ color: '#A0AEC0', letterSpacing: '0.06em' }}>
                <Clock size={14} style={{ color: '#E8792F' }} />
                Recent Activity
              </h2>
              {Object.keys(groupedSessions).length === 0 ? (
                <div className="glass rounded-xl p-10 text-center text-sm" style={{ color: '#475569' }}>No sessions yet</div>
              ) : (
                <div className="space-y-5">
                  {Object.entries(groupedSessions).map(([dateLabel, sessions]) => (
                    <div key={dateLabel}>
                      <div className="flex items-center gap-3 mb-2">
                        <div className="w-2 h-2 rounded-full" style={{ background: '#E8792F', boxShadow: '0 0 6px rgba(232,121,47,0.6)' }} />
                        <span className="text-[11px] font-bold uppercase" style={{ color: '#A0AEC0', letterSpacing: '0.06em' }}>{dateLabel}</span>
                      </div>
                      <div className="space-y-2 ml-5 pl-4" style={{ borderLeft: '1px solid rgba(255,255,255,0.06)' }}>
                        {sessions.map((s) => (
                          <Link
                            key={s.id}
                            to={`/sessions/${s.id}`}
                            className="glass rounded-xl p-4 flex items-center justify-between transition-all hover:-translate-y-0.5"
                            onMouseEnter={(e) => { e.currentTarget.style.boxShadow = '0 8px 32px rgba(0,0,0,0.4), 0 0 0 1px rgba(232,121,47,0.15)'; }}
                            onMouseLeave={(e) => { e.currentTarget.style.boxShadow = '0 4px 24px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.05)'; }}
                          >
                            <div className="flex items-center gap-4">
                              <div>
                                <div className="text-[13px] font-bold text-white">{s.title}</div>
                                <div className="flex items-center gap-2 mt-0.5">
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
                                </div>
                              </div>
                            </div>
                            <div className="text-[11px]" style={{ color: '#475569' }}>
                              {new Date(s.date).toLocaleTimeString('en', { hour: '2-digit', minute: '2-digit' })}
                            </div>
                          </Link>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right: Calendar + Team quick view */}
          <div className="space-y-5">
            <MiniCalendar sessions={client.sessions} />

            {/* Team quick view */}
            <div className="glass rounded-xl p-5">
              <h3 className="text-[11px] font-bold uppercase mb-3" style={{ color: '#A0AEC0', letterSpacing: '0.06em' }}>Assigned Team</h3>
              {[
                { label: 'CS', people: csAssigned, color: '#3b82f6' },
                { label: 'Ops', people: opsAssigned, color: '#a855f7' },
              ].map(({ label, people, color }) => (
                <div key={label} className="mb-3 last:mb-0">
                  <div className="text-[10px] font-semibold uppercase mb-1.5" style={{ color: '#475569', letterSpacing: '0.04em' }}>{label}</div>
                  {people.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5">
                      {people.map((a) => (
                        <div key={a.id} className="flex items-center gap-1.5 px-2 py-1 rounded-lg text-[11px] font-semibold" style={{ background: `${color}12`, border: `1px solid ${color}25`, color }}>
                          <div className="w-4 h-4 rounded flex items-center justify-center text-[8px] font-bold text-white" style={{ background: color }}>
                            {(a.user.name || a.user.email)[0].toUpperCase()}
                          </div>
                          {a.user.name || a.user.email}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-[12px]" style={{ color: '#334155' }}>None assigned</div>
                  )}
                </div>
              ))}
            </div>

            {/* WhatsApp Groups */}
            {client.waProjects && client.waProjects.length > 0 && (
              <div className="glass rounded-xl p-5">
                <h3 className="text-[11px] font-bold uppercase mb-3 flex items-center gap-2" style={{ color: '#A0AEC0', letterSpacing: '0.06em' }}>
                  <MessageSquare size={13} style={{ color: '#25D366' }} />
                  WhatsApp Groups
                </h3>
                <div className="space-y-2">
                  {client.waProjects.map((wp) => (
                    <div
                      key={wp.id}
                      className="p-3 rounded-lg"
                      style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <div
                          className="w-7 h-7 rounded-lg flex items-center justify-center text-[11px] font-bold flex-shrink-0"
                          style={{ background: 'linear-gradient(135deg, #25D366, #128C7E)', color: '#fff' }}
                        >
                          {(wp.nombre || 'W')[0].toUpperCase()}
                        </div>
                        <span className="text-[13px] font-semibold text-white truncate">{wp.nombre}</span>
                        <span
                          className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded ml-auto flex-shrink-0"
                          style={{
                            letterSpacing: '0.04em',
                            ...(wp.estado === 'activo'
                              ? { background: 'rgba(74,222,128,0.12)', color: '#4ade80', border: '1px solid rgba(74,222,128,0.2)' }
                              : { background: 'rgba(248,113,113,0.12)', color: '#f87171', border: '1px solid rgba(248,113,113,0.2)' })
                          }}
                        >
                          {wp.estado}
                        </span>
                      </div>
                      {wp.ultimoMensaje && (
                        <p className="text-[11px] mt-1.5 truncate" style={{ color: '#94a3b8', maxWidth: '100%' }}>
                          "{wp.ultimoMensaje}"
                        </p>
                      )}
                      <div className="flex items-center gap-4 text-[11px] mt-1.5" style={{ color: '#64748b' }}>
                        <span className="flex items-center gap-1">
                          <MessageSquare size={11} />
                          {wp.totalMensajes} msgs
                        </span>
                        {wp.alertasCount > 0 && (
                          <span className="flex items-center gap-1" style={{ color: '#f87171' }}>
                            <AlertTriangle size={11} />
                            {wp.alertasCount} alerts
                          </span>
                        )}
                        {wp.ultimaActividad && (
                          <span className="flex items-center gap-1">
                            <Clock size={11} />
                            {new Date(wp.ultimaActividad).toLocaleDateString('en', { month: 'short', day: 'numeric' })}
                            {' '}
                            {new Date(wp.ultimaActividad).toLocaleTimeString('en', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ===== SESSIONS TAB ===== */}
      {tab === 'sessions' && (
        <>
          <div className="flex items-center justify-between mb-4">
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
            <button
              onClick={() => setShowSessionForm(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-white text-[11px] font-bold uppercase transition-transform hover:-translate-y-0.5"
              style={{ background: 'linear-gradient(135deg, #E8792F, #c45c1a)', letterSpacing: '0.05em', boxShadow: '0 0 20px rgba(232,121,47,0.35), 0 2px 8px rgba(0,0,0,0.3)' }}
            >
              <Plus size={14} />
              Add Session
            </button>
          </div>

          {filteredSessions.length === 0 ? (
            <div className="glass rounded-xl p-12 text-center text-sm" style={{ color: '#475569' }}>No sessions yet</div>
          ) : (
            <div className="space-y-2">
              {filteredSessions.map((s) => (
                <Link
                  key={s.id}
                  to={`/sessions/${s.id}`}
                  className="flex items-center justify-between glass rounded-xl p-4 transition-all hover:-translate-y-0.5"
                  onMouseEnter={(e) => { e.currentTarget.style.boxShadow = '0 8px 32px rgba(0,0,0,0.4), 0 0 0 1px rgba(232,121,47,0.15)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.boxShadow = '0 4px 24px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.05)'; }}
                >
                  <div>
                    <div className="text-[13px] font-semibold text-white">{s.title}</div>
                    <div className="text-[11px]" style={{ color: '#475569' }}>{new Date(s.date).toLocaleDateString()}</div>
                  </div>
                  <div className="flex items-center gap-3">
                    {s.aiSummary && (
                      <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded" style={{ background: 'rgba(74,222,128,0.12)', color: '#4ade80', border: '1px solid rgba(74,222,128,0.2)', letterSpacing: '0.04em' }}>
                        AI Summary
                      </span>
                    )}
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
                  </div>
                </Link>
              ))}
            </div>
          )}
        </>
      )}

      {/* ===== TEAM TAB ===== */}
      {tab === 'team' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {[
            { icon: Shield, title: 'Customer Success', role: 'cs', color: '#3b82f6', people: csAssigned },
            { icon: Settings, title: 'Operations', role: 'ops', color: '#a855f7', people: opsAssigned },
          ].map(({ icon: Icon, title, color, people }) => (
            <div key={title}>
              <div className="flex items-center gap-2 mb-3">
                <Icon size={16} style={{ color }} />
                <h2 className="text-[13px] font-bold uppercase" style={{ color: '#A0AEC0', letterSpacing: '0.06em' }}>{title}</h2>
              </div>
              {people.length > 0 ? (
                <div className="space-y-2">
                  {people.map((a) => (
                    <div key={a.id} className="glass rounded-xl p-4 flex items-center gap-4">
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold text-white shrink-0"
                        style={{ background: color, boxShadow: `0 0 16px ${color}40` }}
                      >
                        {(a.user.name || a.user.email)[0].toUpperCase()}
                      </div>
                      <div>
                        <div className="text-[13px] font-bold text-white">{a.user.name || 'Unnamed'}</div>
                        <div className="text-[11px]" style={{ color: '#64748b' }}>{a.user.email}</div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="glass rounded-xl p-8 text-center">
                  <Icon size={24} className="mx-auto mb-2 opacity-20" style={{ color }} />
                  <p className="text-xs" style={{ color: '#475569' }}>No {title.toLowerCase()} assigned</p>
                  <button
                    onClick={() => setEditing(true)}
                    className="text-[11px] font-bold uppercase mt-2 transition-colors"
                    style={{ color: '#E8792F', letterSpacing: '0.04em' }}
                  >
                    Assign now
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ===== NOTES TAB ===== */}
      {tab === 'notes' && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-[13px] font-bold uppercase" style={{ color: '#A0AEC0', letterSpacing: '0.06em' }}>Client Notes</h2>
            <button
              onClick={() => setEditing(true)}
              className="flex items-center gap-2 text-[11px] font-bold uppercase transition-colors"
              style={{ color: '#E8792F', letterSpacing: '0.04em' }}
            >
              <Edit size={13} />Edit Notes
            </button>
          </div>
          <div className="glass rounded-xl p-6">
            {client.notes ? (
              <p className="text-[13px] whitespace-pre-wrap" style={{ color: '#cbd5e0', lineHeight: '1.7' }}>{client.notes}</p>
            ) : (
              <div className="text-center py-8">
                <FileText size={32} className="mx-auto mb-3 opacity-20" style={{ color: '#E8792F' }} />
                <p className="text-sm" style={{ color: '#475569' }}>No notes yet</p>
                <button
                  onClick={() => setEditing(true)}
                  className="text-[11px] font-bold uppercase mt-2 transition-colors"
                  style={{ color: '#E8792F', letterSpacing: '0.04em' }}
                >
                  Add notes
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ===== ANALYSIS TAB ===== */}
      {tab === 'analysis' && (
        <div>
          {/* Header with Regenerate */}
          {analysis && !analysisLoading && (
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-[13px] font-bold uppercase flex items-center gap-2" style={{ color: '#A0AEC0', letterSpacing: '0.06em' }}>
                <BarChart3 size={14} style={{ color: '#E8792F' }} />
                Client Analysis
              </h2>
              <button
                onClick={handleGenerateAnalysis}
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-[11px] font-bold uppercase transition-all"
                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#A0AEC0', letterSpacing: '0.04em' }}
                onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'rgba(232,121,47,0.3)'; e.currentTarget.style.color = '#E8792F'; }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'; e.currentTarget.style.color = '#A0AEC0'; }}
              >
                <RefreshCw size={13} />Regenerate
              </button>
            </div>
          )}

          {/* Loading state */}
          {analysisLoading && (
            <div className="glass rounded-xl p-16 text-center">
              <Loader2 size={36} className="mx-auto mb-4 animate-spin" style={{ color: '#E8792F' }} />
              <p className="text-sm font-semibold" style={{ color: '#A0AEC0' }}>Generating comprehensive analysis...</p>
              <p className="text-xs mt-2" style={{ color: '#475569' }}>Analyzing all sessions with AI summaries</p>
            </div>
          )}

          {/* Empty / CTA state */}
          {!analysis && !analysisLoading && (
            <div className="glass rounded-xl p-16 text-center">
              <BarChart3 size={40} className="mx-auto mb-4 opacity-30" style={{ color: '#E8792F' }} />
              <h3 className="text-lg font-bold text-white mb-2">Client Analysis</h3>
              <p className="text-sm mb-6 max-w-md mx-auto" style={{ color: '#64748b' }}>
                Generate an AI-powered holistic report across all sessions — including progress tracking, deviation analysis, and upsell opportunities.
              </p>
              {analysisError && (
                <p className="text-xs mb-4" style={{ color: '#f87171' }}>{analysisError}</p>
              )}
              <button
                onClick={handleGenerateAnalysis}
                disabled={withSummary === 0}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-white text-[12px] font-bold uppercase transition-transform hover:-translate-y-0.5 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:translate-y-0"
                style={{ background: 'linear-gradient(135deg, #E8792F, #c45c1a)', letterSpacing: '0.05em', boxShadow: '0 0 20px rgba(232,121,47,0.35)' }}
              >
                <Sparkles size={15} />Generate Analysis
              </button>
              {withSummary === 0 && (
                <p className="text-[11px] mt-3" style={{ color: '#475569' }}>No sessions with AI summaries yet. Analyze individual sessions first.</p>
              )}
            </div>
          )}

          {/* Results */}
          {analysis && !analysisLoading && (
            <div className="space-y-5">
              {/* Global Summary — orange accent */}
              <div className="glass rounded-xl p-6 relative overflow-hidden" style={{ borderLeft: '3px solid #E8792F' }}>
                <div className="absolute top-0 right-0 w-40 h-40 pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(232,121,47,0.06), transparent 70%)' }} />
                <div className="flex items-center gap-2 mb-3">
                  <Sparkles size={16} style={{ color: '#E8792F' }} />
                  <h3 className="text-[12px] font-bold uppercase" style={{ color: '#E8792F', letterSpacing: '0.06em' }}>Global Summary</h3>
                </div>
                <p className="text-[13px] whitespace-pre-wrap" style={{ color: '#cbd5e0', lineHeight: '1.7' }}>{analysis.globalSummary}</p>
              </div>

              {/* Progress + Deviation — side by side */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* Progress */}
                <div className="glass rounded-xl p-6" style={{ borderLeft: '3px solid #4ade80' }}>
                  <div className="flex items-center gap-2 mb-3">
                    <TrendingUp size={16} style={{ color: '#4ade80' }} />
                    <h3 className="text-[12px] font-bold uppercase" style={{ color: '#4ade80', letterSpacing: '0.06em' }}>Progress So Far</h3>
                  </div>
                  <p className="text-[13px] whitespace-pre-wrap" style={{ color: '#cbd5e0', lineHeight: '1.7' }}>{analysis.progressReport}</p>
                </div>

                {/* Deviation */}
                <div className="glass rounded-xl p-6" style={{ borderLeft: '3px solid #fbbf24' }}>
                  <div className="flex items-center gap-2 mb-3">
                    <GitCompare size={16} style={{ color: '#fbbf24' }} />
                    <h3 className="text-[12px] font-bold uppercase" style={{ color: '#fbbf24', letterSpacing: '0.06em' }}>Deviation from Commercial Call</h3>
                  </div>
                  <p className="text-[13px] whitespace-pre-wrap" style={{ color: '#cbd5e0', lineHeight: '1.7' }}>{analysis.deviationAnalysis}</p>
                </div>
              </div>

              {/* All Pending Items — amber tinted */}
              <div className="rounded-xl p-6" style={{ background: 'rgba(251,191,36,0.04)', border: '1px solid rgba(251,191,36,0.12)', borderLeft: '3px solid #fbbf24' }}>
                <div className="flex items-center gap-2 mb-3">
                  <ListChecks size={16} style={{ color: '#fbbf24' }} />
                  <h3 className="text-[12px] font-bold uppercase" style={{ color: '#fbbf24', letterSpacing: '0.06em' }}>All Pending Items</h3>
                </div>
                <p className="text-[13px] whitespace-pre-wrap" style={{ color: '#cbd5e0', lineHeight: '1.7' }}>{analysis.allPendingItems}</p>
              </div>

              {/* Upsell Opportunities — purple border */}
              <div className="glass rounded-xl p-6" style={{ borderLeft: '3px solid #a855f7' }}>
                <div className="flex items-center gap-2 mb-3">
                  <DollarSign size={16} style={{ color: '#a855f7' }} />
                  <h3 className="text-[12px] font-bold uppercase" style={{ color: '#a855f7', letterSpacing: '0.06em' }}>Upsell Opportunities</h3>
                </div>
                <p className="text-[13px] whitespace-pre-wrap" style={{ color: '#cbd5e0', lineHeight: '1.7' }}>{analysis.upsellOpportunities}</p>
              </div>
            </div>
          )}
        </div>
      )}

      {editing && <ClientForm client={client} onSave={handleUpdate} onCancel={() => setEditing(false)} />}
      {showSessionForm && <SessionForm clientId={id} onSave={handleCreateSession} onCancel={() => setShowSessionForm(false)} />}

      {/* Notes Modal */}
      {showNotes && (
        <div className="fixed inset-0 flex items-center justify-center z-50" style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(2px)' }}>
          <div className="glass w-full max-w-md rounded-2xl p-5" style={{ boxShadow: '0 25px 50px rgba(0,0,0,0.5)' }}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-[13px] font-bold uppercase text-white flex items-center gap-2" style={{ letterSpacing: '0.06em' }}>
                <FileText size={14} style={{ color: '#E8792F' }} />
                Notes
              </h2>
              <button onClick={() => setShowNotes(false)} style={{ color: '#475569' }} className="transition-colors"
                onMouseEnter={(e) => e.currentTarget.style.color = '#A0AEC0'}
                onMouseLeave={(e) => e.currentTarget.style.color = '#475569'}
              >
                <X size={16} />
              </button>
            </div>
            <textarea
              value={notesValue}
              onChange={(e) => setNotesValue(e.target.value)}
              rows={6}
              placeholder="Add notes about this client..."
              className="w-full px-3 py-2.5 rounded-lg text-sm outline-none resize-none"
              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', lineHeight: '1.6' }}
              onFocus={(e) => e.target.style.borderColor = 'rgba(232,121,47,0.5)'}
              onBlur={(e) => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}
              autoFocus
            />
            <div className="flex justify-end gap-3 mt-4">
              <button onClick={() => setShowNotes(false)} className="px-4 py-2 text-xs font-medium" style={{ color: '#64748b' }}>
                Cancel
              </button>
              <button
                onClick={handleSaveNotes}
                className="px-5 py-2 rounded-lg text-white text-[11px] font-bold uppercase transition-transform hover:-translate-y-0.5"
                style={{ background: 'linear-gradient(135deg, #E8792F, #c45c1a)', letterSpacing: '0.05em', boxShadow: '0 0 20px rgba(232,121,47,0.35)' }}
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
