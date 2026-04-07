// ── Training Mode Controller ───────────────────────────────

const SERVER_URL = process.env.SERVER_URL || 'http://localhost:3001';

// Build the training system prompt based on agent config and language
function buildTrainingPrompt(agent) {
  const lang = agent.language || 'en';
  const configSummary = [
    `Name: ${agent.name}`,
    `First Message: ${agent.firstMessage || '(not set)'}`,
    `System Prompt: ${agent.systemPromptBase ? agent.systemPromptBase.substring(0, 500) + '...' : '(not set)'}`,
  ].join('\n');

  if (lang === 'es') {
    return `Eres un asistente de entrenamiento. El usuario quiere modificar la configuración de su agente de voz a través de esta llamada.

CONFIGURACIÓN ACTUAL DEL AGENTE:
${configSummary}

CAMPOS QUE SE PUEDEN MODIFICAR:
- firstMessage: El mensaje inicial que dice el agente al contestar
- systemPrompt: Las instrucciones del sistema del agente
- name: El nombre del agente

REGLAS:
1. Cuando el usuario pida un cambio, CONFIRMA lo que entendiste antes de llamar la herramienta propose_change
2. Después de registrar un cambio, ENSAYA el nuevo comportamiento (por ejemplo, si cambian el firstMessage, dilo en voz alta)
3. Habla siempre en español
4. Sé conciso y profesional
5. Si el usuario pide algo que no puedes cambiar, explícale qué campos están disponibles`;
  }

  return `You are a training assistant. The user wants to modify their voice agent's configuration through this call.

CURRENT AGENT CONFIGURATION:
${configSummary}

FIELDS THAT CAN BE MODIFIED:
- firstMessage: The initial message the agent says when answering
- systemPrompt: The agent's system instructions
- name: The agent's name

RULES:
1. When the user requests a change, CONFIRM what you understood before calling the propose_change tool
2. After recording a change, REHEARSE the new behavior (e.g., if they change firstMessage, say it out loud)
3. Always speak in English
4. Be concise and professional
5. If the user asks for something you can't change, explain which fields are available`;
}

// Build inline VAPI config for the training call
function buildVapiConfig(agent, sessionToken) {
  const toolCallUrl = `${SERVER_URL}/api/training/propose-change?sessionToken=${sessionToken}`;

  return {
    model: {
      provider: 'openai',
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: buildTrainingPrompt(agent) }
      ],
      tools: [
        {
          type: 'function',
          function: {
            name: 'propose_change',
            description: 'Record a proposed change to the agent configuration',
            parameters: {
              type: 'object',
              properties: {
                field: {
                  type: 'string',
                  enum: ['firstMessage', 'systemPrompt', 'name'],
                  description: 'The agent config field to change'
                },
                newValue: {
                  type: 'string',
                  description: 'The new value for the field'
                },
                description: {
                  type: 'string',
                  description: 'Brief description of what this change does'
                }
              },
              required: ['field', 'newValue', 'description']
            }
          },
          server: { url: toolCallUrl }
        }
      ]
    },
    voice: agent.voice
      ? { provider: '11labs', voiceId: agent.voice }
      : { provider: '11labs', voiceId: 'sarah' },
    firstMessage: agent.language === 'es'
      ? 'Hola, estoy en modo entrenamiento. ¿Qué cambios quieres hacer a tu agente?'
      : "Hi, I'm in training mode. What changes would you like to make to your agent?",
    transcriber: {
      provider: 'deepgram',
      model: 'nova-2',
      language: agent.language === 'es' ? 'es' : 'en',
    },
  };
}

// POST /api/training/sessions — Create a training session
const createSession = async (req, res) => {
  try {
    const { agentId } = req.body;
    if (!agentId) return res.status(400).json({ error: 'agentId is required' });

    const agent = await req.prisma.agent.findUnique({ where: { id: agentId } });
    if (!agent) return res.status(404).json({ error: 'Agent not found' });
    if (agent.userId !== req.user.id) return res.status(403).json({ error: 'Not authorized' });

    const session = await req.prisma.trainingSession.create({
      data: {
        agentId,
        userId: req.user.id,
        proposedChanges: '[]',
      },
    });

    const vapiConfig = buildVapiConfig(agent, session.sessionToken);

    res.json({ session, vapiConfig });
  } catch (error) {
    console.error('[Training] createSession error:', error);
    res.status(500).json({ error: 'Failed to create training session' });
  }
};

// POST /api/training/propose-change?sessionToken=X — VAPI tool call (public)
const proposeChange = async (req, res) => {
  try {
    const { sessionToken } = req.query;
    if (!sessionToken) return res.status(400).json({ error: 'sessionToken required' });

    const session = await req.prisma.trainingSession.findUnique({
      where: { sessionToken },
      include: { agent: true },
    });
    if (!session) return res.status(404).json({ error: 'Session not found' });
    if (session.status !== 'in_progress') {
      return res.status(400).json({ error: 'Session is not in progress' });
    }

    // Extract tool call data from VAPI format
    const toolCall = req.body.message?.toolCalls?.[0];
    if (!toolCall) return res.status(400).json({ error: 'No tool call found' });

    const args = typeof toolCall.function?.arguments === 'string'
      ? JSON.parse(toolCall.function.arguments)
      : toolCall.function?.arguments;

    const { field, newValue, description } = args;
    if (!field || !newValue) {
      return res.status(400).json({
        results: [{ toolCallId: toolCall.id, result: 'Error: field and newValue are required' }]
      });
    }

    // Look up old value from agent config
    const fieldMap = {
      firstMessage: session.agent.firstMessage,
      systemPrompt: session.agent.systemPromptBase,
      name: session.agent.name,
    };
    const oldValue = fieldMap[field] || '';

    // Append to proposed changes
    const changes = JSON.parse(session.proposedChanges || '[]');
    changes.push({
      field,
      oldValue,
      newValue,
      description: description || '',
      timestamp: new Date().toISOString(),
    });

    await req.prisma.trainingSession.update({
      where: { id: session.id },
      data: { proposedChanges: JSON.stringify(changes) },
    });

    // Return in VAPI expected format
    res.json({
      results: [{
        toolCallId: toolCall.id,
        result: `Change recorded: ${field} will be updated. ${description || ''}`
      }]
    });
  } catch (error) {
    console.error('[Training] proposeChange error:', error);
    res.status(500).json({ error: 'Failed to record change' });
  }
};

