const googleCalendarService = require('../services/googleCalendarService');

/** GET /api/calendar/integrations */
async function getIntegrations(req, res) {
  try {
    const integrations = await req.prisma.calendarIntegration.findMany({
      where: { userId: req.user.id },
      select: {
        id: true,
        provider: true,
        externalAccountId: true,
        calendarId: true,
        createdAt: true,
      },
    });
    res.json({ integrations });
  } catch (err) {
    console.error('[Calendar] getIntegrations error:', err);
    res.status(500).json({ error: 'Failed to list integrations' });
  }
}

/** GET /api/calendar/auth/google */
function getGoogleAuthUrl(req, res) {
  try {
    const url = googleCalendarService.getAuthUrl(req.user.id);
    res.json({ url });
  } catch (err) {
    console.error('[Calendar] getAuthUrl error:', err);
    res.status(500).json({ error: 'Failed to generate auth URL' });
  }
}

/** GET /api/calendar/auth/google/callback (public — Google redirects here) */
async function googleCallback(req, res) {
  const { code, state, error } = req.query;
  const frontendBase = process.env.FRONTEND_URL || 'http://localhost:5173';

  if (error) {
    return res.redirect(`${frontendBase}/meetings?calendarError=${encodeURIComponent(error)}`);
  }

  try {
    await googleCalendarService.handleCallback(req.prisma, code, state);
    res.redirect(`${frontendBase}/meetings?calendarConnected=true`);
  } catch (err) {
    console.error('[Calendar] Google callback error:', err);
    res.redirect(`${frontendBase}/meetings?calendarError=${encodeURIComponent(err.message)}`);
  }
}

/** GET /api/calendar/events?timeMin=&timeMax=&search= */
async function getEvents(req, res) {
  try {
    const { timeMin, timeMax, search } = req.query;
    const events = await googleCalendarService.getEvents(req.prisma, req.user.id, {
      timeMin: timeMin || new Date().toISOString(),
      timeMax: timeMax || undefined,
      search: search || undefined,
    });
    res.json({ events });
  } catch (err) {
    console.error('[Calendar] getEvents error:', err);
    res.status(500).json({ error: 'Failed to fetch events' });
  }
}

/** DELETE /api/calendar/integrations/:id */
async function disconnectIntegration(req, res) {
  try {
    const integrationId = parseInt(req.params.id);
    await googleCalendarService.disconnect(req.prisma, req.user.id, integrationId);
    res.json({ ok: true });
  } catch (err) {
    console.error('[Calendar] disconnect error:', err);
    res.status(500).json({ error: err.message });
  }
}

module.exports = { getIntegrations, getGoogleAuthUrl, googleCallback, getEvents, disconnectIntegration };
