const express = require('express');
const http = require('http');
const cors = require('cors');
const path = require('path');
const { PrismaClient } = require('@prisma/client');
const { Server: SocketIOServer } = require('socket.io');
const { Client: WAClient, LocalAuth } = require('whatsapp-web.js');
require('dotenv').config();

const authRoutes = require('./routes/auth');
const clientRoutes = require('./routes/clients');
const sessionRoutes = require('./routes/sessions');
const portalRoutes = require('./routes/portal');
const calendarRoutes = require('./routes/calendar');
const dashboardRoutes = require('./routes/dashboard');
const agentRoutes = require('./routes/agents');
const trainingRoutes = require('./routes/training');
const authMiddleware = require('./middleware/authMiddleware');

const app = express();
const server = http.createServer(app);
const prisma = new PrismaClient();

// Socket.IO
const io = new SocketIOServer(server, {
  cors: { origin: '*', credentials: true }
});

// ── WhatsApp session store ─────────────────────────────────
const waSessions = new Map();

function createWhatsAppClient(sessionId, userId) {
  if (waSessions.has(sessionId)) return waSessions.get(sessionId);

  const entry = { client: null, status: 'initializing', qr: null, userId: userId || null };
  waSessions.set(sessionId, entry);

  const puppeteerOpts = {
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu', '--disable-dev-shm-usage'],
  };
  if (process.env.PUPPETEER_EXECUTABLE_PATH) {
    puppeteerOpts.executablePath = process.env.PUPPETEER_EXECUTABLE_PATH;
  }

  const client = new WAClient({
    authStrategy: new LocalAuth({ clientId: sessionId }),
    puppeteer: puppeteerOpts,
  });

  entry.client = client;

  client.on('qr', (qr) => {
    entry.qr = qr;
    entry.status = 'qr';
    io.emit('whatsapp:qr', { sessionId, qr });
  });

  client.on('ready', () => {
    entry.status = 'ready';
    entry.qr = null;
    io.emit('whatsapp:ready', { sessionId });
    console.log(`[WA] Session ${sessionId} ready`);
  });

  client.on('authenticated', () => {
    entry.status = 'authenticated';
    io.emit('whatsapp:authenticated', { sessionId });
  });

  client.on('auth_failure', () => {
    entry.status = 'auth_failure';
    io.emit('whatsapp:auth_failure', { sessionId });
  });

  client.on('disconnected', (reason) => {
    entry.status = 'disconnected';
    io.emit('whatsapp:disconnected', { sessionId, reason });
    waSessions.delete(sessionId);
  });

  // Forward every message and process through bot
  client.on('message_create', async (msg) => {
    if (!msg.from.endsWith('@g.us') && !msg.to?.endsWith('@g.us')) return;
    const groupId = msg.from.endsWith('@g.us') ? msg.from : msg.to;
    io.emit('whatsapp:message', {
      sessionId,
      groupId,
      message: {
        id: msg.id._serialized,
        body: msg.body,
        from: msg.from,
        fromMe: msg.fromMe,
        timestamp: msg.timestamp,
        author: msg.author || null
      }
    });

    // Process through bot service
    if (entry.userId) {
      const { handleBotMessage } = require('./services/whatsappBotService');
      await handleBotMessage(prisma, io, entry.userId, sessionId, msg);
    }
  });

  client.initialize();
  return entry;
}

app.use(cors());
app.use(express.json({ limit: '5mb' }));

// Make prisma available in routes
app.use((req, res, next) => {
  req.prisma = prisma;
  next();
});

// Diagnostic: test OpenAI connection (no auth required)
app.get('/api/test-ai', async (req, res) => {
  try {
    const key = process.env.OPENAI_API_KEY;
    if (!key) return res.json({ ok: false, error: 'OPENAI_API_KEY not set' });
    res.json({ ok: true, keyPrefix: key.substring(0, 8) + '...', keyLength: key.length });
  } catch (err) {
    res.json({ ok: false, error: err.message });
  }
});

