const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const {
  saveCredentials,
  getCredentials,
  updateCredentials,
  deleteCredentials,
  verifyCredentials,
} = require('../controllers/telephonyController');

router.use(authMiddleware);

router.post('/credentials', saveCredentials);
router.get('/credentials', getCredentials);
router.put('/credentials/:id', updateCredentials);
router.delete('/credentials/:id', deleteCredentials);
router.post('/credentials/:id/verify', verifyCredentials);

module.exports = router;
