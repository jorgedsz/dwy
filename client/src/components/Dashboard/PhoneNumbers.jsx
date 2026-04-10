import { useState, useEffect } from 'react';
import { Phone, Plus, Trash2, Bot, RefreshCw, Loader2, AlertCircle, X } from 'lucide-react';
import { phoneNumbersAPI, telephonyAPI, agentAPI } from '../../services/api';

const PROVIDER_COLORS = {
  twilio: '#F22F46',
  vonage: '#7B61FF',
  telnyx: '#00C08B',
};

export default function PhoneNumbers() {
  const [numbers, setNumbers] = useState([]);
  const [credentials, setCredentials] = useState([]);
  const [agents, setAgents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [showImport, setShowImport] = useState(false);
  const [importCredId, setImportCredId] = useState(null);
  const [availableNumbers, setAvailableNumbers] = useState([]);
  const [loadingAvailable, setLoadingAvailable] = useState(false);
  const [importing, setImporting] = useState(null);
  const [assignModal, setAssignModal] = useState(null);
  const [error, setError] = useState(null);

  const load = async () => {
    try {
      const [numRes, credRes, agentRes] = await Promise.all([
        phoneNumbersAPI.list(),
        telephonyAPI.getCredentials(),
        agentAPI.list(),
      ]);
      setNumbers(numRes.data);
      setCredentials(credRes.data);
      setAgents(agentRes.data);
    } catch (err) {
      console.error('Failed to load:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const verifiedCreds = credentials.filter((c) => c.isVerified);

  const loadAvailable = async (credId) => {
    setLoadingAvailable(true);
    setError(null);
    try {
      const { data } = await phoneNumbersAPI.listAvailable(credId);
      setAvailableNumbers(data);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load numbers');
    } finally {
      setLoadingAvailable(false);
    }
  };

  const handleImport = async (num) => {
    setImporting(num.providerId || num.phoneNumber);
    try {
      await phoneNumbersAPI.import({
        credentialId: importCredId,
        phoneNumber: num.phoneNumber,
        friendlyName: num.friendlyName,
        providerId: num.providerId,
      });
      await load();
      // Refresh available to mark as imported
      await loadAvailable(importCredId);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to import');
    } finally {
      setImporting(null);
    }
  };

  const handleRemove = async (id) => {
    if (!confirm('Remove this phone number?')) return;
    try {
      await phoneNumbersAPI.remove(id);
      setNumbers((prev) => prev.filter((n) => n.id !== id));
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to remove');
    }
  };

  const handleAssign = async (phoneId, agentId) => {
    try {
      await phoneNumbersAPI.assign(phoneId, agentId || null);
      await load();
      setAssignModal(null);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to assign');
    }
  };

  const handleRetryVapi = async (id) => {
    try {
      await phoneNumbersAPI.retryVapi(id);
      await load();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to retry');
    }
  };

  const filtered = filter === 'all' ? numbers : numbers.filter((n) => n.provider === filter);
  const activeProviders = [...new Set(numbers.map((n) => n.provider))];

  if (loading) return <div style={{ color: '#64748b' }}>Loading phone numbers...</div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-7">
        <h1
          className="text-[28px] font-extrabold"
          style={{
            background: 'linear-gradient(135deg, #fff 30%, #E8792F 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            letterSpacing: '-0.02em',
            lineHeight: '1.2',
          }}
        >
          Phone Numbers
        </h1>
        {verifiedCreds.length > 0 && (
          <button
            onClick={() => { setShowImport(true); setImportCredId(null); setAvailableNumbers([]); }}
            className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white rounded-lg transition-colors"
            style={{ background: '#E8792F' }}
            onMouseEnter={(e) => (e.currentTarget.style.background = '#d06a28')}
            onMouseLeave={(e) => (e.currentTarget.style.background = '#E8792F')}
          >
            <Plus size={16} />
            Import Number
          </button>
        )}
      </div>

      {error && (
        <div className="mb-4 p-3 rounded-lg flex items-center gap-2 text-sm" style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: '#f87171' }}>
          <AlertCircle size={16} />
          {error}
          <button onClick={() => setError(null)} className="ml-auto"><X size={14} /></button>
        </div>
      )}

      {/* Filter tabs */}
      {activeProviders.length > 1 && (
        <div className="flex gap-2 mb-5">
          <FilterTab label="All" active={filter === 'all'} onClick={() => setFilter('all')} />
          {activeProviders.map((p) => (
            <FilterTab key={p} label={p.charAt(0).toUpperCase() + p.slice(1)} active={filter === p} onClick={() => setFilter(p)} color={PROVIDER_COLORS[p]} />
          ))}
        </div>
      )}

      {numbers.length === 0 ? (
        <div className="glass rounded-xl p-12 text-center">
          <Phone size={48} className="mx-auto mb-4" style={{ color: '#475569' }} />
          <p className="text-sm" style={{ color: '#64748b' }}>
            {verifiedCreds.length === 0
              ? 'Connect a telephony provider in Phone Setup first.'
              : 'No phone numbers imported yet. Click "Import Number" to get started.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((num) => (
            <div
              key={num.id}
              className="glass rounded-xl p-4 flex items-center justify-between group"
              style={{ border: '1px solid rgba(255,255,255,0.06)' }}
            >
              <div className="flex items-center gap-4">
                <div
                  className="w-9 h-9 rounded-lg flex items-center justify-center"
                  style={{ background: `${PROVIDER_COLORS[num.provider]}22` }}
                >
                  <Phone size={16} style={{ color: PROVIDER_COLORS[num.provider] }} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-white">{num.phoneNumber}</span>
                    <span
                      className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded"
                      style={{ background: `${PROVIDER_COLORS[num.provider]}22`, color: PROVIDER_COLORS[num.provider] }}
                    >
                      {num.provider}
                    </span>
                    {num.status === 'failed' && (
                      <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded" style={{ background: 'rgba(239,68,68,0.15)', color: '#f87171' }}>
                        VAPI Failed
                      </span>
                    )}
                  </div>
                  {num.friendlyName && num.friendlyName !== num.phoneNumber && (
                    <p className="text-xs mt-0.5" style={{ color: '#64748b' }}>{num.friendlyName}</p>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2">
                {/* Agent badge */}
                {num.agent ? (
                  <button
                    onClick={() => setAssignModal(num)}
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-colors"
                    style={{ background: 'rgba(232,121,47,0.1)', color: '#E8792F', border: '1px solid rgba(232,121,47,0.2)' }}
                  >
                    <Bot size={12} />
                    {num.agent.name}
                  </button>
                ) : (
                  <button
                    onClick={() => setAssignModal(num)}
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs transition-colors opacity-0 group-hover:opacity-100"
                    style={{ background: 'rgba(255,255,255,0.06)', color: '#64748b' }}
                  >
                    <Bot size={12} />
                    Assign Agent
                  </button>
                )}

                {num.status === 'failed' && (
                  <button
                    onClick={() => handleRetryVapi(num.id)}
                    className="p-1.5 rounded-lg transition-colors"
                    style={{ color: '#fbbf24' }}
                    title="Retry VAPI import"
                  >
                    <RefreshCw size={14} />
                  </button>
                )}

                <button
                  onClick={() => handleRemove(num.id)}
                  className="p-1.5 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                  style={{ color: '#64748b' }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = '#f87171')}
                  onMouseLeave={(e) => (e.currentTarget.style.color = '#64748b')}
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Import Modal */}
      {showImport && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="glass rounded-xl w-full max-w-lg p-5" style={{ border: '1px solid rgba(255,255,255,0.1)', maxHeight: '80vh', display: 'flex', flexDirection: 'column' }}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-semibold text-white">Import Phone Number</h3>
              <button onClick={() => setShowImport(false)} style={{ color: '#64748b' }}><X size={18} /></button>
            </div>

            {/* Provider selector */}
            <div className="mb-4">
              <label className="block text-xs font-medium mb-2" style={{ color: '#94a3b8' }}>Select Provider</label>
              <div className="flex gap-2">
                {verifiedCreds.map((cred) => (
                  <button
                    key={cred.id}
                    onClick={() => { setImportCredId(cred.id); loadAvailable(cred.id); }}
                    className="px-3 py-1.5 text-xs font-medium rounded-lg transition-colors"
                    style={{
                      background: importCredId === cred.id ? `${PROVIDER_COLORS[cred.provider]}22` : 'rgba(255,255,255,0.06)',
                      color: importCredId === cred.id ? PROVIDER_COLORS[cred.provider] : '#94a3b8',
                      border: `1px solid ${importCredId === cred.id ? `${PROVIDER_COLORS[cred.provider]}44` : 'rgba(255,255,255,0.1)'}`,
                    }}
                  >
                    {cred.provider.charAt(0).toUpperCase() + cred.provider.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            {/* Available numbers list */}
            <div className="flex-1 overflow-y-auto">
              {!importCredId && (
                <p className="text-sm text-center py-8" style={{ color: '#64748b' }}>
                  Select a provider to see available numbers.
                </p>
              )}
              {loadingAvailable && (
                <div className="flex items-center justify-center py-8">
                  <Loader2 size={20} className="animate-spin" style={{ color: '#64748b' }} />
                </div>
              )}
              {importCredId && !loadingAvailable && availableNumbers.length === 0 && (
                <p className="text-sm text-center py-8" style={{ color: '#64748b' }}>
                  No phone numbers found on this account.
                </p>
              )}
              {availableNumbers.map((num) => (
                <div
                  key={num.providerId || num.phoneNumber}
                  className="flex items-center justify-between p-3 rounded-lg mb-2"
                  style={{ background: 'rgba(255,255,255,0.03)' }}
                >
                  <div>
                    <span className="text-sm text-white font-medium">{num.phoneNumber}</span>
                    {num.friendlyName && num.friendlyName !== num.phoneNumber && (
                      <span className="text-xs ml-2" style={{ color: '#64748b' }}>{num.friendlyName}</span>
                    )}
                  </div>
                  {num.imported ? (
                    <span className="text-xs px-2 py-1 rounded" style={{ color: '#4ade80', background: 'rgba(74,222,128,0.1)' }}>
                      Imported
                    </span>
                  ) : (
                    <button
                      onClick={() => handleImport(num)}
                      disabled={importing === (num.providerId || num.phoneNumber)}
                      className="px-3 py-1 text-xs font-semibold text-white rounded-lg disabled:opacity-50"
                      style={{ background: '#E8792F' }}
                    >
                      {importing === (num.providerId || num.phoneNumber) ? 'Importing...' : 'Import'}
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Assign Agent Modal */}
      {assignModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="glass rounded-xl w-full max-w-sm p-5" style={{ border: '1px solid rgba(255,255,255,0.1)' }}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-semibold text-white">
                Assign Agent to {assignModal.phoneNumber}
              </h3>
              <button onClick={() => setAssignModal(null)} style={{ color: '#64748b' }}><X size={18} /></button>
            </div>

            <div className="space-y-2">
              {/* Unassign option */}
              <button
                onClick={() => handleAssign(assignModal.id, null)}
                className="w-full text-left p-3 rounded-lg text-sm transition-colors"
                style={{ background: !assignModal.agentId ? 'rgba(232,121,47,0.1)' : 'rgba(255,255,255,0.03)', color: '#94a3b8' }}
              >
                No agent (unassign)
              </button>
              {agents.map((agent) => (
                <button
                  key={agent.id}
                  onClick={() => handleAssign(assignModal.id, agent.id)}
                  className="w-full text-left p-3 rounded-lg text-sm transition-colors flex items-center gap-2"
                  style={{
                    background: assignModal.agentId === agent.id ? 'rgba(232,121,47,0.1)' : 'rgba(255,255,255,0.03)',
                    color: assignModal.agentId === agent.id ? '#E8792F' : '#e2e8f0',
                  }}
                >
                  <Bot size={14} />
                  {agent.name}
                </button>
              ))}
              {agents.length === 0 && (
                <p className="text-xs text-center py-4" style={{ color: '#64748b' }}>
                  No agents found. Create one first.
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function FilterTab({ label, active, onClick, color }) {
  return (
    <button
      onClick={onClick}
      className="px-3 py-1.5 text-xs font-medium rounded-lg transition-colors"
      style={{
        background: active ? (color ? `${color}22` : 'rgba(232,121,47,0.1)') : 'rgba(255,255,255,0.04)',
        color: active ? (color || '#E8792F') : '#64748b',
        border: `1px solid ${active ? (color ? `${color}33` : 'rgba(232,121,47,0.2)') : 'transparent'}`,
      }}
    >
      {label}
    </button>
  );
}
