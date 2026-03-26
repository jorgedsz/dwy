const { PrismaClient } = require('@prisma/client');
const { encrypt, decrypt } = require('../utils/encryption');
const twilioService = require('../services/twilioService');

const prisma = new PrismaClient();

/** Strip raw encrypted Twilio fields, add hasTwilioCreds + twilioSidLast4 */
function sanitizeTwilioCreds(client) {
  if (!client) return client;
  const hasTwilioCreds = !!(client.twilioAccountSid && client.twilioAuthToken);
  let twilioSidLast4 = null;
  if (hasTwilioCreds) {
    try {
      const sid = decrypt(client.twilioAccountSid);
      twilioSidLast4 = sid.slice(-4);
    } catch (_) { /* ignore decrypt errors */ }
  }
  const { twilioAccountSid, twilioAuthToken, ...rest } = client;
  return { ...rest, hasTwilioCreds, twilioSidLast4 };
}

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
    res.json(clients.map(sanitizeTwilioCreds));
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
        waProjects: {
          select: {
            id: true,
            nombre: true,
            estado: true,
            whatsappChatId: true,
            totalMensajes: true,
            alertasCount: true,
            ultimaActividad: true,
            ultimoMensaje: true,
          },
        },
      },
    });
    if (!client) return res.status(404).json({ error: 'Client not found' });
    res.json(sanitizeTwilioCreds(client));
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
    const { name, email, phone, company, notes, startDate, contractedSessions, csUserIds, opsUserIds } = req.body;
    if (!name) return res.status(400).json({ error: 'Name is required' });

    const client = await prisma.client.create({
      data: {
        name, email, phone, company, notes,
        startDate: startDate ? new Date(startDate) : null,
        contractedSessions: contractedSessions != null ? parseInt(contractedSessions) : null,
      },
    });

    await syncAssignments(client.id, csUserIds || [], opsUserIds || []);

    const full = await prisma.client.findUnique({
      where: { id: client.id },
      include: assignmentInclude,
    });
    res.status(201).json(sanitizeTwilioCreds(full));
  } catch (err) {
    console.error('Create client error:', err);
    res.status(500).json({ error: 'Failed to create client' });
  }
}

async function update(req, res) {
  try {
    const { name, email, phone, company, notes, startDate, contractedSessions, csUserIds, opsUserIds, twilioAccountSid, twilioAuthToken } = req.body;
    const id = parseInt(req.params.id);

    const data = { name, email, phone, company, notes };
    if (startDate !== undefined) data.startDate = startDate ? new Date(startDate) : null;
    if (contractedSessions !== undefined) data.contractedSessions = contractedSessions != null ? parseInt(contractedSessions) : null;

    // Handle Twilio credentials: encrypt if provided, null if empty string (disconnect)
    if (twilioAccountSid !== undefined) {
      data.twilioAccountSid = twilioAccountSid ? encrypt(twilioAccountSid) : null;
    }
    if (twilioAuthToken !== undefined) {
      data.twilioAuthToken = twilioAuthToken ? encrypt(twilioAuthToken) : null;
    }

    await prisma.client.update({ where: { id }, data });

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
    res.json(sanitizeTwilioCreds(full));
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

async function getTwilioLastCall(req, res) {
  try {
    const client = await prisma.client.findUnique({
      where: { id: parseInt(req.params.id) },
      select: { twilioAccountSid: true, twilioAuthToken: true },
    });
    if (!client) return res.status(404).json({ error: 'Client not found' });
    if (!client.twilioAccountSid || !client.twilioAuthToken) {
      return res.status(400).json({ error: 'No Twilio credentials configured' });
    }

    const lastCall = await twilioService.getLastCall(client.twilioAccountSid, client.twilioAuthToken);
    res.json({ lastCall });
  } catch (err) {
    if (err.message === 'INVALID_CREDENTIALS') {
      return res.status(401).json({ error: 'Invalid Twilio credentials' });
    }
    console.error('Twilio last call error:', err);
    res.status(500).json({ error: 'Failed to fetch Twilio data' });
  }
}

module.exports = { list, getById, create, update, remove, getTwilioLastCall };
