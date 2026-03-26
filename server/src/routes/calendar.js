const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const {
  getIntegrations,
  getGoogleAuthUrl,
  googleCallback,
  getEvents,
  disconnectIntegration,
} = require('../controllers/calendarController');

// Public route — Google redirects here after OAuth consent
router.get('/auth/google/callback', googleCallback);

// All routes below require auth
router.use(authMiddleware);

router.get('/integrations', getIntegrations);
router.get('/auth/google', getGoogleAuthUrl);
router.get('/events', getEvents);
router.delete('/integrations/:id', disconnectIntegration);

module.exports = router;
