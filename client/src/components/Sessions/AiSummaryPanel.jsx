import { useState } from 'react';
import { Sparkles, RefreshCw, CheckCircle } from 'lucide-react';
import api from '../../services/api';

export default function AiSummaryPanel({ session, onUpdate }) {
  const [analyzing, setAnalyzing] = useState(false);

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
      <div className="bg-gray-50 rounded-xl border border-gray-200 p-6 text-center text-gray-400">
        <Sparkles size={24} className="mx-auto mb-2 opacity-40" />
        <p className="text-sm">Add a transcription to generate an AI summary</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {session.aiSummary && (
        <div className="bg-blue-50 rounded-xl border border-blue-200 p-5">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles size={18} className="text-blue-600" />
            <h3 className="font-semibold text-blue-900">AI Summary</h3>
          </div>
          <p className="text-sm text-blue-800 whitespace-pre-wrap">{session.aiSummary}</p>
        </div>
      )}

      {session.pendingItems && (
        <div className="bg-amber-50 rounded-xl border border-amber-200 p-5">
          <div className="flex items-center gap-2 mb-3">
            <CheckCircle size={18} className="text-amber-600" />
            <h3 className="font-semibold text-amber-900">Pending Items</h3>
          </div>
          <p className="text-sm text-amber-800 whitespace-pre-wrap">{session.pendingItems}</p>
        </div>
      )}

      {session.transcription && (
        <button
          onClick={handleReanalyze}
          disabled={analyzing}
          className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800 disabled:opacity-50"
        >
          <RefreshCw size={16} className={analyzing ? 'animate-spin' : ''} />
          {analyzing ? 'Analyzing...' : 'Re-analyze with AI'}
        </button>
      )}
    </div>
  );
}
