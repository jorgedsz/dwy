const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function getPendingTasks(req, res) {
  try {
    const tasks = await prisma.pendingTask.findMany({
      where: { completed: false },
      include: {
        session: {
          select: {
            id: true,
            title: true,
            date: true,
            client: { select: { id: true, name: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Group by client
    const byClient = {};
    for (const task of tasks) {
      const client = task.session.client;
      if (!byClient[client.id]) {
        byClient[client.id] = { clientId: client.id, clientName: client.name, tasks: [] };
      }
      byClient[client.id].tasks.push({
        id: task.id,
        text: task.text,
        sessionId: task.session.id,
        sessionTitle: task.session.title,
        sessionDate: task.session.date,
        createdAt: task.createdAt,
      });
    }

    res.json(Object.values(byClient));
  } catch (err) {
    console.error('Dashboard pending tasks error:', err);
    res.status(500).json({ error: 'Failed to fetch pending tasks' });
  }
}

module.exports = { getPendingTasks };
