// ── Agent CRUD Controller ───────────────────────────────

const listAgents = async (req, res) => {
  try {
    const agents = await req.prisma.agent.findMany({
      where: { userId: req.user.id },
      orderBy: { createdAt: 'desc' },
    });
    res.json(agents);
  } catch (error) {
    console.error('[Agent] list error:', error);
    res.status(500).json({ error: 'Failed to list agents' });
  }
};

const getAgent = async (req, res) => {
  try {
    const agent = await req.prisma.agent.findUnique({
      where: { id: req.params.id },
    });
    if (!agent) return res.status(404).json({ error: 'Agent not found' });
    if (agent.userId !== req.user.id) return res.status(403).json({ error: 'Not authorized' });
    res.json(agent);
  } catch (error) {
    console.error('[Agent] get error:', error);
    res.status(500).json({ error: 'Failed to get agent' });
  }
};

const createAgent = async (req, res) => {
  try {
    const { name, firstMessage, systemPromptBase, language, voice, vapiPublicKey } = req.body;
    if (!name) return res.status(400).json({ error: 'name is required' });

    const agent = await req.prisma.agent.create({
      data: {
        userId: req.user.id,
        name,
        firstMessage: firstMessage || null,
        systemPromptBase: systemPromptBase || null,
        language: language || 'en',
        voice: voice || null,
        vapiPublicKey: vapiPublicKey || null,
      },
    });
    res.status(201).json(agent);
  } catch (error) {
    console.error('[Agent] create error:', error);
    res.status(500).json({ error: 'Failed to create agent' });
  }
};

const updateAgent = async (req, res) => {
  try {
    const existing = await req.prisma.agent.findUnique({ where: { id: req.params.id } });
    if (!existing) return res.status(404).json({ error: 'Agent not found' });
    if (existing.userId !== req.user.id) return res.status(403).json({ error: 'Not authorized' });

    const { name, firstMessage, systemPromptBase, language, voice, vapiPublicKey } = req.body;
    const agent = await req.prisma.agent.update({
      where: { id: req.params.id },
      data: {
        ...(name !== undefined && { name }),
        ...(firstMessage !== undefined && { firstMessage }),
        ...(systemPromptBase !== undefined && { systemPromptBase }),
        ...(language !== undefined && { language }),
        ...(voice !== undefined && { voice }),
        ...(vapiPublicKey !== undefined && { vapiPublicKey }),
      },
    });
    res.json(agent);
  } catch (error) {
    console.error('[Agent] update error:', error);
    res.status(500).json({ error: 'Failed to update agent' });
  }
};

const duplicateAgent = async (req, res) => {
  try {
    const original = await req.prisma.agent.findUnique({ where: { id: req.params.id } });
    if (!original) return res.status(404).json({ error: 'Agent not found' });
    if (original.userId !== req.user.id) return res.status(403).json({ error: 'Not authorized' });

    const agent = await req.prisma.agent.create({
      data: {
        userId: req.user.id,
        name: `${original.name} (Copy)`,
        firstMessage: original.firstMessage,
        systemPromptBase: original.systemPromptBase,
        language: original.language,
        voice: original.voice,
        vapiPublicKey: original.vapiPublicKey,
      },
    });
    res.status(201).json(agent);
  } catch (error) {
    console.error('[Agent] duplicate error:', error);
    res.status(500).json({ error: 'Failed to duplicate agent' });
  }
};

const deleteAgent = async (req, res) => {
  try {
    const existing = await req.prisma.agent.findUnique({ where: { id: req.params.id } });
    if (!existing) return res.status(404).json({ error: 'Agent not found' });
    if (existing.userId !== req.user.id) return res.status(403).json({ error: 'Not authorized' });

    await req.prisma.agent.delete({ where: { id: req.params.id } });
    res.json({ ok: true });
  } catch (error) {
    console.error('[Agent] delete error:', error);
    res.status(500).json({ error: 'Failed to delete agent' });
  }
};

module.exports = { listAgents, getAgent, createAgent, updateAgent, duplicateAgent, deleteAgent };