// GET /api/training/sessions?agentId=X — List sessions for an agent
const listSessions = async (req, res) => {
  try {
    const { agentId } = req.query;
    if (!agentId) return res.status(400).json({ error: 'agentId query param required' });

    const sessions = await req.prisma.trainingSession.findMany({
      where: { agentId, userId: req.user.id },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        status: true,
        proposedChanges: true,
        createdAt: true,
      },
    });

    // Parse changes count for each session
    const result = sessions.map(s => ({
      ...s,
      changesCount: JSON.parse(s.proposedChanges || '[]').length,
      proposedChanges: undefined,
    }));

    res.json(result);
  } catch (error) {
    console.error('[Training] listSessions error:', error);
    res.status(500).json({ error: 'Failed to list sessions' });
  }
};

// GET /api/training/sessions/:id — Get session with full changes
const getSession = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const session = await req.prisma.trainingSession.findUnique({
      where: { id },
      include: { agent: { select: { id: true, name: true, userId: true } } },
    });

    if (!session) return res.status(404).json({ error: 'Session not found' });
    if (session.userId !== req.user.id) return res.status(403).json({ error: 'Not authorized' });

    res.json({
      ...session,
      proposedChanges: JSON.parse(session.proposedChanges || '[]'),
    });
  } catch (error) {
    console.error('[Training] getSession error:', error);
    res.status(500).json({ error: 'Failed to get session' });
  }
};

// POST /api/training/sessions/:id/complete — Mark session completed
const completeSession = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { transcript } = req.body;

    const session = await req.prisma.trainingSession.findUnique({ where: { id } });
    if (!session) return res.status(404).json({ error: 'Session not found' });
    if (session.userId !== req.user.id) return res.status(403).json({ error: 'Not authorized' });
    if (session.status !== 'in_progress') {
      return res.status(400).json({ error: 'Session is not in progress' });
    }

    const updated = await req.prisma.trainingSession.update({
      where: { id },
      data: {
        status: 'completed',
        transcript: transcript || null,
      },
    });

    res.json({
      ...updated,
      proposedChanges: JSON.parse(updated.proposedChanges || '[]'),
    });
  } catch (error) {
    console.error('[Training] completeSession error:', error);
    res.status(500).json({ error: 'Failed to complete session' });
  }
};

// POST /api/training/sessions/:id/accept — Apply changes to agent config
const acceptSession = async (req, res) => {
  try {
    const id = parseInt(req.params.id);

    const session = await req.prisma.trainingSession.findUnique({
      where: { id },
      include: { agent: true },
    });
    if (!session) return res.status(404).json({ error: 'Session not found' });
    if (session.userId !== req.user.id) return res.status(403).json({ error: 'Not authorized' });
    if (session.status !== 'completed') {
      return res.status(400).json({ error: 'Session must be completed before accepting' });
    }

    const changes = JSON.parse(session.proposedChanges || '[]');
    if (changes.length === 0) {
      return res.status(400).json({ error: 'No changes to apply' });
    }

    // Build update data from changes
    const updateData = {};
    for (const change of changes) {
      switch (change.field) {
        case 'firstMessage':
          updateData.firstMessage = change.newValue;
          break;
        case 'systemPrompt':
          updateData.systemPromptBase = change.newValue;
          break;
        case 'name':
          updateData.name = change.newValue;
          break;
      }
    }

    // Update agent in DB
    const updatedAgent = await req.prisma.agent.update({
      where: { id: session.agentId },
      data: updateData,
    });

    // Mark session as accepted
    await req.prisma.trainingSession.update({
      where: { id },
      data: { status: 'accepted' },
    });

    res.json({ agent: updatedAgent, applied: changes.length });
  } catch (error) {
    console.error('[Training] acceptSession error:', error);
    res.status(500).json({ error: 'Failed to accept session' });
  }
};

// POST /api/training/sessions/:id/reject — Mark session rejected
const rejectSession = async (req, res) => {
  try {
    const id = parseInt(req.params.id);

    const session = await req.prisma.trainingSession.findUnique({ where: { id } });
    if (!session) return res.status(404).json({ error: 'Session not found' });
    if (session.userId !== req.user.id) return res.status(403).json({ error: 'Not authorized' });
    if (session.status !== 'completed') {
      return res.status(400).json({ error: 'Session must be completed before rejecting' });
    }

    await req.prisma.trainingSession.update({
      where: { id },
      data: { status: 'rejected' },
    });

    res.json({ ok: true });
  } catch (error) {
    console.error('[Training] rejectSession error:', error);
    res.status(500).json({ error: 'Failed to reject session' });
  }
};

module.exports = {
  createSession,
  proposeChange,
  listSessions,
  getSession,
  completeSession,
  acceptSession,
  rejectSession,
};
