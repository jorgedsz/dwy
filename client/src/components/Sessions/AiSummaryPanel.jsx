import { useState, useEffect, useRef } from 'react';
import { Sparkles, RefreshCw, CheckCircle, Loader, AlertCircle, Square, CheckSquare } from 'lucide-react';
import api, { taskAPI } from '../../services/api';

export default function AiSummaryPanel({ session, onUpdate }) {
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState(null);
  const triggeredRef = useRef(false);

  // Auto-trigger analysis when transcription exists but no AI summary yet
  useEffect(() => {
    if (session.transcription && !session.aiSummary && !triggeredRef.current) {
      triggeredRef.current = true;
      runAnalysis();
    }
  }, [session.id, session.transcription, session.aiSummary]);

  const runAnalysis = async () => {
    setAnalyzing(true);
    setError(null);
    try {
      await api.post(`/sessions/${session.id}/analyze`, {}, { timeout: 60000 });
      // Refetch session to get updated pendingTasks
      const refreshed = await api.get(`/sessions/${session.id}`);
      onUpdate({ aiSummary: refreshed.data.aiSummary, pendingItems: refreshed.data.pendingItems, pendingTasks: refreshed.data.pendingTasks });
    } catch (err) {
      console.error('Analyze error:', err);
      const msg = err.response?.data?.error || err.message || 'Analysis failed';
      setError(msg);
    } finally {
      setAnalyzing(false);
    }
  };

  const handleRetry = () => {
    triggeredRef.current = false;
    runAnalysis();
  };

  const handleToggleTask = async (taskId) => {
    // Optimistic update
    const updatedTasks = session.pendingTasks.map(t =>
      t.id === taskId ? { ...t, completed: !t.completed, completedAt: t.completed ? null : new Date().toISOString() } : t
    );
    onUpdate({ pendingTasks: updatedTasks });

    try {
      await taskAPI.toggle(taskId);
    } catch (err) {
      console.error('Toggle task error:', err);
      // Revert on failure
      onUpdate({ pendingTasks: session.pendingTasks });
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

      {(session.pendingTasks?.length > 0 || session.pendingItems) && (
        <div className="rounded-xl p-5" style={{ background: 'rgba(245,158,11,0.06)', backdropFilter: 'blur(12px)', border: '1px solid rgba(245,158,11,0.2)', boxShadow: '0 4px 24px rgba(245,158,11,0.08), inset 0 1px 0 rgba(245,158,11,0.1)' }}>
          <div className="flex items-center gap-2 mb-3">
            <CheckCircle size={15} style={{ color: '#f59e0b' }} />
            <h3 className="text-[13px] font-bold uppercase" style={{ color: '#f59e0b', letterSpacing: '0.04em' }}>Pending Items</h3>
          </div>
          {session.pendingTasks?.length > 0 ? (
            <div className="space-y-2">
              {session.pendingTasks.map(task => (
                <button
                  key={task.id}
                  onClick={() => handleToggleTask(task.id)}
                  className="flex items-start gap-2.5 w-full text-left group"
                >
                  {task.completed ? (
                    <CheckSquare size={16} className="mt-0.5 flex-shrink-0" style={{ color: '#4ade80' }} />
                  ) : (
                    <Square size={16} className="mt-0.5 flex-shrink-0 opacity-50 group-hover:opacity-100 transition-opacity" style={{ color: '#f59e0b' }} />
                  )}
                  <span
                    className="text-[13px]"
                    style={{
                      color: task.completed ? '#64748b' : '#cbd5e0',
                      textDecoration: task.completed ? 'line-through' : 'none',
                      lineHeight: '1.65',
                    }}
                  >
                    {task.text}
                    {task.completed && task.completedAt && (
                      <span className="text-[11px] ml-2" style={{ color: '#4ade80' }}>
                        {new Date(task.completedAt).toLocaleDateString()}
                      </span>
                    )}
                  </span>
                </button>
              ))}
            </div>
          ) : (
            <p className="text-[13px] whitespace-pre-wrap" style={{ color: '#cbd5e0', lineHeight: '1.65' }}>{session.pendingItems}</p>
          )}
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
