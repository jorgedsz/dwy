const https = require('https');

const VAPI_BASE = 'api.vapi.ai';

function vapiRequest(method, path, body) {
  const apiKey = process.env.VAPI_API_KEY;
  if (!apiKey) throw new Error('VAPI_API_KEY not set');

  return new Promise((resolve, reject) => {
    const options = {
      hostname: VAPI_BASE,
      path,
      method,
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      timeout: 15000,
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        if (res.statusCode >= 400) {
          const msg = `VAPI ${method} ${path} returned ${res.statusCode}: ${data}`;
          return reject(new Error(msg));
        }
        try {
          resolve(data ? JSON.parse(data) : null);
        } catch (e) {
          reject(new Error('Failed to parse VAPI response'));
        }
      });
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('VAPI request timed out')); });
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

// ── Credentials ──────────────────────────────────────────

async function addTwilioCredential(accountSid, authToken) {
  return vapiRequest('POST', '/credential', {
    provider: 'twilio',
    authToken,
    accountSid,
  });
}

async function addVonageCredential(apiKey, apiSecret) {
  return vapiRequest('POST', '/credential', {
    provider: 'vonage',
    apiKey,
    apiSecret,
  });
}

async function addTelnyxCredential(apiKey) {
  return vapiRequest('POST', '/credential', {
    provider: 'telnyx',
    apiKey,
  });
}

async function deleteVapiCredential(credentialId) {
  return vapiRequest('DELETE', `/credential/${credentialId}`);
}

// ── Phone Numbers ────────────────────────────────────────

async function importTwilioNumber({ number, twilioAccountSid, twilioAuthToken, name }) {
  return vapiRequest('POST', '/phone-number', {
    provider: 'twilio',
    number,
    twilioAccountSid,
    twilioAuthToken,
    name: name || number,
  });
}

async function importVonageNumber({ number, credentialId, name }) {
  return vapiRequest('POST', '/phone-number', {
    provider: 'vonage',
    number,
    credentialId,
    name: name || number,
  });
}

async function importTelnyxNumber({ number, credentialId, name }) {
  return vapiRequest('POST', '/phone-number', {
    provider: 'telnyx',
    number,
    credentialId,
    name: name || number,
  });
}

async function deletePhoneNumber(phoneNumberId) {
  return vapiRequest('DELETE', `/phone-number/${phoneNumberId}`);
}

async function updatePhoneNumber(phoneNumberId, data) {
  return vapiRequest('PATCH', `/phone-number/${phoneNumberId}`, data);
}

module.exports = {
  addTwilioCredential,
  addVonageCredential,
  addTelnyxCredential,
  deleteVapiCredential,
  importTwilioNumber,
  importVonageNumber,
  importTelnyxNumber,
  deletePhoneNumber,
  updatePhoneNumber,
};