app.get('/api/test-ai-call', async (req, res) => {
  try {
    const OpenAI = require('openai');
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: 'Reply with just: ok' }],
      max_tokens: 5,
    });
    res.json({ ok: true, reply: response.choices[0].message.content });
  } catch (err) {
    res.json({ ok: false, error: err.message, type: err.constructor.name });
  }
});

// Test full analyze flow with JSON response_format
app.get('/api/test-ai-json', async (req, res) => {
  try {
    const OpenAI = require('openai');
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      response_format: { type: 'json_object' },
      messages: [{ role: 'user', content: 'Analyze this call transcript: "Hi, we discussed pricing for the premium plan. Client agreed to $500/month." Return JSON with "summary" and "pendingItems" keys.' }],
      temperature: 0.3,
    });
    const result = JSON.parse(response.choices[0].message.content);
    res.json({ ok: true, result });
  } catch (err) {
    res.json({ ok: false, error: err.message, type: err.constructor.name, stack: err.stack?.split('\n').slice(0, 3) });
  }
});

// Test full analyze flow on a real session (no auth, for debugging)
app.get('/api/test-analyze/:id', async (req, res) => {
  try {
    const sessionId = parseInt(req.params.id);
    console.log(`[TEST] Starting analyze for session ${sessionId}`);

    const session = await prisma.session.findUnique({
      where: { id: sessionId },
      include: { client: true },
    });

    if (!session) return res.json({ ok: false, error: 'Session not found' });
    if (!session.transcription) return res.json({ ok: false, error: 'No transcription' });

    console.log(`[TEST] Session found. Client: ${session.client?.name}, transcription: "${session.transcription.substring(0, 50)}..."`);

    const OpenAI = require('openai');
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    const prompt = `Analyze this ${session.type} for client "${session.client.name}". Transcription: "${session.transcription}". Return JSON with "summary" and "pendingItems" keys. Respond in the same language as the transcription.`;

    console.log(`[TEST] Calling OpenAI...`);
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      response_format: { type: 'json_object' },
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.3,
    });

    const result = JSON.parse(response.choices[0].message.content);
    console.log(`[TEST] OpenAI responded, saving to DB...`);

    await prisma.session.update({
      where: { id: sessionId },
      data: { aiSummary: result.summary, pendingItems: result.pendingItems },
    });

    console.log(`[TEST] Done!`);
    res.json({ ok: true, result });
  } catch (err) {
    console.error(`[TEST] Error:`, err);
    res.json({ ok: false, error: err.message, type: err.constructor.name });
  }
});

