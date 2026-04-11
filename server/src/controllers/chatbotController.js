const messageBuffer = require('../services/messageBuffer');

// ── Helper: forward merged message to n8n ────────────────────

async function forwardToN8n(chatbot, forwardBody, prisma) {
  if (!chatbot.n8nWebhookUrl) {
    console.warn(`[Chatbot] ${chatbot.id} has no n8nWebhookUrl, skipping forward`);
    return;
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000);

    const resp = await fetch(chatbot.n8nWebhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(forwardBody),
      signal: controller.signal,
    });
    clearTimeout(timeout);

    const data = await resp.json().catch(() => null);
    console.log(`[Chatbot] forwarded to n8n for ${chatbot.id}, status: ${resp.status}`);
    return data;
  } catch (err) {
    console.error(`[Chatbot] n8n forward error for ${chatbot.id}:`, err.message);
    throw err;
  }
}

// ── Buffer flush callback ────────────────────────────────────

function handleBufferFlush(bufferKey, mergedMessage, context) {
  const { chatbot, originalBody, prisma } = context;

  const forwardBody = {
    ...originalBody,
    message: mergedMessage,
    _buffered: true,
    _chatbotId: chatbot.id,
  };

  // Fire-and-forget — we can't return a response (the HTTP request already returned)
  forwardToN8n(chatbot, forwardBody, prisma).catch(err => {
    console.error(`[Chatbot] buffered flush failed for ${bufferKey}:`, err.message);
  });
}

// ── Webhook proxy (public, no auth) ──────────────────────────

const webhookProxy = async (req, res) => {
  try {
    const chatbot = await req.prisma.chatbot.findUnique({
      where: { id: req.params.id },
    });
    if (!chatbot) return res.status(404).json({ error: 'Chatbot not found' });
    if (!chatbot.active) return res.status(403).json({ error: 'Chatbot is disabled' });
    if (!chatbot.n8nWebhookUrl) return res.status(400).json({ error: 'No n8n webhook URL configured' });

    const config = JSON.parse(chatbot.config || '{}');
    const bufferSeconds = config.bufferSeconds || 0;

    const messageText = req.body.message || req.body.text || req.body.content || '';
    const sessionId = req.body.sessionId || req.body.contactId || req.body.from || 'default';

    // Buffered path
    if (bufferSeconds > 0 && messageText) {
      const bufferKey = `${chatbot.id}:${sessionId}`;
      const context = { chatbot, originalBody: req.body, prisma: req.prisma };
      const result = messageBuffer.addMessage(bufferKey, messageText, bufferSeconds, context, handleBufferFlush);
      return res.json({ queued: true, bufferSize: result.bufferSize });
    }

    // Synchronous path (no buffering)
    const forwardBody = {
      ...req.body,
      _chatbotId: chatbot.id,
    };

    const n8nResponse = await forwardToN8n(chatbot, forwardBody, req.prisma);
    res.json({ ok: true, data: n8nResponse });
  } catch (err) {
    console.error('[Chatbot] webhook proxy error:', err);
    res.status(500).json({ error: 'Webhook proxy failed' });
  }
};

// ── CRUD ─────────────────────────────────────────────────────

const listChatbots = async (req, res) => {
  try {
    const chatbots = await req.prisma.chatbot.findMany({
      where: { userId: req.user.id },
      orderBy: { createdAt: 'desc' },
    });
    res.json(chatbots);
  } catch (err) {
    console.error('[Chatbot] list error:', err);
    res.status(500).json({ error: 'Failed to list chatbots' });
  }
};

const getChatbot = async (req, res) => {
  try {
    const chatbot = await req.prisma.chatbot.findUnique({ where: { id: req.params.id } });
    if (!chatbot) return res.status(404).json({ error: 'Chatbot not found' });
    if (chatbot.userId !== req.user.id) return res.status(403).json({ error: 'Not authorized' });
    res.json(chatbot);
  } catch (err) {
    console.error('[Chatbot] get error:', err);
    res.status(500).json({ error: 'Failed to get chatbot' });
  }
};

const createChatbot = async (req, res) => {
  try {
    const { name } = req.body;
    if (!name) return res.status(400).json({ error: 'name is required' });

    const chatbot = await req.prisma.chatbot.create({
      data: { userId: req.user.id, name },
    });
    res.status(201).json(chatbot);
  } catch (err) {
    console.error('[Chatbot] create error:', err);
    res.status(500).json({ error: 'Failed to create chatbot' });
  }
};

const updateChatbot = async (req, res) => {
  try {
    const existing = await req.prisma.chatbot.findUnique({ where: { id: req.params.id } });
    if (!existing) return res.status(404).json({ error: 'Chatbot not found' });
    if (existing.userId !== req.user.id) return res.status(403).json({ error: 'Not authorized' });

    const { name, config, n8nWebhookUrl, active } = req.body;
    const chatbot = await req.prisma.chatbot.update({
      where: { id: req.params.id },
      data: {
        ...(name !== undefined && { name }),
        ...(config !== undefined && { config: typeof config === 'string' ? config : JSON.stringify(config) }),
        ...(n8nWebhookUrl !== undefined && { n8nWebhookUrl }),
        ...(active !== undefined && { active }),
      },
    });
    res.json(chatbot);
  } catch (err) {
    console.error('[Chatbot] update error:', err);
    res.status(500).json({ error: 'Failed to update chatbot' });
  }
};

const deleteChatbot = async (req, res) => {
  try {
    const existing = await req.prisma.chatbot.findUnique({ where: { id: req.params.id } });
    if (!existing) return res.status(404).json({ error: 'Chatbot not found' });
    if (existing.userId !== req.user.id) return res.status(403).json({ error: 'Not authorized' });

    await req.prisma.chatbot.delete({ where: { id: req.params.id } });
    res.json({ ok: true });
  } catch (err) {
    console.error('[Chatbot] delete error:', err);
    res.status(500).json({ error: 'Failed to delete chatbot' });
  }
};

module.exports = {
  listChatbots,
  getChatbot,
  createChatbot,
  updateChatbot,
  deleteChatbot,
  webhookProxy,
  handleBufferFlush,
  forwardToN8n,
};
