const { encrypt, decrypt } = require('../utils/encryption');
const twilioService = require('../services/twilioService');
const vonageService = require('../services/vonageService');
const telnyxService = require('../services/telnyxService');
const vapiService = require('../services/vapiService');

const VALID_PROVIDERS = ['twilio', 'vonage', 'telnyx'];

// ── Save credentials ─────────────────────────────────────

const saveCredentials = async (req, res) => {
  try {
    const { provider, accountSid, authToken, apiKey, apiSecret, telnyxApiKey } = req.body;
    if (!VALID_PROVIDERS.includes(provider)) {
      return res.status(400).json({ error: 'Invalid provider. Must be twilio, vonage, or telnyx' });
    }

    const data = { provider, userId: req.user.id };

    if (provider === 'twilio') {
      if (!accountSid || !authToken) return res.status(400).json({ error: 'accountSid and authToken are required' });
      data.accountSid = encrypt(accountSid);
      data.authToken = encrypt(authToken);
    } else if (provider === 'vonage') {
      if (!apiKey || !apiSecret) return res.status(400).json({ error: 'apiKey and apiSecret are required' });
      data.apiKey = encrypt(apiKey);
      data.apiSecret = encrypt(apiSecret);
      // Register credential with VAPI
      try {
        const vapiCred = await vapiService.addVonageCredential(apiKey, apiSecret);
        data.vapiCredentialId = vapiCred.id;
      } catch (e) {
        console.error('[Telephony] VAPI vonage credential error:', e.message);
      }
    } else if (provider === 'telnyx') {
      if (!telnyxApiKey) return res.status(400).json({ error: 'telnyxApiKey is required' });
      data.telnyxApiKey = encrypt(telnyxApiKey);
      // Register credential with VAPI
      try {
        const vapiCred = await vapiService.addTelnyxCredential(telnyxApiKey);
        data.vapiCredentialId = vapiCred.id;
      } catch (e) {
        console.error('[Telephony] VAPI telnyx credential error:', e.message);
      }
    }

    const credential = await req.prisma.telephonyCredential.upsert({
      where: { userId_provider: { userId: req.user.id, provider } },
      create: data,
      update: data,
    });

    res.json(maskCredential(credential));
  } catch (error) {
    console.error('[Telephony] saveCredentials error:', error);
    res.status(500).json({ error: 'Failed to save credentials' });
  }
};

// ── Get all credentials ──────────────────────────────────

const getCredentials = async (req, res) => {
  try {
    const credentials = await req.prisma.telephonyCredential.findMany({
      where: { userId: req.user.id },
      include: { _count: { select: { phoneNumbers: true } } },
    });
    res.json(credentials.map(maskCredential));
  } catch (error) {
    console.error('[Telephony] getCredentials error:', error);
    res.status(500).json({ error: 'Failed to get credentials' });
  }
};

// ── Update credentials ───────────────────────────────────

const updateCredentials = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const existing = await req.prisma.telephonyCredential.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ error: 'Credential not found' });
    if (existing.userId !== req.user.id) return res.status(403).json({ error: 'Not authorized' });

    const { accountSid, authToken, apiKey, apiSecret, telnyxApiKey } = req.body;
    const data = {};

    if (existing.provider === 'twilio') {
      if (accountSid) data.accountSid = encrypt(accountSid);
      if (authToken) data.authToken = encrypt(authToken);
    } else if (existing.provider === 'vonage') {
      if (apiKey) data.apiKey = encrypt(apiKey);
      if (apiSecret) data.apiSecret = encrypt(apiSecret);
      // Re-register with VAPI if both fields updated
      if (apiKey && apiSecret) {
        try {
          if (existing.vapiCredentialId) await vapiService.deleteVapiCredential(existing.vapiCredentialId).catch(() => {});
          const vapiCred = await vapiService.addVonageCredential(apiKey, apiSecret);
          data.vapiCredentialId = vapiCred.id;
        } catch (e) {
          console.error('[Telephony] VAPI vonage update error:', e.message);
        }
      }
    } else if (existing.provider === 'telnyx') {
      if (telnyxApiKey) {
        data.telnyxApiKey = encrypt(telnyxApiKey);
        try {
          if (existing.vapiCredentialId) await vapiService.deleteVapiCredential(existing.vapiCredentialId).catch(() => {});
          const vapiCred = await vapiService.addTelnyxCredential(telnyxApiKey);
          data.vapiCredentialId = vapiCred.id;
        } catch (e) {
          console.error('[Telephony] VAPI telnyx update error:', e.message);
        }
      }
    }

    data.isVerified = false; // Reset verification on credential change

    const credential = await req.prisma.telephonyCredential.update({ where: { id }, data });
    res.json(maskCredential(credential));
  } catch (error) {
    console.error('[Telephony] updateCredentials error:', error);
    res.status(500).json({ error: 'Failed to update credentials' });
  }
};

