const { PrismaClient } = require('@prisma/client');
const { analyzeSession, analyzeClient } = require('../services/aiService');

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
      include: {
        client: { select: { id: true, name: true } },
        pendingTasks: { orderBy: { id: 'asc' } },
      },
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

async function analyzeAll(req, res) {
  try {
    const sessions = await prisma.session.findMany({
      where: {
        transcription: { not: null },
        aiSummary: null,
      },
      select: { id: true, title: true },
    });

    if (sessions.length === 0) {
      return res.json({ message: 'No sessions need analysis', count: 0 });
    }

    res.json({ message: `Analyzing ${sessions.length} sessions in background`, count: sessions.length, sessions: sessions.map(s => s.title) });

    // Run in background after responding
    for (const session of sessions) {
      try {
        console.log(`[AI Batch] Analyzing session ${session.id}: ${session.title}`);
        await analyzeSession(session.id);
        console.log(`[AI Batch] Done: ${session.title}`);
      } catch (err) {
        console.error(`[AI Batch] Failed session ${session.id}:`, err.message);
      }
    }
    console.log('[AI Batch] All done.');
  } catch (err) {
    console.error('Analyze all error:', err);
    res.status(500).json({ error: err.message });
  }
}

async function clientAnalysis(req, res) {
  try {
    const result = await analyzeClient(req.params.clientId);
    if (!result) {
      return res.status(400).json({ error: 'No sessions with AI summaries available for analysis' });
    }
    res.json(result);
  } catch (err) {
    console.error('Client analysis error:', err.message || err);
    res.status(500).json({ error: err.message || 'Client analysis failed' });
  }
}

async function toggleTask(req, res) {
  try {
    const taskId = parseInt(req.params.taskId);
    const task = await prisma.pendingTask.findUnique({ where: { id: taskId } });
    if (!task) return res.status(404).json({ error: 'Task not found' });

    const updated = await prisma.pendingTask.update({
      where: { id: taskId },
      data: {
        completed: !task.completed,
        completedAt: task.completed ? null : new Date(),
      },
    });
    res.json(updated);
  } catch (err) {
    console.error('Toggle task error:', err);
    res.status(500).json({ error: 'Failed to toggle task' });
  }
}

module.exports = { listByClient, getById, create, update, remove, analyze, analyzeAll, testAi, clientAnalysis, toggleTask };
