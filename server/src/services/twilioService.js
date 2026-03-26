const https = require('https');
const { decrypt } = require('../utils/encryption');

/**
 * Fetch the most recent call from Twilio for a given account.
 * Uses Node built-in https — no npm dependency needed.
 */
async function getLastCall(encryptedSid, encryptedAuthToken) {
  const accountSid = decrypt(encryptedSid);
  const authToken = decrypt(encryptedAuthToken);

  const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Calls.json?PageSize=1`;

  return new Promise((resolve, reject) => {
    const req = https.get(url, {
      auth: `${accountSid}:${authToken}`,
      timeout: 10000,
    }, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        if (res.statusCode === 401) {
          return reject(new Error('INVALID_CREDENTIALS'));
        }
        if (res.statusCode !== 200) {
          return reject(new Error(`Twilio API returned ${res.statusCode}`));
        }
        try {
          const json = JSON.parse(data);
          if (!json.calls || json.calls.length === 0) {
            return resolve(null);
          }
          const call = json.calls[0];
          resolve({
            lastCallDate: call.start_time || call.date_created,
            lastCallTo: call.to,
            lastCallFrom: call.from,
            lastCallStatus: call.status,
            lastCallDuration: call.duration,
          });
        } catch (e) {
          reject(new Error('Failed to parse Twilio response'));
        }
      });
    });

    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Twilio request timed out'));
    });
  });
}

module.exports = { getLastCall };