app.use('/api/auth', authRoutes);
app.use('/api/clients', clientRoutes);
app.use('/api/sessions', sessionRoutes);
app.use('/api/portal', portalRoutes);
app.use('/api/calendar', calendarRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/agents', agentRoutes);
app.use('/api/training', trainingRoutes);

// ── WhatsApp API endpoints ─────────────────────────────────
app.post('/api/whatsapp/sessions', authMiddleware, (req, res) => {
  const raw = req.body.sessionId || `wa-${req.user.id}-${Date.now()}`;
  // LocalAuth only allows alphanumeric, underscores and hyphens
  const sessionId = raw.replace(/[^a-zA-Z0-9_-]/g, '');
  if (!sessionId) return res.status(400).json({ error: 'Invalid session name' });
  const entry = createWhatsAppClient(sessionId, req.user.id);
  res.json({ sessionId, status: entry.status });
});

app.get('/api/whatsapp/sessions', authMiddleware, (req, res) => {
  const sessions = [];
  for (const [id, entry] of waSessions) {
    sessions.push({ sessionId: id, status: entry.status });
  }
  res.json({ sessions });
});

app.get('/api/whatsapp/sessions/:sessionId/qr', authMiddleware, (req, res) => {
  const entry = waSessions.get(req.params.sessionId);
  if (!entry) return res.status(404).json({ error: 'Session not found' });
  res.json({ qr: entry.qr, status: entry.status });
});

// Restart a session (destroy + recreate for fresh QR)
app.post('/api/whatsapp/sessions/:sessionId/restart', authMiddleware, async (req, res) => {
  const { sessionId } = req.params;
  const entry = waSessions.get(sessionId);
  if (entry) {
    try { await entry.client.destroy(); } catch (_) { /* ignore */ }
    waSessions.delete(sessionId);
  }
  const newEntry = createWhatsAppClient(sessionId, req.user.id);
  res.json({ sessionId, status: newEntry.status });
});

app.delete('/api/whatsapp/sessions/:sessionId', authMiddleware, async (req, res) => {
  const entry = waSessions.get(req.params.sessionId);
  if (!entry) return res.status(404).json({ error: 'Session not found' });
  try { await entry.client.destroy(); } catch (_) { /* ignore */ }
  waSessions.delete(req.params.sessionId);
  res.json({ ok: true });
});

app.get('/api/whatsapp/sessions/:sessionId/groups', authMiddleware, async (req, res) => {
  const entry = waSessions.get(req.params.sessionId);
  if (!entry || entry.status !== 'ready') {
    return res.status(400).json({ error: 'Session not ready' });
  }
  try {
    const chats = await entry.client.getChats();
    const groups = chats
      .filter(c => c.isGroup)
      .map(c => ({ id: c.id._serialized, name: c.name, participantCount: c.participants?.length || 0 }));
    res.json({ groups });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Fetch DWY groups for a session (groups with "DWY" in name)
app.get('/api/whatsapp/sessions/:sessionId/dwy-groups', authMiddleware, async (req, res) => {
  const entry = waSessions.get(req.params.sessionId);
  if (!entry || entry.status !== 'ready') {
    return res.status(400).json({ error: 'Session not ready' });
  }
  try {
    const chats = await entry.client.getChats();
    const dwyChats = chats.filter(c => c.isGroup && c.name && c.name.toUpperCase().includes('DWY'));

    // Look up existing WaProject records for these chats
    const chatIds = dwyChats.map(c => c.id._serialized);
    const existingProjects = await prisma.waProject.findMany({
      where: { whatsappChatId: { in: chatIds }, userId: req.user.id },
      include: { client: { select: { id: true, name: true, email: true } } }
    });
    const projectMap = {};
    existingProjects.forEach(p => { projectMap[p.whatsappChatId] = p; });

    const groups = dwyChats.map(c => {
      const chatId = c.id._serialized;
      const project = projectMap[chatId];
      return {
        id: chatId,
        name: c.name,
        participantCount: c.participants?.length || 0,
        projectId: project?.id || null,
        clientId: project?.clientId || null,
        clientName: project?.client?.name || project?.client?.email || null
      };
    });

    res.json({ groups });
  } catch (err) {
    console.error('[DWY groups] Error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Link a WhatsApp group to a client
app.post('/api/whatsapp/link-group', authMiddleware, async (req, res) => {
  const { whatsappChatId, groupName, clientId } = req.body;
  if (!whatsappChatId || !groupName) {
    return res.status(400).json({ error: 'whatsappChatId and groupName are required' });
  }
  try {
    // Find existing project for this user + chat
    const existing = await prisma.waProject.findUnique({
      where: { userId_whatsappChatId: { userId: req.user.id, whatsappChatId } }
    });

    let project;
    if (existing) {
      project = await prisma.waProject.update({
        where: { id: existing.id },
        data: { clientId: clientId || null, nombre: groupName },
        include: { client: { select: { id: true, name: true, email: true } } }
      });
    } else {
      project = await prisma.waProject.create({
        data: {
          whatsappChatId,
          nombre: groupName,
          clientId: clientId || null,
          userId: req.user.id
        },
        include: { client: { select: { id: true, name: true, email: true } } }
      });
    }
    res.json({ project });
  } catch (err) {
    console.error('[Link group] Error:', err);
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    env: {
      hasJwtSecret: !!process.env.JWT_SECRET,
      hasDatabaseUrl: !!process.env.DATABASE_URL,
      hasOpenaiKey: !!process.env.OPENAI_API_KEY,
      nodeEnv: process.env.NODE_ENV,
    },
  });
});

// Serve client build in production
const clientDist = path.join(__dirname, '../../client/dist');
app.use(express.static(clientDist));
app.get('*', (req, res) => {
  res.sendFile(path.join(clientDist, 'index.html'));
});

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal server error' });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, '0.0.0.0', () => console.log(`Server running on port ${PORT}`));