// ── Delete credentials ───────────────────────────────────

const deleteCredentials = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const existing = await req.prisma.telephonyCredential.findUnique({
      where: { id },
      include: { phoneNumbers: true },
    });
    if (!existing) return res.status(404).json({ error: 'Credential not found' });
    if (existing.userId !== req.user.id) return res.status(403).json({ error: 'Not authorized' });

    // Clean up VAPI resources
    for (const pn of existing.phoneNumbers) {
      if (pn.vapiPhoneNumberId) {
        await vapiService.deletePhoneNumber(pn.vapiPhoneNumberId).catch(() => {});
      }
    }
    if (existing.vapiCredentialId) {
      await vapiService.deleteVapiCredential(existing.vapiCredentialId).catch(() => {});
    }

    await req.prisma.telephonyCredential.delete({ where: { id } });
    res.json({ ok: true });
  } catch (error) {
    console.error('[Telephony] deleteCredentials error:', error);
    res.status(500).json({ error: 'Failed to delete credentials' });
  }
};

// ── Verify credentials ──────────────────────────────────

const verifyCredentials = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const credential = await req.prisma.telephonyCredential.findUnique({ where: { id } });
    if (!credential) return res.status(404).json({ error: 'Credential not found' });
    if (credential.userId !== req.user.id) return res.status(403).json({ error: 'Not authorized' });

    let numbers = [];

    if (credential.provider === 'twilio') {
      const sid = decrypt(credential.accountSid);
      const token = decrypt(credential.authToken);
      // Verify by listing numbers (also serves as credential check)
      numbers = await listTwilioNumbers(sid, token);
    } else if (credential.provider === 'vonage') {
      const key = decrypt(credential.apiKey);
      const secret = decrypt(credential.apiSecret);
      await vonageService.verifyCredentials(key, secret);
      numbers = await vonageService.listPhoneNumbers(key, secret);
    } else if (credential.provider === 'telnyx') {
      const key = decrypt(credential.telnyxApiKey);
      await telnyxService.verifyCredentials(key);
      numbers = await telnyxService.listPhoneNumbers(key);
    }

    await req.prisma.telephonyCredential.update({ where: { id }, data: { isVerified: true } });

    res.json({ verified: true, availableNumbers: numbers });
  } catch (error) {
    if (error.message === 'INVALID_CREDENTIALS') {
      await req.prisma.telephonyCredential.update({
        where: { id: parseInt(req.params.id) },
        data: { isVerified: false },
      });
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    console.error('[Telephony] verifyCredentials error:', error);
    res.status(500).json({ error: 'Failed to verify credentials' });
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
          const numbers = (json.incoming_phone_numbers || []).map((n) => ({
            phoneNumber: n.phone_number,
            friendlyName: n.friendly_name,
            providerId: n.sid,
          }));
          resolve(numbers);
        } catch (e) {
          reject(new Error('Failed to parse Twilio response'));
        }
      });
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('Twilio request timed out')); });
  });
}

function maskCredential(cred) {
  const masked = {
    id: cred.id,
    provider: cred.provider,
    isVerified: cred.isVerified,
    vapiCredentialId: cred.vapiCredentialId,
    createdAt: cred.createdAt,
    updatedAt: cred.updatedAt,
    phoneNumberCount: cred._count?.phoneNumbers ?? undefined,
  };

  if (cred.provider === 'twilio' && cred.accountSid) {
    try { masked.accountSidLast4 = decrypt(cred.accountSid).slice(-4); } catch {}
    masked.hasAuthToken = !!cred.authToken;
  } else if (cred.provider === 'vonage' && cred.apiKey) {
    try { masked.apiKeyLast4 = decrypt(cred.apiKey).slice(-4); } catch {}
    masked.hasApiSecret = !!cred.apiSecret;
  } else if (cred.provider === 'telnyx' && cred.telnyxApiKey) {
    try { masked.apiKeyLast4 = decrypt(cred.telnyxApiKey).slice(-4); } catch {}
  }

  return masked;
}

module.exports = { saveCredentials, getCredentials, updateCredentials, deleteCredentials, verifyCredentials };
