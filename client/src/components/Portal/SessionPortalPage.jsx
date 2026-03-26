import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { portalAPI } from '../../services/api';
import VideoEmbed from '../Sessions/VideoEmbed';

export default function SessionPortalPage() {
  const { token, sessionId } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchSession = async () => {
      try {
        const res = await portalAPI.getSession(token, sessionId);
        setData(res.data);
      } catch (err) {
        setError(err.response?.status === 404 ? 'Session not found' : 'Failed to load session');
      } finally {
        setLoading(false);
      }
    };
    fetchSession();
  }, [token, sessionId]);

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
          <h2 className="text-lg font-extrabold text-white mb-2">Session Unavailable</h2>
          <p className="text-sm mb-4" style={{ color: '#64748b' }}>{error}</p>
          <Link
            to={`/portal/${token}`}
            className="text-[11px] font-bold uppercase transition-colors"
            style={{ color: '#E8792F', letterSpacing: '0.04em' }}
          >
            Back to Portal
          </Link>
        </div>
      </div>
    );
  }

  const { client, session } = data;
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
        {/* Back Link */}
        <Link
          to={`/portal/${token}`}
          className="inline-flex items-center gap-2 text-xs mb-5 transition-colors"
          style={{ color: '#64748b' }}
          onMouseEnter={(e) => e.currentTarget.style.color = '#E8792F'}
          onMouseLeave={(e) => e.currentTarget.style.color = '#64748b'}
        >
          <ArrowLeft size={14} />
          Back to Portal
        </Link>

        {/* Session Header */}
        <div className="mb-7">
          <h1 className="text-xl font-extrabold text-white">{session.title}</h1>
          <div className="flex items-center gap-3 mt-2">
            <span
              className="text-[10px] font-bold uppercase px-2 py-0.5 rounded"
              style={{
                letterSpacing: '0.04em',
                ...(session.type === 'commercial_call'
                  ? { background: 'rgba(168,85,247,0.12)', color: '#a855f7', border: '1px solid rgba(168,85,247,0.2)' }
                  : { background: 'rgba(96,165,250,0.12)', color: '#60a5fa', border: '1px solid rgba(96,165,250,0.2)' })
              }}
            >
              {session.type === 'commercial_call' ? 'Commercial Call' : 'Lesson'}
            </span>
            <span className="text-[11px]" style={{ color: '#475569' }}>
              {new Date(session.date).toLocaleDateString('en', { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' })}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column: Recording + Transcription */}
          <div className="space-y-6">
            {session.recordingUrl && (
              <div>
                <h2 className="text-[13px] font-bold uppercase mb-3" style={{ color: '#A0AEC0', letterSpacing: '0.06em' }}>Recording</h2>
                <VideoEmbed url={session.recordingUrl} />
              </div>
            )}

            <div>
              <h2 className="text-[13px] font-bold uppercase mb-3" style={{ color: '#A0AEC0', letterSpacing: '0.06em' }}>Transcription</h2>
              {session.transcription ? (
                <div className="glass rounded-xl p-5 max-h-96 overflow-y-auto">
                  <p className="text-[13px] whitespace-pre-wrap" style={{ color: '#cbd5e0', lineHeight: '1.65' }}>{session.transcription}</p>
                </div>
              ) : (
                <div className="glass rounded-xl p-8 text-center text-xs" style={{ color: '#475569' }}>
                  No transcription available
                </div>
              )}
            </div>
          </div>

          {/* Right Column: AI Summary + Pending Items */}
          <div className="space-y-6">
            {/* AI Summary */}
            <div>
              <h2 className="text-[13px] font-bold uppercase mb-3" style={{ color: '#A0AEC0', letterSpacing: '0.06em' }}>AI Summary</h2>
              {session.aiSummary ? (
                <div className="glass rounded-xl p-5">
                  <p className="text-[13px] whitespace-pre-wrap" style={{ color: '#cbd5e0', lineHeight: '1.65' }}>{session.aiSummary}</p>
                </div>
              ) : (
                <div className="glass rounded-xl p-8 text-center text-xs" style={{ color: '#475569' }}>
                  No AI summary available
                </div>
              )}
            </div>

            {/* Pending Items */}
            <div>
              <h2 className="text-[13px] font-bold uppercase mb-3" style={{ color: '#A0AEC0', letterSpacing: '0.06em' }}>Pending Items</h2>
              {session.pendingItems ? (
                <div className="glass-orange rounded-xl p-5">
                  <p className="text-[13px] whitespace-pre-wrap" style={{ color: '#cbd5e0', lineHeight: '1.65' }}>{session.pendingItems}</p>
                </div>
              ) : (
                <div className="glass rounded-xl p-8 text-center text-xs" style={{ color: '#475569' }}>
                  No pending items
                </div>
              )}
            </div>
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
