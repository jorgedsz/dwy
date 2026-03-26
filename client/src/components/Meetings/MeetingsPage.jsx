import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Calendar, ExternalLink, Video, MapPin, Users, X, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { calendarAPI } from '../../services/api';

const FILTERS = [
  { label: 'Today', key: 'today' },
  { label: 'This Week', key: 'week' },
  { label: 'This Month', key: 'month' },
];

function getTimeRange(key) {
  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  let timeMin, timeMax;

  switch (key) {
    case 'today':
      timeMin = startOfDay.toISOString();
      timeMax = new Date(startOfDay.getTime() + 86400000).toISOString();
      break;
    case 'week': {
      const day = startOfDay.getDay();
      const monday = new Date(startOfDay.getTime() - (day === 0 ? 6 : day - 1) * 86400000);
      timeMin = monday.toISOString();
      timeMax = new Date(monday.getTime() + 7 * 86400000).toISOString();
      break;
    }
    case 'month':
      timeMin = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
      timeMax = new Date(now.getFullYear(), now.getMonth() + 1, 1).toISOString();
      break;
    default:
      timeMin = startOfDay.toISOString();
      timeMax = new Date(startOfDay.getTime() + 86400000).toISOString();
  }
  return { timeMin, timeMax };
}

function formatTime(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });
}

