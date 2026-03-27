const { google } = require('googleapis');
const jwt = require('jsonwebtoken');
const { encrypt, decrypt } = require('../utils/encryption');

function getOAuth2Client() {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  );
}

/**
 * Generate Google OAuth URL with state=JWT(userId)
 */
function getAuthUrl(userId) {
  const oauth2 = getOAuth2Client();
  const state = jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: '10m' });
  return oauth2.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    scope: [
      'https://www.googleapis.com/auth/calendar.readonly',
      'https://www.googleapis.com/auth/userinfo.email',
      'https://www.googleapis.com/auth/spreadsheets',
      'https://www.googleapis.com/auth/documents',
      'https://www.googleapis.com/auth/drive.readonly',
    ],
    state,
  });
}

/**
 * Handle OAuth callback: exchange code, get email, upsert integration
 */
async function handleCallback(prisma, code, state) {
  // Verify state JWT
  const { userId } = jwt.verify(state, process.env.JWT_SECRET);

  // Exchange code for tokens
  const oauth2 = getOAuth2Client();
  const { tokens } = await oauth2.getToken(code);
  oauth2.setCredentials(tokens);

  // Get Google email
  const people = google.oauth2({ version: 'v2', auth: oauth2 });
  const { data: profile } = await people.userinfo.get();
  const googleEmail = profile.email;

  // Encrypt tokens
  const encryptedAccess = encrypt(tokens.access_token);
  const encryptedRefresh = encrypt(tokens.refresh_token || '');

  // Upsert integration
  const integration = await prisma.calendarIntegration.upsert({
    where: {
      userId_provider_externalAccountId: {
        userId,
        provider: 'google',
        externalAccountId: googleEmail,
      },
    },
    update: {
      accessToken: encryptedAccess,
      refreshToken: encryptedRefresh,
      expiresAt: tokens.expiry_date ? new Date(tokens.expiry_date) : null,
    },
    create: {
      userId,
      provider: 'google',
      accessToken: encryptedAccess,
      refreshToken: encryptedRefresh,
      externalAccountId: googleEmail,
      expiresAt: tokens.expiry_date ? new Date(tokens.expiry_date) : null,
    },
  });

  return integration;
}

/**
 * Refresh tokens if expired and save back to DB
 */
async function refreshIfNeeded(prisma, integration) {
  if (!integration.expiresAt || new Date(integration.expiresAt) > new Date()) {
    return; // still valid
  }

  const oauth2 = getOAuth2Client();
  const refreshToken = decrypt(integration.refreshToken);
  if (!refreshToken) throw new Error('No refresh token available');

  oauth2.setCredentials({ refresh_token: refreshToken });
  const { credentials } = await oauth2.refreshAccessToken();

  const encryptedAccess = encrypt(credentials.access_token);
  await prisma.calendarIntegration.update({
    where: { id: integration.id },
    data: {
      accessToken: encryptedAccess,
      expiresAt: credentials.expiry_date ? new Date(credentials.expiry_date) : null,
    },
  });

  // Update in-memory reference so caller uses fresh token
  integration.accessToken = encryptedAccess;
  integration.expiresAt = credentials.expiry_date ? new Date(credentials.expiry_date) : null;
}

/**
 * Fetch events from all Google Calendar integrations for a user
 */
async function getEvents(prisma, userId, { timeMin, timeMax, search }) {
  const integrations = await prisma.calendarIntegration.findMany({
    where: { userId, provider: 'google' },
  });

  const allEvents = [];

  for (const integration of integrations) {
    try {
      await refreshIfNeeded(prisma, integration);

      const oauth2 = getOAuth2Client();
      oauth2.setCredentials({
        access_token: decrypt(integration.accessToken),
        refresh_token: decrypt(integration.refreshToken),
      });

      const calendar = google.calendar({ version: 'v3', auth: oauth2 });
      const params = {
        calendarId: integration.calendarId || 'primary',
        timeMin,
        timeMax,
        singleEvents: true,
        orderBy: 'startTime',
        maxResults: 100,
        q: search ? `DWY ${search}` : 'DWY',
      };

      const { data } = await calendar.events.list(params);

      const events = (data.items || []).map((evt) => ({
        id: evt.id,
        integrationId: integration.id,
        googleAccount: integration.externalAccountId,
        title: evt.summary || '(No title)',
        description: evt.description || '',
        start: evt.start?.dateTime || evt.start?.date,
        end: evt.end?.dateTime || evt.end?.date,
        location: evt.location || '',
        hangoutLink: evt.hangoutLink || null,
        htmlLink: evt.htmlLink || null,
        attendees: (evt.attendees || []).map((a) => ({
          email: a.email,
          name: a.displayName || a.email,
          status: a.responseStatus,
        })),
        status: evt.status,
      }));

      allEvents.push(...events);
    } catch (err) {
      console.error(`[Calendar] Error fetching events for integration ${integration.id}:`, err.message);
    }
  }

  // Sort by start time
  allEvents.sort((a, b) => new Date(a.start) - new Date(b.start));
  return allEvents;
}

/**
 * Disconnect: revoke token + delete from DB
 */
async function disconnect(prisma, userId, integrationId) {
  const integration = await prisma.calendarIntegration.findFirst({
    where: { id: integrationId, userId },
  });
  if (!integration) throw new Error('Integration not found');

  // Try to revoke the token at Google
  try {
    const oauth2 = getOAuth2Client();
    const accessToken = decrypt(integration.accessToken);
    await oauth2.revokeToken(accessToken);
  } catch (err) {
    console.warn('[Calendar] Token revocation failed (may already be revoked):', err.message);
  }

  await prisma.calendarIntegration.delete({ where: { id: integrationId } });
}

module.exports = { getAuthUrl, handleCallback, getEvents, disconnect };
