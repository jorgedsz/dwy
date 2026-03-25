import { useState, useEffect, useCallback } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Smartphone, Plus, Trash2, RefreshCw, Wifi, WifiOff, QrCode, Link2, Check, Users } from 'lucide-react';
import { whatsappAPI } from '../../services/api';
import api from '../../services/api';
import socket from '../../socket';

export default function WhatsAppPage() {
  const [sessions, setSessions] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [qr, setQr] = useState(null);
  const [status, setStatus] = useState(null);
  const [newName, setNewName] = useState('');
  const [creating, setCreating] = useState(false);
  const [restarting, setRestarting] = useState(false);

  // DWY groups state
  const [dwyGroups, setDwyGroups] = useState([]);
  const [loadingDwy, setLoadingDwy] = useState(false);
  const [clients, setClients] = useState([]);
  const [linkingGroup, setLinkingGroup] = useState(null);

  const fetchSessions = useCallback(async () => {
    try {
      const { data } = await whatsappAPI.listSessions();
      setSessions(data.sessions);
    } catch (err) {
      console.error('Failed to fetch sessions:', err);
    }
  }, []);

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  // Fetch clients for the dropdown
  useEffect(() => {
    api.get('/clients').then(res => {
      setClients(Array.isArray(res.data) ? res.data : []);
    }).catch(() => {});
  }, []);

  // Socket.IO listeners
  useEffect(() => {
    function onQr({ sessionId, qr: qrCode }) {
      if (sessionId === selectedId) {
        setQr(qrCode);
        setStatus('qr');
      }
    }
    function onReady({ sessionId }) {
      if (sessionId === selectedId) {
        setQr(null);
        setStatus('ready');
      }
      setSessions(prev => prev.map(s => s.sessionId === sessionId ? { ...s, status: 'ready' } : s));
    }
    function onAuthenticated({ sessionId }) {
      if (sessionId === selectedId) setStatus('authenticated');
    }
    function onAuthFailure({ sessionId }) {
      if (sessionId === selectedId) setStatus('auth_failure');
    }
    function onDisconnected({ sessionId }) {
      setSessions(prev => prev.filter(s => s.sessionId !== sessionId));
      if (sessionId === selectedId) {
        setStatus('disconnected');
        setSelectedId(null);
        setQr(null);
      }
    }

    socket.on('whatsapp:qr', onQr);
    socket.on('whatsapp:ready', onReady);
    socket.on('whatsapp:authenticated', onAuthenticated);
    socket.on('whatsapp:auth_failure', onAuthFailure);
    socket.on('whatsapp:disconnected', onDisconnected);

    return () => {
      socket.off('whatsapp:qr', onQr);
      socket.off('whatsapp:ready', onReady);
      socket.off('whatsapp:authenticated', onAuthenticated);
      socket.off('whatsapp:auth_failure', onAuthFailure);
      socket.off('whatsapp:disconnected', onDisconnected);
    };
  }, [selectedId]);

  // Auto-fetch DWY groups when session becomes ready
  useEffect(() => {
    if (status === 'ready' && selectedId) {
      fetchDwyGroups();
    }
  }, [status, selectedId]);

  const fetchDwyGroups = async () => {
    if (!selectedId) return;
    setLoadingDwy(true);
    try {
      const { data } = await whatsappAPI.getDwyGroups(selectedId);
      setDwyGroups(data.groups || []);
    } catch (err) {
      console.error('Failed to fetch DWY groups:', err);
    } finally {
      setLoadingDwy(false);
    }
  };

  const handleLinkGroup = async (group, clientId) => {
    setLinkingGroup(group.id);
    try {
      const { data } = await whatsappAPI.linkGroup({
        whatsappChatId: group.id,
        groupName: group.name,
        clientId: clientId ? parseInt(clientId) : null
      });
      setDwyGroups(prev => prev.map(g =>
        g.id === group.id
          ? {
              ...g,
              projectId: data.project.id,
              clientId: data.project.clientId,
              clientName: data.project.client?.name || data.project.client?.email || null
            }
          : g
      ));
    } catch (err) {
      console.error('Failed to link group:', err);
    } finally {
      setLinkingGroup(null);
    }
  };

  const handleCreate = async () => {
    if (creating) return;
    setCreating(true);
    try {
      const { data } = await whatsappAPI.createSession(newName.trim() || undefined);
      setSelectedId(data.sessionId);
      setStatus(data.status);
      setQr(null);
      setNewName('');
      await fetchSessions();
    } catch (err) {
      console.error('Failed to create session:', err);
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (sessionId) => {
    try {
      await whatsappAPI.deleteSession(sessionId);
      if (selectedId === sessionId) {
        setSelectedId(null);
        setStatus(null);
        setQr(null);
        setDwyGroups([]);
      }
      await fetchSessions();
    } catch (err) {
      console.error('Failed to delete session:', err);
    }
  };

  const handleSelect = async (sessionId) => {
    setSelectedId(sessionId);
    setQr(null);
    setDwyGroups([]);
    const entry = sessions.find(s => s.sessionId === sessionId);
    setStatus(entry?.status || null);
    if (entry?.status === 'ready') {
      // Will auto-fetch DWY groups via useEffect
    } else if (entry?.status !== 'ready') {
      try {
        const { data } = await whatsappAPI.getQR(sessionId);
        setQr(data.qr);
        setStatus(data.status);
      } catch (_) { /* not found */ }
    }
  };

  const handleRestart = async () => {
    if (!selectedId || restarting) return;
    setRestarting(true);
    try {
      const { data } = await whatsappAPI.restartSession(selectedId);
      setStatus(data.status);
      setQr(null);
      await fetchSessions();
    } catch (err) {
      console.error('Failed to restart session:', err);
    } finally {
      setRestarting(false);
    }
  };

  const statusColor = (s) => {
    if (s === 'ready') return '#4ade80';
    if (s === 'qr' || s === 'authenticated') return '#facc15';
    if (s === 'auth_failure') return '#f87171';
    return '#64748b';
  };

  const statusLabel = (s) => {
    if (s === 'ready') return 'Connected';
    if (s === 'qr') return 'Scan QR';
    if (s === 'authenticated') return 'Authenticating...';
    if (s === 'auth_failure') return 'Auth Failed';
    if (s === 'disconnected') return 'Disconnected';
    if (s === 'initializing') return 'Initializing...';
    return s || 'Unknown';
  };

  return (
    <div>
      <h1
        className="text-[28px] font-extrabold mb-7"
        style={{
          background: 'linear-gradient(135deg, #fff 30%, #E8792F 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          letterSpacing: '-0.02em',
          lineHeight: '1.2',
        }}
      >
        WhatsApp
      </h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Left: Sessions list */}
        <div className="lg:col-span-1 space-y-4">
          {/* Add session card */}
          <div className="glass rounded-xl p-5">
            <h2 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
              <Plus size={15} style={{ color: '#E8792F' }} />
              Add Phone
            </h2>
            <div className="flex gap-2">
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
                placeholder="Session name (optional)"
                className="flex-1 px-3 py-2 rounded-lg text-sm text-white placeholder-gray-500 outline-none"
                style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}
              />
              <button
                onClick={handleCreate}
                disabled={creating}
                className="px-4 py-2 rounded-lg text-sm font-semibold text-white transition-all disabled:opacity-50"
                style={{ background: 'linear-gradient(135deg, #E8792F, #d4621a)' }}
              >
                {creating ? '...' : 'Connect'}
              </button>
            </div>
          </div>

          {/* Sessions */}
          {sessions.length > 0 && (
            <div className="glass rounded-xl p-4">
              <h2 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                <Smartphone size={15} style={{ color: '#E8792F' }} />
                Sessions
              </h2>
              <div className="space-y-2">
                {sessions.map((s) => (
                  <div
                    key={s.sessionId}
                    onClick={() => handleSelect(s.sessionId)}
                    className="flex items-center justify-between p-3 rounded-lg cursor-pointer transition-all"
                    style={{
                      background: selectedId === s.sessionId ? 'rgba(232,121,47,0.10)' : 'rgba(255,255,255,0.03)',
                      border: selectedId === s.sessionId ? '1px solid rgba(232,121,47,0.25)' : '1px solid rgba(255,255,255,0.06)',
                    }}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                        style={{ background: statusColor(s.status) }}
                      />
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-white truncate">{s.sessionId}</p>
                        <p className="text-[11px] capitalize" style={{ color: statusColor(s.status) }}>
                          {statusLabel(s.status)}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDelete(s.sessionId); }}
                      className="p-1.5 rounded-md transition-colors hover:bg-red-500/20"
                      style={{ color: '#64748b' }}
                      onMouseEnter={(e) => e.currentTarget.style.color = '#f87171'}
                      onMouseLeave={(e) => e.currentTarget.style.color = '#64748b'}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right: QR / Status / DWY Groups area */}
        <div className="lg:col-span-2 space-y-5">
          {!selectedId && (
            <div className="glass rounded-xl p-12 text-center">
              <QrCode size={48} className="mx-auto mb-4" style={{ color: '#334155' }} />
              <p className="text-sm" style={{ color: '#64748b' }}>
                Select a session or add a new phone to get started.
              </p>
            </div>
          )}

          {selectedId && status === 'initializing' && (
            <div className="glass rounded-xl p-12 text-center">
              <div className="animate-spin rounded-full h-10 w-10 mx-auto mb-4" style={{ border: '3px solid rgba(232,121,47,0.2)', borderTopColor: '#E8792F' }} />
              <p className="text-sm text-white">Initializing session...</p>
              <p className="text-xs mt-1" style={{ color: '#64748b' }}>This may take a moment</p>
            </div>
          )}

          {selectedId && status === 'qr' && qr && (
            <div className="glass rounded-xl p-8 text-center">
              <h2 className="text-lg font-bold text-white mb-2">Scan QR Code</h2>
              <p className="text-sm mb-6" style={{ color: '#64748b' }}>
                Open WhatsApp on your phone &rarr; Linked Devices &rarr; Link a Device
              </p>
              <div className="inline-block bg-white p-4 rounded-xl shadow-lg">
                <QRCodeSVG value={qr} size={260} />
              </div>
              <div className="mt-5 flex items-center justify-center gap-3">
                <p className="text-xs font-mono" style={{ color: '#475569' }}>{selectedId}</p>
                <button
                  onClick={handleRestart}
                  disabled={restarting}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all disabled:opacity-50"
                  style={{ background: 'rgba(232,121,47,0.12)', color: '#E8792F', border: '1px solid rgba(232,121,47,0.2)' }}
                >
                  <RefreshCw size={12} className={restarting ? 'animate-spin' : ''} />
                  {restarting ? 'Refreshing...' : 'Refresh QR'}
                </button>
              </div>
            </div>
          )}

          {selectedId && status === 'authenticated' && (
            <div className="glass rounded-xl p-12 text-center">
              <div className="animate-spin rounded-full h-10 w-10 mx-auto mb-4" style={{ border: '3px solid rgba(74,222,128,0.2)', borderTopColor: '#4ade80' }} />
              <p className="text-sm text-white">Authenticated! Connecting...</p>
            </div>
          )}

          {selectedId && status === 'ready' && (
            <>
              {/* Connected status */}
              <div className="glass rounded-xl p-8 text-center">
                <div
                  className="w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center"
                  style={{ background: 'rgba(74,222,128,0.12)', border: '1px solid rgba(74,222,128,0.25)' }}
                >
                  <Wifi size={28} style={{ color: '#4ade80' }} />
                </div>
                <p className="text-lg font-bold text-white mb-1">Connected</p>
                <p className="text-sm" style={{ color: '#64748b' }}>
                  WhatsApp session <span className="font-mono text-xs text-white/70">{selectedId}</span> is active and ready.
                </p>
              </div>

              {/* DWY Groups */}
              <div className="glass rounded-xl p-5">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="text-sm font-semibold text-white flex items-center gap-2">
                      <Users size={15} style={{ color: '#E8792F' }} />
                      DWY Groups
                    </h2>
                    <p className="text-[11px] mt-0.5" style={{ color: '#64748b' }}>
                      Groups containing "DWY" in their name. Link each to a client.
                    </p>
                  </div>
                  <button
                    onClick={fetchDwyGroups}
                    disabled={loadingDwy}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all disabled:opacity-50"
                    style={{ background: 'rgba(232,121,47,0.12)', color: '#E8792F', border: '1px solid rgba(232,121,47,0.2)' }}
                  >
                    <RefreshCw size={12} className={loadingDwy ? 'animate-spin' : ''} />
                    {loadingDwy ? 'Loading...' : 'Refresh'}
                  </button>
                </div>

                {loadingDwy ? (
                  <div className="flex justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8" style={{ border: '3px solid rgba(232,121,47,0.2)', borderTopColor: '#E8792F' }} />
                  </div>
                ) : dwyGroups.length === 0 ? (
                  <div className="py-8 text-center">
                    <p className="text-sm" style={{ color: '#475569' }}>No DWY groups found</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {dwyGroups.map((g) => (
                      <div
                        key={g.id}
                        className="flex items-center gap-3 p-3 rounded-lg transition-all"
                        style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
                      >
                        {/* Group avatar */}
                        <div
                          className="w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold flex-shrink-0"
                          style={{ background: 'linear-gradient(135deg, #25D366, #128C7E)', color: '#fff' }}
                        >
                          {(g.name || 'D')[0].toUpperCase()}
                        </div>

                        {/* Group info */}
                        <div className="flex-1 min-w-0">
                          <p className="text-[13px] font-semibold text-white truncate">{g.name}</p>
                          <p className="text-[11px]" style={{ color: '#64748b' }}>{g.participantCount} participants</p>
                        </div>

                        {/* Link status badge */}
                        <div className="flex items-center gap-2 flex-shrink-0">
                          {g.clientId ? (
                            <span
                              className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-semibold"
                              style={{ background: 'rgba(74,222,128,0.12)', color: '#4ade80', border: '1px solid rgba(74,222,128,0.2)' }}
                            >
                              <Check size={12} />
                              {g.clientName}
                            </span>
                          ) : (
                            <span
                              className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-semibold"
                              style={{ background: 'rgba(255,255,255,0.04)', color: '#64748b', border: '1px solid rgba(255,255,255,0.08)' }}
                            >
                              <Link2 size={12} />
                              Unlinked
                            </span>
                          )}

                          {/* Client dropdown */}
                          <select
                            value={g.clientId || ''}
                            onChange={(e) => handleLinkGroup(g, e.target.value)}
                            disabled={linkingGroup === g.id}
                            className="px-2 py-1.5 rounded-lg text-[11px] font-medium text-white outline-none disabled:opacity-50 cursor-pointer"
                            style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', minWidth: '140px' }}
                          >
                            <option value="">-- Select Client --</option>
                            {clients.map(c => (
                              <option key={c.id} value={c.id}>
                                {c.name || c.email}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}

          {selectedId && status === 'auth_failure' && (
            <div className="glass rounded-xl p-12 text-center" style={{ borderColor: 'rgba(248,113,113,0.2)' }}>
              <div
                className="w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center"
                style={{ background: 'rgba(248,113,113,0.12)', border: '1px solid rgba(248,113,113,0.25)' }}
              >
                <WifiOff size={28} style={{ color: '#f87171' }} />
              </div>
              <p className="text-lg font-bold text-white mb-1">Authentication Failed</p>
              <p className="text-sm mb-5" style={{ color: '#64748b' }}>
                The QR code expired or was rejected. Try again.
              </p>
              <div className="flex items-center justify-center gap-3">
                <button
                  onClick={handleRestart}
                  disabled={restarting}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium text-white transition-all disabled:opacity-50"
                  style={{ background: 'linear-gradient(135deg, #E8792F, #d4621a)' }}
                >
                  <RefreshCw size={14} className={restarting ? 'animate-spin' : ''} />
                  {restarting ? 'Refreshing...' : 'Retry'}
                </button>
                <button
                  onClick={() => handleDelete(selectedId)}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all"
                  style={{ background: 'rgba(248,113,113,0.12)', color: '#f87171', border: '1px solid rgba(248,113,113,0.2)' }}
                >
                  <Trash2 size={14} />
                  Remove
                </button>
              </div>
            </div>
          )}

          {selectedId && status === 'disconnected' && (
            <div className="glass rounded-xl p-12 text-center" style={{ borderColor: 'rgba(250,204,21,0.2)' }}>
              <div
                className="w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center"
                style={{ background: 'rgba(250,204,21,0.12)', border: '1px solid rgba(250,204,21,0.25)' }}
              >
                <WifiOff size={28} style={{ color: '#facc15' }} />
              </div>
              <p className="text-lg font-bold text-white mb-1">Disconnected</p>
              <p className="text-sm mb-5" style={{ color: '#64748b' }}>
                This session has been disconnected.
              </p>
              <button
                onClick={handleCreate}
                disabled={creating}
                className="px-4 py-2 rounded-lg text-sm font-medium text-white transition-all disabled:opacity-50"
                style={{ background: 'linear-gradient(135deg, #E8792F, #d4621a)' }}
              >
                {creating ? 'Reconnecting...' : 'Reconnect'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
