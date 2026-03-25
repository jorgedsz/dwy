import { useState, useEffect, useRef } from 'react';
import { Sparkles, RefreshCw, CheckCircle, Loader } from 'lucide-react';
import api from '../../services/api';

export default function AiSummaryPanel({ session, onUpdate }) {
  const [analyzing, setAnalyzing] = useState(false);
  const pollRef = useRef(null);

  // Auto-poll when transcription exists but no AI summary yet
  useEffect(() => {
    if (session.transcription && !session.aiSummary) {
      const poll = async () => {
        try {
          const res = await api.get(`/sessions/${session.id}`);
          if (res.data.aiSummary) {
            onUpdate({ aiSummary: res.data.aiSummary, pendingItems: res.data.pendingItems });
            clearInterval(pollRef.current);
            pollRef.current = null;
          }
        } catch (err) {
          // ignore polling errors
        }
      };

      pollRef.current = setInterval(poll, 3000);
      return () => {
        if (pollRef.current) clearInterval(pollRef.current);
      };
    }
  }, [session.id, session.transcription, session.aiSummary]);

  const handleReanalyze = async () => {
    setAnalyzing(true);
    try {
      const res = await api.post(`/sessions/${session.id}/analyze`);
      onUpdate({ aiSummary: res.data.summary, pendingItems: res.data.pendingItems });
    } catch (err) {
      console.error('Analyze error:', err);
    } finally {
      setAnalyzing(false);
    }
  };

  if (!session.transcription && !session.aiSummary) {
    return (
      <div className="glass rounded-xl p-8 text-center">
        <Sparkles size={24} className="mx-auto mb-3 opacity-30" style={{ color: '#E8792F' }} />
        <p className="text-xs" style={{ color: '#475569' }}>Add a transcription to generate an AI summary</p>
      </div>
    );
  }

  // Transcription exists but AI hasn't finished yet — show generating state
  if (session.transcription && !session.aiSummary) {
    return (
      <div className="glass rounded-xl p-8 text-center">
        <Loader size={24} className="mx-auto mb-3 animate-spin" style={{ color: '#E8792F' }} />
        <p className="text-xs font-semibold" style={{ color: '#E8792F' }}>Generating AI analysis...</p>
        <p className="text-[11px] mt-1" style={{ color: '#475569' }}>This may take a few seconds</p>
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
          onClick={handleReanalyze}
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
