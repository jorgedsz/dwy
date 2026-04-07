import { useState, useEffect, useRef } from 'react';
import { trainingAPI } from '../../services/api';

export default function TrainingCallModal({ agent, onClose, onAccepted }) {
  const [phase, setPhase] = useState('idle'); // idle, connecting, active, ended, review
  const [transcript, setTranscript] = useState([]);
  const [muted, setMuted] = useState(false);
  const [volume, setVolume] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [session, setSession] = useState(null);
  const [proposedChanges, setProposedChanges] = useState([]);
  const [error, setError] = useState(null);
  const [accepting, setAccepting] = useState(false);
  const vapiRef = useRef(null);
  const timerRef = useRef(null);
  const transcriptEndRef = useRef(null);

  const startCall = async () => {
    try {
      setError(null);
      setPhase('connecting');
      setTranscript([]);
      setElapsed(0);
      setMuted(false);
      setVolume(0);

      // Create training session on server
      const { data } = await trainingAPI.createSession(agent.id);
      setSession(data.session);

      if (!agent.vapiPublicKey) {
        setError('VAPI Public Key is not configured for this agent. Set it in agent settings.');
        setPhase('idle');
        return;
      }

      // Dynamic import of VAPI SDK
      const { default: Vapi } = await import('@vapi-ai/web');
      const vapi = new Vapi(agent.vapiPublicKey);
      vapiRef.current = vapi;

      vapi.on('call-start', () => {
        setPhase('active');
        timerRef.current = setInterval(() => {
          setElapsed(prev => prev + 1);
        }, 1000);
      });

      vapi.on('call-end', () => {
        handleCallEnd(data.session.id);
      });

      vapi.on('message', (msg) => {
        if (msg.type === 'transcript' && msg.transcriptType === 'final') {
          setTranscript(prev => [...prev, {
            role: msg.role === 'assistant' ? 'Agent' : 'You',
            text: msg.transcript
          }]);
        } else if (msg.type === 'conversation-update' && msg.conversation) {
          setTranscript(
            msg.conversation
              .filter(m => m.role === 'assistant' || m.role === 'user')
              .map(m => ({
                role: m.role === 'assistant' ? 'Agent' : 'You',
                text: m.content
              }))
          );
        }
      });

      vapi.on('volume-level', (level) => setVolume(level));

      vapi.on('error', (err) => {
        console.error('VAPI training call error:', err);
        setPhase('ended');
        setTranscript(prev => [...prev, {
          role: 'System',
          text: `Error: ${err.message || 'Call failed'}`
        }]);
        clearTimer();
      });

      // Start with inline config (not an assistant ID)
      await vapi.start(data.vapiConfig);
    } catch (err) {
      console.error('Failed to start training call:', err);
      setError(err.response?.data?.error || err.message || 'Failed to start call');
      setPhase('idle');
    }
  };

  const handleCallEnd = async (sessionId) => {
    clearTimer();
    setPhase('ended');

    try {
      // Build transcript text
      const transcriptText = transcript.map(t => `${t.role}: ${t.text}`).join('\n');
      const { data } = await trainingAPI.completeSession(
        sessionId || session?.id,
        transcriptText
      );
      setSession(data);
      setProposedChanges(data.proposedChanges || []);

      if (data.proposedChanges?.length > 0) {
        setPhase('review');
      }
    } catch (err) {
      console.error('Failed to complete session:', err);
    }
  };

  const stopCall = () => {
    if (vapiRef.current) {
      vapiRef.current.stop();
      vapiRef.current = null;
    }
    // call-end event will handle the rest
  };

  const toggleMute = () => {
    if (vapiRef.current) {
      const newMuted = !muted;
      vapiRef.current.setMuted(newMuted);
      setMuted(newMuted);
    }
  };

  const handleAccept = async () => {
    if (!session) return;
    setAccepting(true);
    try {
      await trainingAPI.acceptSession(session.id);
      onAccepted?.();
      onClose();
    } catch (err) {
      console.error('Failed to accept:', err);
      setError(err.response?.data?.error || 'Failed to apply changes');
    } finally {
      setAccepting(false);
    }
  };

  const handleReject = async () => {
    if (!session) return;
    try {
      await trainingAPI.rejectSession(session.id);
      onClose();
    } catch (err) {
      console.error('Failed to reject:', err);
    }
  };

  const handleClose = () => {
    if (vapiRef.current) {
      vapiRef.current.stop();
      vapiRef.current = null;
    }
    clearTimer();
    onClose();
  };

  const clearTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  const formatElapsed = (seconds) => {
    const mins = Math.floor(seconds / 60).toString().padStart(2, '0');
    const secs = (seconds % 60).toString().padStart(2, '0');
    return `${mins}:${secs}`;
  };

  useEffect(() => {
    if (transcriptEndRef.current) {
      transcriptEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [transcript]);

  useEffect(() => {
    return () => {
      if (vapiRef.current) {
        vapiRef.current.stop();
        vapiRef.current = null;
      }
      clearTimer();
    };
  }, []);

  // Field label helper
  const fieldLabel = (field) => {
    const labels = { firstMessage: 'First Message', systemPrompt: 'System Prompt', name: 'Name' };
    return labels[field] || field;
  };

  // Review phase — show diff
  if (phase === 'review') {
    return (
      <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
        <div className="glass rounded-xl w-full max-w-lg shadow-2xl" style={{ border: '1px solid rgba(232,121,47,0.3)' }}>
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
            <h3 className="text-base font-semibold text-white">Review Changes</h3>
            <button onClick={handleClose} className="text-gray-500 hover:text-gray-300 transition-colors">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Changes */}
          <div className="p-5 space-y-4 max-h-[60vh] overflow-y-auto">
            {proposedChanges.length === 0 && (
              <p className="text-sm text-gray-400 text-center py-4">No changes were proposed during the call.</p>
            )}
            {proposedChanges.map((change, i) => (
              <div key={i} className="rounded-lg p-4" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-xs font-bold uppercase px-2 py-0.5 rounded" style={{ background: 'rgba(232,121,47,0.15)', color: '#E8792F' }}>
                    {fieldLabel(change.field)}
                  </span>
                  {change.description && (
                    <span className="text-xs text-gray-500">{change.description}</span>
                  )}
                </div>
                {/* Old value */}
                <div className="mb-2">
                  <span className="text-[10px] font-semibold uppercase text-red-400/70 tracking-wider">Before</span>
                  <div className="mt-1 text-sm rounded p-2 font-mono break-words" style={{ background: 'rgba(239,68,68,0.08)', color: '#fca5a5', border: '1px solid rgba(239,68,68,0.15)' }}>
                    {change.oldValue || '(empty)'}
                  </div>
                </div>
                {/* New value */}
                <div>
                  <span className="text-[10px] font-semibold uppercase text-green-400/70 tracking-wider">After</span>
                  <div className="mt-1 text-sm rounded p-2 font-mono break-words" style={{ background: 'rgba(34,197,94,0.08)', color: '#86efac', border: '1px solid rgba(34,197,94,0.15)' }}>
                    {change.newValue}
                  </div>
                </div>
              </div>
            ))}

            {error && (
              <div className="text-sm text-red-400 text-center">{error}</div>
            )}
          </div>

          {/* Actions */}
          {proposedChanges.length > 0 && (
            <div className="flex items-center justify-end gap-3 px-5 py-4" style={{ borderTop: '1px solid rgba(255,255,255,0.07)' }}>
              <button
                onClick={handleReject}
                className="px-4 py-2 text-sm rounded-lg transition-colors"
                style={{ color: '#94a3b8', border: '1px solid rgba(255,255,255,0.1)' }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                Reject
              </button>
              <button
                onClick={handleAccept}
                disabled={accepting}
                className="px-4 py-2 text-sm font-semibold text-white rounded-lg transition-colors disabled:opacity-50"
                style={{ background: '#E8792F' }}
                onMouseEnter={e => { if (!accepting) e.currentTarget.style.background = '#d06a28'; }}
                onMouseLeave={e => e.currentTarget.style.background = '#E8792F'}
              >
                {accepting ? 'Applying...' : `Accept ${proposedChanges.length} Change${proposedChanges.length > 1 ? 's' : ''}`}
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Call phase
  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="glass rounded-xl w-full max-w-md shadow-2xl" style={{ border: '1px solid rgba(232,121,47,0.3)' }}>
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full" style={{ background: '#E8792F' }} />
            <h3 className="text-base font-semibold text-white">Training Mode</h3>
          </div>
          <button onClick={handleClose} className="text-gray-500 hover:text-gray-300 transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Mic Icon & Status */}
          <div className="flex flex-col items-center gap-3">
            <div className="relative">
              {phase === 'active' && (
                <div
                  className="absolute -inset-3 rounded-full animate-ping"
                  style={{ border: '1px solid rgba(232,121,47,0.4)', opacity: Math.min(volume * 2, 0.5), animationDuration: '1.5s' }}
                />
              )}
              <div className={`relative w-20 h-20 rounded-full flex items-center justify-center transition-all duration-300 ${
                phase === 'active'
                  ? 'border-2'
                  : phase === 'connecting'
                  ? 'border-2'
                  : 'border-2 border-gray-600/50'
              }`} style={{
                background: phase === 'active' ? 'rgba(232,121,47,0.1)' : phase === 'connecting' ? 'rgba(234,179,8,0.1)' : 'rgba(255,255,255,0.03)',
                borderColor: phase === 'active' ? 'rgba(232,121,47,0.4)' : phase === 'connecting' ? 'rgba(234,179,8,0.4)' : undefined,
              }}>
                <svg className="w-8 h-8 transition-colors duration-300" style={{
                  color: phase === 'active' ? '#E8792F' : phase === 'connecting' ? '#eab308' : '#6b7280'
                }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                </svg>
              </div>
            </div>
            <span className="text-sm" style={{ color: '#94a3b8' }}>
              {phase === 'idle' && 'Ready to train'}
              {phase === 'connecting' && 'Connecting...'}
              {phase === 'active' && 'Training call active'}
              {phase === 'ended' && 'Processing...'}
            </span>
            {(phase === 'active' || phase === 'ended') && elapsed > 0 && (
              <span className="text-xs font-mono" style={{ color: '#64748b' }}>
                {formatElapsed(elapsed)}
              </span>
            )}
          </div>

          {/* Error */}
          {error && (
            <div className="text-sm text-red-400 text-center px-4">{error}</div>
          )}

          {/* Call Controls */}
          <div className="flex items-center justify-center gap-4">
            {phase === 'active' && (
              <button
                onClick={toggleMute}
                className="p-3 rounded-xl transition-all duration-200"
                style={{
                  background: muted ? 'rgba(239,68,68,0.15)' : 'rgba(255,255,255,0.05)',
                  color: muted ? '#f87171' : '#94a3b8',
                  border: muted ? '1px solid rgba(239,68,68,0.3)' : '1px solid rgba(255,255,255,0.1)',
                }}
              >
                {muted ? (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                  </svg>
                )}
              </button>
            )}

            {(phase === 'idle' || phase === 'ended') ? (
              <button
                onClick={startCall}
                className="p-4 rounded-2xl text-white transition-all duration-200 shadow-lg"
                style={{ background: '#E8792F', boxShadow: '0 4px 15px rgba(232,121,47,0.3)' }}
                onMouseEnter={e => e.currentTarget.style.background = '#d06a28'}
                onMouseLeave={e => e.currentTarget.style.background = '#E8792F'}
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                </svg>
              </button>
            ) : phase === 'connecting' ? (
              <button disabled className="p-4 rounded-2xl text-white cursor-not-allowed shadow-lg" style={{ background: 'rgba(234,179,8,0.5)' }}>
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white" />
              </button>
            ) : phase === 'active' ? (
              <button
                onClick={stopCall}
                className="p-4 rounded-2xl bg-red-600 text-white hover:bg-red-500 transition-all duration-200 shadow-lg"
              >
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M3.68 16.07l3.92-3.11V9.59c2.85-.93 5.94-.93 8.8 0v3.38l3.91 3.1c.46.36.66.96.5 1.52-.5 1.58-1.33 3.04-2.43 4.28-.37.42-.92.63-1.48.55-1.98-.29-3.86-.97-5.53-1.96a18.8 18.8 0 01-5.53 1.96c-.56.08-1.11-.13-1.48-.55-1.1-1.24-1.93-2.7-2.43-4.28a1.47 1.47 0 01.5-1.52h.25z" />
                </svg>
              </button>
            ) : null}
          </div>

          {/* Transcript */}
          <div className="rounded-xl overflow-hidden" style={{ border: '1px solid rgba(232,121,47,0.2)', background: 'rgba(0,0,0,0.2)' }}>
            <div className="px-4 py-2.5" style={{ borderBottom: '1px solid rgba(232,121,47,0.15)', background: 'rgba(232,121,47,0.05)' }}>
              <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: '#E8792F' }}>Transcript</span>
            </div>
            <div className="h-48 overflow-y-auto p-4 space-y-2.5">
              {transcript.length === 0 ? (
                <p className="text-sm text-center py-8" style={{ color: '#64748b' }}>
                  {phase === 'idle' ? 'Start a training call to modify your agent via voice' : 'Waiting for conversation...'}
                </p>
              ) : (
                transcript.map((entry, i) => (
                  <div key={i} className={`text-sm ${
                    entry.role === 'Agent' ? 'text-orange-300' : entry.role === 'System' ? 'text-red-400' : 'text-gray-400'
                  }`}>
                    <span className="font-medium">{entry.role}:</span> {entry.text}
                  </div>
                ))
              )}
              <div ref={transcriptEndRef} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
