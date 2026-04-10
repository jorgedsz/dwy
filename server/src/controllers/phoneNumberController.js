const { decrypt } = require('../utils/encryption');
const vapiService = require('../services/vapiService');

// ── List available numbers from provider ─────────────────

const listAvailableNumbers = async (req, res) => {
  try {
    const credentialId = parseInt(req.params.credentialId);
    const credential = await req.prisma.telephonyCredential.findUnique({ where: { id: credentialId } });
    if (!credential) return res.status(404).json({ error: 'Credential not found' });
    if (credential.userId !== req.user.id) return res.status(403).json({ error: 'Not authorized' });

    let numbers = [];

    if (credential.provider === 'twilio') {
      const sid = decrypt(credential.accountSid);
      const token = decrypt(credential.authToken);
      numbers = await listTwilioNumbers(sid, token);
    } else if (credential.provider === 'vonage') {
      const vonageService = require('../services/vonageService');
      const key = decrypt(credential.apiKey);
      const secret = decrypt(credential.apiSecret);
      numbers = await vonageService.listPhoneNumbers(key, secret);
    } else if (credential.provider === 'telnyx') {
      const telnyxService = require('../services/telnyxService');
      const key = decrypt(credential.telnyxApiKey);
      numbers = await telnyxService.listPhoneNumbers(key);
    }

    // Mark which numbers are already imported
    const imported = await req.prisma.phoneNumber.findMany({
      where: { telephonyCredentialId: credentialId },
      select: { providerPhoneId: true },
    });
    const importedIds = new Set(imported.map((p) => p.providerPhoneId));

    const result = numbers.map((n) => ({
      ...n,
      imported: importedIds.has(n.providerId),
    }));

    res.json(result);
  } catch (error) {
    console.error('[PhoneNumber] listAvailable error:', error);
    res.status(500).json({ error: 'Failed to list numbers' });
  }
};

// ── Import a phone number (register with VAPI) ──────────

const importPhoneNumber = async (req, res) => {
  try {
    const { credentialId, phoneNumber, friendlyName, providerId } = req.body;
    if (!credentialId || !phoneNumber) {
      return res.status(400).json({ error: 'credentialId and phoneNumber are required' });
    }

    const credential = await req.prisma.telephonyCredential.findUnique({ where: { id: credentialId } });
    if (!credential) return res.status(404).json({ error: 'Credential not found' });
    if (credential.userId !== req.user.id) return res.status(403).json({ error: 'Not authorized' });

    // Import to VAPI
    let vapiResult;
    try {
      if (credential.provider === 'twilio') {
        const sid = decrypt(credential.accountSid);
        const token = decrypt(credential.authToken);
        vapiResult = await vapiService.importTwilioNumber({
          number: phoneNumber,
          twilioAccountSid: sid,
          twilioAuthToken: token,
          name: friendlyName || phoneNumber,
        });
      } else if (credential.provider === 'vonage') {
        vapiResult = await vapiService.importVonageNumber({
          number: phoneNumber,
          credentialId: credential.vapiCredentialId,
          name: friendlyName || phoneNumber,
        });
      } else if (credential.provider === 'telnyx') {
        vapiResult = await vapiService.importTelnyxNumber({
          number: phoneNumber,
          credentialId: credential.vapiCredentialId,
          name: friendlyName || phoneNumber,
        });
      }
    } catch (e) {
      console.error('[PhoneNumber] VAPI import error:', e.message);
      // Still save locally, mark as failed
    }

    const record = await req.prisma.phoneNumber.create({
      data: {
        phoneNumber,
        friendlyName: friendlyName || null,
        provider: credential.provider,
        providerPhoneId: providerId || null,
        vapiPhoneNumberId: vapiResult?.id || null,
        status: vapiResult?.id ? 'active' : 'failed',
        telephonyCredentialId: credentialId,
      },
    });

    res.status(201).json(record);
  } catch (error) {
    console.error('[PhoneNumber] import error:', error);
    res.status(500).json({ error: 'Failed to import phone number' });
  }
};

// ── List user's imported phone numbers ───────────────────

