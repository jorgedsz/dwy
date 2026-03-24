const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

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
      include: { _count: { select: { sessions: true } } },
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
      },
    });
    if (!client) return res.status(404).json({ error: 'Client not found' });
    res.json(client);
  } catch (err) {
    console.error('Get client error:', err);
    res.status(500).json({ error: 'Failed to fetch client' });
  }
}

async function create(req, res) {
  try {
    const { name, email, phone, company, notes } = req.body;
    if (!name) return res.status(400).json({ error: 'Name is required' });

    const client = await prisma.client.create({
      data: { name, email, phone, company, notes },
    });
    res.status(201).json(client);
  } catch (err) {
    console.error('Create client error:', err);
    res.status(500).json({ error: 'Failed to create client' });
  }
}

async function update(req, res) {
  try {
    const { name, email, phone, company, notes } = req.body;
    const client = await prisma.client.update({
      where: { id: parseInt(req.params.id) },
      data: { name, email, phone, company, notes },
    });
    res.json(client);
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