export default function MeetingsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [integrations, setIntegrations] = useState([]);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [eventsLoading, setEventsLoading] = useState(false);
  const [filter, setFilter] = useState('week');
  const [flash, setFlash] = useState(null);

  // Flash messages from OAuth redirect
  useEffect(() => {
    if (searchParams.get('calendarConnected')) {
      setFlash({ type: 'success', message: 'Google Calendar connected successfully!' });
      setSearchParams({}, { replace: true });
    } else if (searchParams.get('calendarError')) {
      setFlash({ type: 'error', message: `Connection failed: ${searchParams.get('calendarError')}` });
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  // Auto-dismiss flash
  useEffect(() => {
    if (flash) {
      const t = setTimeout(() => setFlash(null), 5000);
      return () => clearTimeout(t);
    }
  }, [flash]);

  // Load integrations
  useEffect(() => {
    async function load() {
      try {
        const { data } = await calendarAPI.getIntegrations();
        setIntegrations(data.integrations);
      } catch (err) {
        console.error('Failed to load integrations:', err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  // Load events when integrations exist and filter changes
  useEffect(() => {
    if (integrations.length === 0) return;
    async function loadEvents() {
      setEventsLoading(true);
      try {
        const { timeMin, timeMax } = getTimeRange(filter);
        const { data } = await calendarAPI.getEvents({ timeMin, timeMax });
        setEvents(data.events);
      } catch (err) {
        console.error('Failed to load events:', err);
      } finally {
        setEventsLoading(false);
      }
    }
    loadEvents();
  }, [integrations, filter]);

  async function handleConnect() {
    try {
      const { data } = await calendarAPI.getAuthUrl();
      window.location.href = data.url;
    } catch (err) {
      console.error('Failed to get auth URL:', err);
    }
  }

  async function handleDisconnect(id) {
    try {
      await calendarAPI.disconnect(id);
      setIntegrations((prev) => prev.filter((i) => i.id !== id));
      setEvents([]);
    } catch (err) {
      console.error('Failed to disconnect:', err);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="animate-spin" size={24} style={{ color: '#64748b' }} />
      </div>
    );
  }

  const connected = integrations.length > 0;

  // Group events by date
  const grouped = {};
  events.forEach((evt) => {
    const dateKey = formatDate(evt.start);
    if (!grouped[dateKey]) grouped[dateKey] = [];
    grouped[dateKey].push(evt);
  });

  return (
    <div>
      {/* Flash message */}
      {flash && (
        <div
          className="mb-4 px-4 py-3 rounded-lg flex items-center gap-2 text-sm"
          style={{
            background: flash.type === 'success' ? 'rgba(34,197,94,0.12)' : 'rgba(239,68,68,0.12)',
            border: `1px solid ${flash.type === 'success' ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.3)'}`,
            color: flash.type === 'success' ? '#4ade80' : '#f87171',
          }}
        >
          {flash.type === 'success' ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
          {flash.message}
          <button onClick={() => setFlash(null)} className="ml-auto opacity-60 hover:opacity-100">
            <X size={14} />
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold" style={{ color: '#F1F5F9' }}>Meetings</h1>
          <p className="text-sm mt-0.5" style={{ color: '#64748b' }}>Your upcoming calendar events</p>
        </div>
        {connected && (
          <div className="flex items-center gap-3">
            {integrations.map((intg) => (
              <div
                key={intg.id}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs"
                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', color: '#94a3b8' }}
              >
                <div className="w-2 h-2 rounded-full" style={{ background: '#4ade80' }} />
                {intg.externalAccountId}
                <button
                  onClick={() => handleDisconnect(intg.id)}
                  className="ml-1 opacity-50 hover:opacity-100 transition-opacity"
                  title="Disconnect"
                >
                  <X size={12} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Not connected: CTA */}
      {!connected && (
        <div
          className="glass rounded-xl p-8 text-center"
          style={{ border: '1px solid rgba(255,255,255,0.08)' }}
        >
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
            style={{ background: 'rgba(232,121,47,0.12)' }}
          >
            <Calendar size={28} style={{ color: '#E8792F' }} />
          </div>
          <h2 className="text-lg font-semibold mb-2" style={{ color: '#F1F5F9' }}>
            Connect Google Calendar
          </h2>
          <p className="text-sm mb-6 max-w-md mx-auto" style={{ color: '#64748b' }}>
            View all your meetings in one place. Connect your Google Calendar to see upcoming events, join calls, and stay organized.
          </p>
          <button
            onClick={handleConnect}
            className="px-6 py-2.5 rounded-lg text-sm font-semibold text-white transition-all hover:shadow-lg"
            style={{
              background: 'linear-gradient(135deg, #E8792F, #d4651f)',
              boxShadow: '0 4px 14px rgba(232,121,47,0.3)',
            }}
          >
            Connect Google Calendar
          </button>
        </div>
      )}

      {/* Connected: filters + events */}
      {connected && (
        <>
          {/* Filter pills */}
          <div className="flex gap-2 mb-5">
            {FILTERS.map((f) => (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
                className="px-4 py-1.5 rounded-full text-xs font-medium transition-all"
                style={
                  filter === f.key
                    ? { background: 'rgba(232,121,47,0.15)', color: '#E8792F', border: '1px solid rgba(232,121,47,0.3)' }
                    : { background: 'rgba(255,255,255,0.04)', color: '#94a3b8', border: '1px solid rgba(255,255,255,0.08)' }
                }
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* Events list */}
          {eventsLoading ? (
            <div className="flex items-center justify-center h-40">
              <Loader2 className="animate-spin" size={20} style={{ color: '#64748b' }} />
            </div>
          ) : events.length === 0 ? (
            <div className="text-center py-12" style={{ color: '#64748b' }}>
              <Calendar size={32} className="mx-auto mb-3 opacity-40" />
              <p className="text-sm">No meetings found for this period</p>
            </div>
          ) : (
            <div className="space-y-6">
              {Object.entries(grouped).map(([date, dayEvents]) => (
                <div key={date}>
                  <h3 className="text-xs font-semibold uppercase tracking-wider mb-3 px-1" style={{ color: '#64748b' }}>
                    {date}
                  </h3>
                  <div className="space-y-2">
                    {dayEvents.map((evt) => (
                      <div
                        key={`${evt.integrationId}-${evt.id}`}
                        className="glass rounded-lg flex overflow-hidden transition-all hover:translate-x-0.5"
                        style={{ border: '1px solid rgba(255,255,255,0.08)' }}
                      >
                        {/* Accent bar */}
                        <div className="w-1 flex-shrink-0" style={{ background: '#E8792F' }} />

                        {/* Time column */}
                        <div className="w-20 flex-shrink-0 flex flex-col items-center justify-center py-3 px-2" style={{ borderRight: '1px solid rgba(255,255,255,0.06)' }}>
                          <span className="text-sm font-semibold" style={{ color: '#F1F5F9' }}>
                            {formatTime(evt.start)}
                          </span>
                          <span className="text-[10px] mt-0.5" style={{ color: '#64748b' }}>
                            {formatTime(evt.end)}
                          </span>
                        </div>

                        {/* Content */}
                        <div className="flex-1 py-3 px-4 min-w-0">
                          <h4 className="text-sm font-medium truncate" style={{ color: '#F1F5F9' }}>
                            {evt.title}
                          </h4>
                          <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                            {evt.location && (
                              <span className="flex items-center gap-1 text-[11px]" style={{ color: '#94a3b8' }}>
                                <MapPin size={11} />
                                <span className="truncate max-w-[180px]">{evt.location}</span>
                              </span>
                            )}
                            {evt.attendees.length > 0 && (
                              <span className="flex items-center gap-1 text-[11px]" style={{ color: '#94a3b8' }}>
                                <Users size={11} />
                                {evt.attendees.length} attendee{evt.attendees.length !== 1 ? 's' : ''}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-2 px-3 flex-shrink-0">
                          {evt.hangoutLink && (
                            <a
                              href={evt.hangoutLink}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all"
                              style={{ background: 'rgba(232,121,47,0.12)', color: '#E8792F', border: '1px solid rgba(232,121,47,0.25)' }}
                            >
                              <Video size={12} />
                              Join
                            </a>
                          )}
                          {evt.htmlLink && (
                            <a
                              href={evt.htmlLink}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-1 px-2 py-1.5 rounded-md text-xs transition-opacity opacity-50 hover:opacity-100"
                              style={{ color: '#94a3b8' }}
                              title="Open in Google Calendar"
                            >
                              <ExternalLink size={12} />
                            </a>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
