import { useState, useEffect } from 'react';
import { Phone, Check, AlertCircle, Trash2, ChevronDown, ChevronUp, Loader2 } from 'lucide-react';
import { telephonyAPI } from '../../services/api';

const PROVIDERS = [
  {
    key: 'twilio',
    name: 'Twilio',
    color: '#F22F46',
    fields: [
      { name: 'accountSid', label: 'Account SID', type: 'text', placeholder: 'ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx' },
      { name: 'authToken', label: 'Auth Token', type: 'password', placeholder: 'Your Twilio Auth Token' },
    ],
  },
  {
    key: 'vonage',
    name: 'Vonage',
    color: '#7B61FF',
    fields: [
      { name: 'apiKey', label: 'API Key', type: 'text', placeholder: 'Your Vonage API Key' },
      { name: 'apiSecret', label: 'API Secret', type: 'password', placeholder: 'Your Vonage API Secret' },
    ],
  },
  {
    key: 'telnyx',
    name: 'Telnyx',
    color: '#00C08B',
    fields: [
      { name: 'telnyxApiKey', label: 'API Key', type: 'password', placeholder: 'KEYxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx' },
    ],
  },
];

export default function TelephonySetup() {
  const [credentials, setCredentials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(null);
  const [formData, setFormData] = useState({});
  const [saving, setSaving] = useState(null);
  const [verifying, setVerifying] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [error, setError] = useState(null);

  const load = async () => {
    try {
      const { data } = await telephonyAPI.getCredentials();
      setCredentials(data);
    } catch (err) {
      console.error('Failed to load credentials:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const getCredentialForProvider = (provider) =>
    credentials.find((c) => c.provider === provider);

  const handleSave = async (providerKey) => {
    const fields = formData[providerKey];
    if (!fields) return;
    setSaving(providerKey);
    setError(null);
    try {
      await telephonyAPI.saveCredentials({ provider: providerKey, ...fields });
      setFormData((prev) => ({ ...prev, [providerKey]: {} }));
      await load();
      setExpanded(null);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save credentials');
    } finally {
      setSaving(null);
    }
  };

  const handleVerify = async (credId, providerKey) => {
    setVerifying(providerKey);
    setError(null);
    try {
      await telephonyAPI.verifyCredentials(credId);
      await load();
    } catch (err) {
      setError(err.response?.data?.error || 'Verification failed');
    } finally {
      setVerifying(null);
    }
  };

  const handleDelete = async (credId, providerKey) => {
    if (!confirm(`Disconnect ${providerKey}? This will remove all imported phone numbers.`)) return;
    setDeleting(providerKey);
    try {
      await telephonyAPI.deleteCredentials(credId);
      await load();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to disconnect');
    } finally {
      setDeleting(null);
    }
  };

  const updateField = (providerKey, fieldName, value) => {
    setFormData((prev) => ({
      ...prev,
      [providerKey]: { ...(prev[providerKey] || {}), [fieldName]: value },
    }));
  };

  if (loading) return <div style={{ color: '#64748b' }}>Loading telephony setup...</div>;

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
          Phone Setup
        </h1>
      </div>

      <p className="text-sm mb-6" style={{ color: '#94a3b8' }}>
        Connect your telephony provider to import phone numbers and assign them to AI agents.
      </p>

      {error && (
        <div className="mb-4 p-3 rounded-lg flex items-center gap-2 text-sm" style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: '#f87171' }}>
          <AlertCircle size={16} />
          {error}
        </div>
      )}

      <div className="space-y-4">
        {PROVIDERS.map((provider) => {
          const cred = getCredentialForProvider(provider.key);
          const isExpanded = expanded === provider.key;
          const isConnected = !!cred;

          return (
            <div
              key={provider.key}
              className="glass rounded-xl overflow-hidden"
              style={{ border: `1px solid ${isConnected ? `${provider.color}33` : 'rgba(255,255,255,0.06)'}` }}
            >
              {/* Header */}
              <div
                className="flex items-center justify-between p-5 cursor-pointer"
                onClick={() => setExpanded(isExpanded ? null : provider.key)}
              >
                <div className="flex items-center gap-4">
                  <div
                    className="w-10 h-10 rounded-lg flex items-center justify-center text-sm font-bold text-white"
                    style={{ background: `${provider.color}22`, color: provider.color }}
                  >
                    <Phone size={20} />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-white">{provider.name}</h3>
                    <div className="flex items-center gap-2 mt-0.5">
                      {isConnected ? (
                        <>
                          <span className="flex items-center gap-1 text-xs" style={{ color: cred.isVerified ? '#4ade80' : '#fbbf24' }}>
                            <Check size={12} />
                            {cred.isVerified ? 'Verified' : 'Connected'}
                          </span>
                          {cred.phoneNumberCount > 0 && (
                            <span className="text-xs" style={{ color: '#64748b' }}>
                              · {cred.phoneNumberCount} number{cred.phoneNumberCount !== 1 ? 's' : ''}
                            </span>
                          )}
                          {(cred.accountSidLast4 || cred.apiKeyLast4) && (
                            <span className="text-xs" style={{ color: '#475569' }}>
                              · ****{cred.accountSidLast4 || cred.apiKeyLast4}
                            </span>
                          )}
                        </>
                      ) : (
                        <span className="text-xs" style={{ color: '#64748b' }}>Not connected</span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {isConnected && (
                    <>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleVerify(cred.id, provider.key); }}
                        disabled={verifying === provider.key}
                        className="px-3 py-1.5 text-xs font-medium rounded-lg transition-colors disabled:opacity-50"
                        style={{ background: 'rgba(255,255,255,0.06)', color: '#94a3b8' }}
                      >
                        {verifying === provider.key ? <Loader2 size={12} className="animate-spin" /> : 'Verify'}
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDelete(cred.id, provider.key); }}
                        disabled={deleting === provider.key}
                        className="p-1.5 rounded-lg transition-colors"
                        style={{ color: '#64748b' }}
                        onMouseEnter={(e) => (e.currentTarget.style.color = '#f87171')}
                        onMouseLeave={(e) => (e.currentTarget.style.color = '#64748b')}
                      >
                        {deleting === provider.key ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                      </button>
                    </>
                  )}
                  {isExpanded ? <ChevronUp size={16} style={{ color: '#64748b' }} /> : <ChevronDown size={16} style={{ color: '#64748b' }} />}
                </div>
              </div>

              {/* Expanded form */}
              {isExpanded && !isConnected && (
                <div className="px-5 pb-5" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                  <div className="pt-4 space-y-3">
                    {provider.fields.map((field) => (
                      <div key={field.name}>
                        <label className="block text-xs font-medium mb-1" style={{ color: '#94a3b8' }}>
                          {field.label}
                        </label>
                        <input
                          type={field.type}
                          placeholder={field.placeholder}
                          value={formData[provider.key]?.[field.name] || ''}
                          onChange={(e) => updateField(provider.key, field.name, e.target.value)}
                          className="w-full px-3 py-2 text-sm rounded-lg text-white"
                          style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', outline: 'none' }}
                        />
                      </div>
                    ))}
                    <div className="flex justify-end pt-2">
                      <button
                        onClick={() => handleSave(provider.key)}
                        disabled={saving === provider.key}
                        className="px-4 py-2 text-sm font-semibold text-white rounded-lg disabled:opacity-50"
                        style={{ background: provider.color }}
                      >
                        {saving === provider.key ? 'Connecting...' : `Connect ${provider.name}`}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Expanded connected state - update credentials */}
              {isExpanded && isConnected && (
                <div className="px-5 pb-5" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                  <div className="pt-4 space-y-3">
                    <p className="text-xs" style={{ color: '#64748b' }}>
                      Update your {provider.name} credentials. Leave fields blank to keep existing values.
                    </p>
                    {provider.fields.map((field) => (
                      <div key={field.name}>
                        <label className="block text-xs font-medium mb-1" style={{ color: '#94a3b8' }}>
                          {field.label}
                        </label>
                        <input
                          type={field.type}
                          placeholder="Leave blank to keep current"
                          value={formData[provider.key]?.[field.name] || ''}
                          onChange={(e) => updateField(provider.key, field.name, e.target.value)}
                          className="w-full px-3 py-2 text-sm rounded-lg text-white"
                          style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', outline: 'none' }}
                        />
                      </div>
                    ))}
                    <div className="flex justify-end pt-2">
                      <button
                        onClick={async () => {
                          const fields = formData[provider.key];
                          if (!fields || Object.values(fields).every((v) => !v)) return;
                          setSaving(provider.key);
                          setError(null);
                          try {
                            await telephonyAPI.updateCredentials(cred.id, fields);
                            setFormData((prev) => ({ ...prev, [provider.key]: {} }));
                            await load();
                          } catch (err) {
                            setError(err.response?.data?.error || 'Failed to update');
                          } finally {
                            setSaving(null);
                          }
                        }}
                        disabled={saving === provider.key}
                        className="px-4 py-2 text-sm font-semibold text-white rounded-lg disabled:opacity-50"
                        style={{ background: provider.color }}
                      >
                        {saving === provider.key ? 'Updating...' : 'Update Credentials'}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
