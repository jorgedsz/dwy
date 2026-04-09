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

// WhatsApp API
export const whatsappAPI = {
  listSessions: () => api.get('/whatsapp/sessions'),
  createSession: (sessionId) => api.post('/whatsapp/sessions', { sessionId }),
  deleteSession: (sessionId) => api.delete(`/whatsapp/sessions/${sessionId}`),
  getQR: (sessionId) => api.get(`/whatsapp/sessions/${sessionId}/qr`),
  getGroups: (sessionId) => api.get(`/whatsapp/sessions/${sessionId}/groups`),
  restartSession: (sessionId) => api.post(`/whatsapp/sessions/${sessionId}/restart`),
  getDwyGroups: (sessionId) => api.get(`/whatsapp/sessions/${sessionId}/dwy-groups`),
  linkGroup: (data) => api.post('/whatsapp/link-group', data),
};

// Portal API (public, no auth interceptor)
const portalAxios = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
});

export const portalAPI = {
  getClient: (token) => portalAxios.get(`/portal/${token}`),
  getSession: (token, sessionId) => portalAxios.get(`/portal/${token}/sessions/${sessionId}`),
  generateToken: (clientId) => api.post(`/portal/generate/${clientId}`),
};

// Calendar API
export const calendarAPI = {
  getIntegrations: () => api.get('/calendar/integrations'),
  getAuthUrl: () => api.get('/calendar/auth/google'),
  getEvents: (params) => api.get('/calendar/events', { params }),
  disconnect: (id) => api.delete(`/calendar/integrations/${id}`),
};

// Twilio API
export const twilioAPI = {
  getLastCall: (clientId) => api.get(`/clients/${clientId}/twilio/last-call`),
};

// Task API
export const taskAPI = {
  toggle: (taskId) => api.patch(`/sessions/tasks/${taskId}/toggle`),
};

// Dashboard API
export const dashboardAPI = {
  getPendingTasks: () => api.get('/dashboard/pending-tasks'),
};

// Agent API
export const agentAPI = {
  list: () => api.get('/agents'),
  get: (id) => api.get(`/agents/${id}`),
  create: (data) => api.post('/agents', data),
  update: (id, data) => api.put(`/agents/${id}`, data),
  duplicate: (id) => api.post(`/agents/${id}/duplicate`),
  delete: (id) => api.delete(`/agents/${id}`),
};

// Chatbot API
export const chatbotAPI = {
  list: () => api.get('/chatbots'),
  get: (id) => api.get(`/chatbots/${id}`),
  create: (data) => api.post('/chatbots', data),
  update: (id, data) => api.put(`/chatbots/${id}`, data),
  delete: (id) => api.delete(`/chatbots/${id}`),
  getFollowUpLogs: (chatbotId) => api.get('/chatbot-follow-ups/logs', { params: { chatbotId } }),
};

// Training API
export const trainingAPI = {
  createSession: (agentId) => api.post('/training/sessions', { agentId }),
  listSessions: (agentId) => api.get('/training/sessions', { params: { agentId } }),
  getSession: (id) => api.get(`/training/sessions/${id}`),
  completeSession: (id, transcript) => api.post(`/training/sessions/${id}/complete`, { transcript }),
  acceptSession: (id) => api.post(`/training/sessions/${id}/accept`),
  rejectSession: (id) => api.post(`/training/sessions/${id}/reject`),
};

export default api;
