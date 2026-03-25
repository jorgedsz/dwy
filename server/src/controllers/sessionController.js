const { PrismaClient } = require('@prisma/client');
const { analyzeSession } = require('../services/aiService');

const prisma = new PrismaClient();

async function listByClient(req, res) {
  try {
    const sessions = await prisma.session.findMany({
      where: { clientId: parseInt(req.params.clientId) },
      orderBy: { date: 'desc' },
    });
    res.json(sessions);
  } catch (err) {
    console.error('List sessions error:', err);
    res.status(500).json({ error: 'Failed to fetch sessions' });
  }
}

async function getById(req, res) {
  try {
    const session = await prisma.session.findUnique({
      where: { id: parseInt(req.params.id) },
      include: { client: { select: { id: true, name: true } } },
    });
    if (!session) return res.status(404).json({ error: 'Session not found' });
    res.json(session);
  } catch (err) {
    console.error('Get session error:', err);
    res.status(500).json({ error: 'Failed to fetch session' });
  }
}

async function create(req, res) {
  try {
    const { clientId, type, title, date, recordingUrl, transcription } = req.body;
    if (!clientId || !type || !title || !date) {
      return res.status(400).json({ error: 'clientId, type, title, and date are required' });
    }

    const session = await prisma.session.create({
      data: {
        clientId: parseInt(clientId),
        type,
        title,
        date: new Date(date),
        recordingUrl,
        transcription,
      },
    });

    if (transcription) {
      analyzeSession(session.id).catch((err) =>
        console.error('Async AI analysis failed:', err)
      );
    }

    res.status(201).json(session);
  } catch (err) {
    console.error('Create session error:', err);
    res.status(500).json({ error: 'Failed to create session' });
  }
}

async function update(req, res) {
  try {
    const { type, title, date, recordingUrl, transcription } = req.body;
    const id = parseInt(req.params.id);

    const existing = await prisma.session.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ error: 'Session not found' });

    const session = await prisma.session.update({
      where: { id },
      data: {
        type,
        title,
        date: date ? new Date(date) : undefined,
        recordingUrl,
        transcription,
      },
    });

    if (transcription && transcription !== existing.transcription) {
      analyzeSession(session.id).catch((err) =>
        console.error('Async AI analysis failed:', err)
      );
    }

    res.json(session);
  } catch (err) {
    console.error('Update session error:', err);
    res.status(500).json({ error: 'Failed to update session' });
  }
}

async function remove(req, res) {
  try {
    await prisma.session.delete({ where: { id: parseInt(req.params.id) } });
    res.json({ message: 'Session deleted' });
  } catch (err) {
    console.error('Delete session error:', err);
    res.status(500).json({ error: 'Failed to delete session' });
  }
}

async function analyze(req, res) {
  try {
    const result = await analyzeSession(parseInt(req.params.id));
    if (!result) {
      return res.status(400).json({ error: 'No transcription to analyze' });
    }
    res.json(result);
  } catch (err) {
    console.error('Analyze session error:', err.message || err);
    res.status(500).json({ error: err.message || 'AI analysis failed' });
  }
}

// Diagnostic: test if OpenAI connection works
async function testAi(req, res) {
  try {
    const OpenAI = require('openai');
    if (!process.env.OPENAI_API_KEY) {
      return res.json({ ok: false, error: 'OPENAI_API_KEY not set' });
    }
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: 'Reply with just: ok' }],
      max_tokens: 5,
    });
    res.json({ ok: true, reply: response.choices[0].message.content });
  } catch (err) {
    res.json({ ok: false, error: err.message });
  }
}

module.exports = { listByClient, getById, create, update, remove, analyze, testAi };
