const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const assignmentInclude = {
  assignments: {
    include: { user: { select: { id: true, name: true, email: true } } },
    orderBy: { id: 'asc' },
  },
};

async function list(req, res) {
  try {
    const { search } = req.query;
    const where = search
      ? {
          OR: [
            { name: { contains: search, mode: 'insensitive' } },
            { email: { contains: search, mode: 'insensitive' } },
            { company: { contains: search, mode: 'insensitive' } },
          ],
        }
      : {};

    const clients = await prisma.client.findMany({
      where,
      include: {
        _count: { select: { sessions: true } },
        ...assignmentInclude,
      },
      orderBy: { updatedAt: 'desc' },
    });
    res.json(clients);
  } catch (err) {
    console.error('List clients error:', err);
    res.status(500).json({ error: 'Failed to fetch clients' });
  }
}

async function getById(req, res) {
  try {
    const client = await prisma.client.findUnique({
      where: { id: parseInt(req.params.id) },
      include: {
        sessions: { orderBy: { date: 'desc' } },
        ...assignmentInclude,
      },
    });
    if (!client) return res.status(404).json({ error: 'Client not found' });
    res.json(client);
  } catch (err) {
    console.error('Get client error:', err);
    res.status(500).json({ error: 'Failed to fetch client' });
  }
}

async function syncAssignments(clientId, csUserIds, opsUserIds) {
  // Delete all existing assignments for this client
  await prisma.clientAssignment.deleteMany({ where: { clientId } });

  const records = [];
  if (csUserIds) {
    for (const uid of csUserIds) {
      records.push({ clientId, userId: parseInt(uid), role: 'cs' });
    }
  }
  if (opsUserIds) {
    for (const uid of opsUserIds) {
      records.push({ clientId, userId: parseInt(uid), role: 'ops' });
    }
  }
  if (records.length > 0) {
    await prisma.clientAssignment.createMany({ data: records });
  }
}

async function create(req, res) {
  try {
    const { name, email, phone, company, notes, csUserIds, opsUserIds } = req.body;
    if (!name) return res.status(400).json({ error: 'Name is required' });

    const client = await prisma.client.create({
      data: { name, email, phone, company, notes },
    });

    await syncAssignments(client.id, csUserIds || [], opsUserIds || []);

    const full = await prisma.client.findUnique({
      where: { id: client.id },
      include: assignmentInclude,
    });
    res.status(201).json(full);
  } catch (err) {
    console.error('Create client error:', err);
    res.status(500).json({ error: 'Failed to create client' });
  }
}

async function update(req, res) {
  try {
    const { name, email, phone, company, notes, csUserIds, opsUserIds } = req.body;
    const id = parseInt(req.params.id);

    await prisma.client.update({
      where: { id },
      data: { name, email, phone, company, notes },
    });

    if (csUserIds !== undefined || opsUserIds !== undefined) {
      // Fetch current assignments if only one role is being updated
      const current = await prisma.clientAssignment.findMany({ where: { clientId: id } });
      const currentCs = current.filter((a) => a.role === 'cs').map((a) => a.userId);
      const currentOps = current.filter((a) => a.role === 'ops').map((a) => a.userId);

      await syncAssignments(
        id,
        csUserIds !== undefined ? csUserIds : currentCs,
        opsUserIds !== undefined ? opsUserIds : currentOps
      );
    }

    const full = await prisma.client.findUnique({
      where: { id },
      include: { ...assignmentInclude, sessions: { orderBy: { date: 'desc' } } },
    });
    res.json(full);
  } catch (err) {
    console.error('Update client error:', err);
    res.status(500).json({ error: 'Failed to update client' });
  }
}

async function remove(req, res) {
  try {
    await prisma.client.delete({ where: { id: parseInt(req.params.id) } });
    res.json({ message: 'Client deleted' });
  } catch (err) {
    console.error('Delete client error:', err);
    res.status(500).json({ error: 'Failed to delete client' });
  }
}

module.exports = { list, getById, create, update, remove };