const listPhoneNumbers = async (req, res) => {
  try {
    const numbers = await req.prisma.phoneNumber.findMany({
      where: { telephonyCredential: { userId: req.user.id } },
      include: {
        agent: { select: { id: true, name: true } },
        telephonyCredential: { select: { id: true, provider: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json(numbers);
  } catch (error) {
    console.error('[PhoneNumber] list error:', error);
    res.status(500).json({ error: 'Failed to list phone numbers' });
  }
};

// ── Assign phone number to agent ─────────────────────────

const assignToAgent = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { agentId } = req.body;

    const phoneNumber = await req.prisma.phoneNumber.findUnique({
      where: { id },
      include: { telephonyCredential: true },
    });
    if (!phoneNumber) return res.status(404).json({ error: 'Phone number not found' });
    if (phoneNumber.telephonyCredential.userId !== req.user.id) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    // Verify agent belongs to user
    if (agentId) {
      const agent = await req.prisma.agent.findUnique({ where: { id: agentId } });
      if (!agent || agent.userId !== req.user.id) {
        return res.status(403).json({ error: 'Agent not found or not authorized' });
      }
    }

    // Update VAPI phone number with assistant
    if (phoneNumber.vapiPhoneNumberId) {
      try {
        const updateData = agentId
          ? { assistantId: null, serverUrl: null, name: phoneNumber.friendlyName || phoneNumber.phoneNumber }
          : { assistantId: null, name: phoneNumber.friendlyName || phoneNumber.phoneNumber };
        await vapiService.updatePhoneNumber(phoneNumber.vapiPhoneNumberId, updateData);
      } catch (e) {
        console.error('[PhoneNumber] VAPI assign error:', e.message);
      }
    }

    const updated = await req.prisma.phoneNumber.update({
      where: { id },
      data: { agentId: agentId || null },
      include: { agent: { select: { id: true, name: true } } },
    });

    res.json(updated);
  } catch (error) {
    console.error('[PhoneNumber] assign error:', error);
    res.status(500).json({ error: 'Failed to assign phone number' });
  }
};

// ── Remove phone number ──────────────────────────────────

const removePhoneNumber = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const phoneNumber = await req.prisma.phoneNumber.findUnique({
      where: { id },
      include: { telephonyCredential: true },
    });
    if (!phoneNumber) return res.status(404).json({ error: 'Phone number not found' });
    if (phoneNumber.telephonyCredential.userId !== req.user.id) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    // Remove from VAPI
    if (phoneNumber.vapiPhoneNumberId) {
      await vapiService.deletePhoneNumber(phoneNumber.vapiPhoneNumberId).catch(() => {});
    }

    await req.prisma.phoneNumber.delete({ where: { id } });
    res.json({ ok: true });
  } catch (error) {
    console.error('[PhoneNumber] remove error:', error);
    res.status(500).json({ error: 'Failed to remove phone number' });
  }
};

// ── Retry VAPI import ────────────────────────────────────

const retryVapi = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const phoneNumber = await req.prisma.phoneNumber.findUnique({
      where: { id },
      include: { telephonyCredential: true },
    });
    if (!phoneNumber) return res.status(404).json({ error: 'Phone number not found' });
    if (phoneNumber.telephonyCredential.userId !== req.user.id) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    const cred = phoneNumber.telephonyCredential;
    let vapiResult;

    if (cred.provider === 'twilio') {
      const sid = decrypt(cred.accountSid);
      const token = decrypt(cred.authToken);
      vapiResult = await vapiService.importTwilioNumber({
        number: phoneNumber.phoneNumber,
        twilioAccountSid: sid,
        twilioAuthToken: token,
        name: phoneNumber.friendlyName || phoneNumber.phoneNumber,
      });
    } else if (cred.provider === 'vonage') {
      vapiResult = await vapiService.importVonageNumber({
        number: phoneNumber.phoneNumber,
        credentialId: cred.vapiCredentialId,
        name: phoneNumber.friendlyName || phoneNumber.phoneNumber,
      });
    } else if (cred.provider === 'telnyx') {
      vapiResult = await vapiService.importTelnyxNumber({
        number: phoneNumber.phoneNumber,
        credentialId: cred.vapiCredentialId,
        name: phoneNumber.friendlyName || phoneNumber.phoneNumber,
      });
    }

    const updated = await req.prisma.phoneNumber.update({
      where: { id },
      data: {
        vapiPhoneNumberId: vapiResult?.id || null,
        status: vapiResult?.id ? 'active' : 'failed',
      },
    });

    res.json(updated);
  } catch (error) {
    console.error('[PhoneNumber] retryVapi error:', error);
    res.status(500).json({ error: 'Failed to retry VAPI import' });
  }
};

// ── Helpers ──────────────────────────────────────────────

function listTwilioNumbers(accountSid, authToken) {
  return new Promise((resolve, reject) => {
    const https = require('https');
    const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/IncomingPhoneNumbers.json?PageSize=100`;
    const req = https.get(url, { auth: `${accountSid}:${authToken}`, timeout: 10000 }, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        if (res.statusCode === 401) return reject(new Error('INVALID_CREDENTIALS'));
        if (res.statusCode !== 200) return reject(new Error(`Twilio API returned ${res.statusCode}`));
        try {
          const json = JSON.parse(data);
          resolve((json.incoming_phone_numbers || []).map((n) => ({
            phoneNumber: n.phone_number,
            friendlyName: n.friendly_name,
            providerId: n.sid,
          })));
        } catch (e) {
          reject(new Error('Failed to parse Twilio response'));
        }
      });
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('Twilio request timed out')); });
  });
}

module.exports = {
  listAvailableNumbers,
  importPhoneNumber,
  listPhoneNumbers,
  assignToAgent,
  removePhoneNumber,
  retryVapi,
};
