import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

// WA Projects API
export const waProjectsAPI = {
  list: (params) => api.get('/wa-projects', { params }),
  getStats: () => api.get('/wa-projects/stats'),
  get: (id) => api.get(`/wa-projects/${id}`),
  update: (id, data) => api.put(`/wa-projects/${id}`, data),
  getMessages: (id, params) => api.get(`/wa-projects/${id}/messages`, { params }),
  getAlerts: (id) => api.get(`/wa-projects/${id}/alerts`),
  chat: async (id, messages, onChunk, onDone, onError) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/wa-projects/${id}/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ messages })
      });
      if (!response.ok) {
        const err = await response.json().catch(() => ({ error: 'Request failed' }));
        onError(err.error || 'Request failed');
        return;
      }
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';
        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || !trimmed.startsWith('data: ')) continue;
          const data = trimmed.slice(6);
          if (data === '[DONE]') { onDone(); return; }
          try {
            const parsed = JSON.parse(data);
            if (parsed.error) { onError(parsed.error); return; }
            if (parsed.content) onChunk(parsed.content);
          } catch { /* skip */ }
        }
      }
      onDone();
    } catch (err) {
      onError(err.message || 'Network error');
    }
  }
};

// WA Alerts API
export const waAlertsAPI = {
  list: () => api.get('/wa-alerts'),
  resolve: (id) => api.patch(`/wa-alerts/${id}/resolve`),
  resolveAllForProject: (projectId) => api.patch(`/wa-alerts/project/${projectId}/resolve-all`)
};

// WA Bot Config API
export const waBotConfigAPI = {
  get: () => api.get('/wa-bot-config'),
  update: (data) => api.put('/wa-bot-config', data)
};

// WhatsApp API
export const whatsappAPI = {
  listSessions: () => api.get('/whatsapp/sessions'),
  createSession: (sessionId) => api.post('/whatsapp/sessions', { sessionId }),
  deleteSession: (sessionId) => api.delete(`/whatsapp/sessions/${sessionId}`),
  getQR: (sessionId) => api.get(`/whatsapp/sessions/${sessionId}/qr`),
  getGroups: (sessionId) => api.get(`/whatsapp/sessions/${sessionId}/groups`),
  restartSession: (sessionId) => api.post(`/whatsapp/sessions/${sessionId}/restart`),
};

export default api;
