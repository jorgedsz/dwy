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

  const client = new WAClient({
    authStrategy: new LocalAuth({ clientId: sessionId }),
    puppeteer: { headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] }
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

app.use('/api/auth', authRoutes);
app.use('/api/clients', clientRoutes);
app.use('/api/sessions', sessionRoutes);
app.use('/api/wa-projects', require('./routes/waProjects'));
app.use('/api/wa-alerts', require('./routes/waAlerts'));
app.use('/api/wa-bot-config', require('./routes/waBotConfig'));

// ── WhatsApp API endpoints ─────────────────────────────────
app.post('/api/whatsapp/sessions', authMiddleware, (req, res) => {
  const sessionId = req.body.sessionId || `wa-${req.user.id}-${Date.now()}`;
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
