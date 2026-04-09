// ── Chatbot CRUD Controller ───────────────────────────────

const listChatbots = async (req, res) => {
  try {
    const chatbots = await req.prisma.chatbot.findMany({
      where: { userId: req.user.id },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true, name: true, active: true, ghlLocationId: true,
        n8nWebhookUrl: true, createdAt: true, updatedAt: true,
        config: true,
      },
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
    // Don't expose raw ghlApiKey
    const { ghlApiKey, ...safe } = chatbot;
    res.json({ ...safe, hasGhlApiKey: !!ghlApiKey });
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

    const { name, config, n8nWebhookUrl, ghlLocationId, ghlApiKey, active } = req.body;
    const chatbot = await req.prisma.chatbot.update({
      where: { id: req.params.id },
      data: {
        ...(name !== undefined && { name }),
        ...(config !== undefined && { config: typeof config === 'string' ? config : JSON.stringify(config) }),
        ...(n8nWebhookUrl !== undefined && { n8nWebhookUrl }),
        ...(ghlLocationId !== undefined && { ghlLocationId }),
        ...(ghlApiKey !== undefined && { ghlApiKey }),
        ...(active !== undefined && { active }),
      },
    });
    const { ghlApiKey: _key, ...safe } = chatbot;
    res.json({ ...safe, hasGhlApiKey: !!_key });
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

module.exports = { listChatbots, getChatbot, createChatbot, updateChatbot, deleteChatbot };
