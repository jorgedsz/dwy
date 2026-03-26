const crypto = require('crypto');

// PUBLIC — Get client info + sessions by portal token
const getByToken = async (req, res) => {
  try {
    const { token } = req.params;

    const client = await req.prisma.client.findUnique({
      where: { portalToken: token },
      select: {
        id: true,
        name: true,
        email: true,
        company: true,
        createdAt: true,
        sessions: {
          select: {
            id: true,
            title: true,
            type: true,
            date: true,
            aiSummary: true,
            pendingItems: true,
            recordingUrl: true,
          },
          orderBy: { date: 'desc' },
        },
      },
    });

    if (!client) {
      return res.status(404).json({ error: 'Portal not found' });
    }

    res.json({ client, sessions: client.sessions });
  } catch (error) {
    console.error('[Portal] getByToken error:', error);
    res.status(500).json({ error: 'Failed to load portal' });
  }
};

// PUBLIC — Get full session detail by portal token + session ID
const getSessionByToken = async (req, res) => {
  try {
    const { token, sessionId } = req.params;

    const client = await req.prisma.client.findUnique({
      where: { portalToken: token },
      select: { id: true, name: true, email: true, company: true },
    });

    if (!client) {
      return res.status(404).json({ error: 'Portal not found' });
    }

    const session = await req.prisma.session.findUnique({
      where: { id: parseInt(sessionId) },
    });

    if (!session || session.clientId !== client.id) {
      return res.status(404).json({ error: 'Session not found' });
    }

    res.json({
      client,
      session: {
        id: session.id,
        title: session.title,
        type: session.type,
        date: session.date,
        recordingUrl: session.recordingUrl,
        transcription: session.transcription,
        aiSummary: session.aiSummary,
        pendingItems: session.pendingItems,
      },
    });
  } catch (error) {
    console.error('[Portal] getSessionByToken error:', error);
    res.status(500).json({ error: 'Failed to load session' });
  }
};

// AUTH REQUIRED — Generate or retrieve portal token for a client
const generateToken = async (req, res) => {
  try {
    const clientId = parseInt(req.params.id);

    const client = await req.prisma.client.findUnique({
      where: { id: clientId },
      select: { id: true, portalToken: true },
    });

    if (!client) {
      return res.status(404).json({ error: 'Client not found' });
    }

    // If token already exists, return it
    if (client.portalToken) {
      return res.json({ portalToken: client.portalToken });
    }

    // Generate new 128-bit random token
    const portalToken = crypto.randomBytes(16).toString('hex');

    await req.prisma.client.update({
      where: { id: clientId },
      data: { portalToken },
    });

    res.json({ portalToken });
  } catch (error) {
    console.error('[Portal] generateToken error:', error);
    res.status(500).json({ error: 'Failed to generate portal token' });
  }
};

module.exports = { getByToken, getSessionByToken, generateToken };
