/** GET /api/chatbots */
async function list(req, res) {
  try {
    const chatbots = await req.prisma.chatbot.findMany({
      where: { userId: req.user.id },
      orderBy: { updatedAt: 'desc' },
    });
    const parsed = chatbots.map(c => ({
      id: c.id,
      name: c.name,
      systemPrompt: c.systemPrompt,
      tools: JSON.parse(c.tools || '[]'),
      ...JSON.parse(c.config || '{}'),
      createdAt: c.createdAt,
      updatedAt: c.updatedAt,
    }));
    res.json({ chatbots: parsed });
  } catch (err) {
    console.error('[Chatbot] list error:', err);
    res.status(500).json({ error: 'Failed to list chatbots' });
  }
}

/** GET /api/chatbots/:id */
async function get(req, res) {
  try {
    const chatbot = await req.prisma.chatbot.findFirst({
      where: { id: parseInt(req.params.id), userId: req.user.id },
    });
    if (!chatbot) return res.status(404).json({ error: 'Chatbot not found' });

    res.json({
      chatbot: {
        id: chatbot.id,
        name: chatbot.name,
        systemPrompt: chatbot.systemPrompt,
        tools: JSON.parse(chatbot.tools || '[]'),
        ...JSON.parse(chatbot.config || '{}'),
        createdAt: chatbot.createdAt,
        updatedAt: chatbot.updatedAt,
      },
    });
  } catch (err) {
    console.error('[Chatbot] get error:', err);
    res.status(500).json({ error: 'Failed to get chatbot' });
  }
}

/** POST /api/chatbots */
async function create(req, res) {
  try {
    const { name, systemPrompt, tools, ...rest } = req.body;
    if (!name) return res.status(400).json({ error: 'name is required' });

    const chatbot = await req.prisma.chatbot.create({
      data: {
        userId: req.user.id,
        name,
        systemPrompt: systemPrompt || '',
        tools: JSON.stringify(tools || []),
        config: JSON.stringify(rest),
      },
    });

    res.json({
      chatbot: {
        id: chatbot.id,
        name: chatbot.name,
        systemPrompt: chatbot.systemPrompt,
        tools: JSON.parse(chatbot.tools),
        ...JSON.parse(chatbot.config),
      },
    });
  } catch (err) {
    console.error('[Chatbot] create error:', err);
    res.status(500).json({ error: 'Failed to create chatbot' });
  }
}

/** PUT /api/chatbots/:id */
async function update(req, res) {
  try {
    const existing = await req.prisma.chatbot.findFirst({
      where: { id: parseInt(req.params.id), userId: req.user.id },
    });
    if (!existing) return res.status(404).json({ error: 'Chatbot not found' });

    const { name, systemPrompt, tools, ...rest } = req.body;

    const chatbot = await req.prisma.chatbot.update({
      where: { id: existing.id },
      data: {
        name: name ?? existing.name,
        systemPrompt: systemPrompt ?? existing.systemPrompt,
        tools: tools ? JSON.stringify(tools) : existing.tools,
        config: JSON.stringify({ ...JSON.parse(existing.config || '{}'), ...rest }),
      },
    });

    res.json({
      chatbot: {
        id: chatbot.id,
        name: chatbot.name,
        systemPrompt: chatbot.systemPrompt,
        tools: JSON.parse(chatbot.tools),
        ...JSON.parse(chatbot.config),
      },
    });
  } catch (err) {
    console.error('[Chatbot] update error:', err);
    res.status(500).json({ error: 'Failed to update chatbot' });
  }
}

/** DELETE /api/chatbots/:id */
async function remove(req, res) {
  try {
    const existing = await req.prisma.chatbot.findFirst({
      where: { id: parseInt(req.params.id), userId: req.user.id },
    });
    if (!existing) return res.status(404).json({ error: 'Chatbot not found' });

    await req.prisma.chatbot.delete({ where: { id: existing.id } });
    res.json({ ok: true });
  } catch (err) {
    console.error('[Chatbot] delete error:', err);
    res.status(500).json({ error: 'Failed to delete chatbot' });
  }
}

module.exports = { list, get, create, update, remove };
