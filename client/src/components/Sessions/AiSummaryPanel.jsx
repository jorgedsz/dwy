import { useState, useEffect, useRef } from 'react';
import { Sparkles, RefreshCw, CheckCircle, Loader, AlertCircle } from 'lucide-react';
import api from '../../services/api';

export default function AiSummaryPanel({ session, onUpdate }) {
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState(null);
  const triggeredRef = useRef(false);
  const pollRef = useRef(null);
  const attemptsRef = useRef(0);

  // Auto-trigger analysis when transcription exists but no AI summary yet
  useEffect(() => {
    if (session.transcription && !session.aiSummary && !triggeredRef.current) {
      triggeredRef.current = true;
      triggerAndPoll();
    }
    return () => stopPolling();
  }, [session.id, session.transcription, session.aiSummary]);

  const stopPolling = () => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  };

  const triggerAndPoll = async () => {
    setAnalyzing(true);
    setError(null);
    attemptsRef.current = 0;

    try {
      // Trigger analysis (returns immediately)
      await api.post(`/sessions/${session.id}/analyze`);
    } catch (err) {
      const msg = err.response?.data?.error || err.message || 'Failed to start analysis';
      setError(msg);
      setAnalyzing(false);
      return;
    }

    // Poll every 3s for up to 60s
    pollRef.current = setInterval(async () => {
      attemptsRef.current += 1;
      if (attemptsRef.current > 20) {
        stopPolling();
        setError('Analysis timed out. Click retry to try again.');
        setAnalyzing(false);
        return;
      }
      try {
        const res = await api.get(`/sessions/${session.id}`);
        if (res.data.aiSummary) {
          stopPolling();
          setAnalyzing(false);
          onUpdate({ aiSummary: res.data.aiSummary, pendingItems: res.data.pendingItems });
        }
      } catch (_) { /* ignore poll errors */ }
    }, 3000);
  };

  const handleRetry = () => {
    triggeredRef.current = false;
    triggerAndPoll();
  };

  if (!session.transcription && !session.aiSummary) {
    return (
      <div className="glass rounded-xl p-8 text-center">
        <Sparkles size={24} className="mx-auto mb-3 opacity-30" style={{ color: '#E8792F' }} />
        <p className="text-xs" style={{ color: '#475569' }}>Add a transcription to generate an AI summary</p>
      </div>
    );
  }

  // Currently analyzing
  if (analyzing) {
    return (
      <div className="glass rounded-xl p-8 text-center">
        <Loader size={24} className="mx-auto mb-3 animate-spin" style={{ color: '#E8792F' }} />
        <p className="text-xs font-semibold" style={{ color: '#E8792F' }}>Generating AI analysis...</p>
        <p className="text-[11px] mt-1" style={{ color: '#475569' }}>This may take up to 30 seconds</p>
      </div>
    );
  }

  // Analysis failed
  if (error && !session.aiSummary) {
    return (
      <div className="glass rounded-xl p-6 text-center">
        <AlertCircle size={24} className="mx-auto mb-3" style={{ color: '#f87171' }} />
        <p className="text-xs font-semibold mb-1" style={{ color: '#f87171' }}>AI analysis failed</p>
        <p className="text-[11px] mb-4" style={{ color: '#475569' }}>{error}</p>
        <button
          onClick={handleRetry}
          className="inline-flex items-center gap-2 text-[11px] font-bold uppercase"
          style={{ color: '#E8792F', letterSpacing: '0.04em' }}
        >
          <RefreshCw size={14} />
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {session.aiSummary && (
        <div className="glass-orange rounded-xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles size={15} style={{ color: '#E8792F' }} />
            <h3 className="text-[13px] font-bold uppercase" style={{ color: '#E8792F', letterSpacing: '0.04em' }}>AI Summary</h3>
          </div>
          <p className="text-[13px] whitespace-pre-wrap" style={{ color: '#cbd5e0', lineHeight: '1.65' }}>{session.aiSummary}</p>
        </div>
      )}

      {session.pendingItems && (
        <div className="rounded-xl p-5" style={{ background: 'rgba(245,158,11,0.06)', backdropFilter: 'blur(12px)', border: '1px solid rgba(245,158,11,0.2)', boxShadow: '0 4px 24px rgba(245,158,11,0.08), inset 0 1px 0 rgba(245,158,11,0.1)' }}>
          <div className="flex items-center gap-2 mb-3">
            <CheckCircle size={15} style={{ color: '#f59e0b' }} />
            <h3 className="text-[13px] font-bold uppercase" style={{ color: '#f59e0b', letterSpacing: '0.04em' }}>Pending Items</h3>
          </div>
          <p className="text-[13px] whitespace-pre-wrap" style={{ color: '#cbd5e0', lineHeight: '1.65' }}>{session.pendingItems}</p>
        </div>
      )}

      {session.transcription && (
        <button
          onClick={handleRetry}
          disabled={analyzing}
          className="flex items-center gap-2 text-[11px] font-bold uppercase transition-colors disabled:opacity-50"
          style={{ color: '#E8792F', letterSpacing: '0.04em' }}
        >
          <RefreshCw size={14} className={analyzing ? 'animate-spin' : ''} />
          {analyzing ? 'Analyzing...' : 'Re-analyze with AI'}
        </button>
      )}
    </div>
  );
}
