const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const {
  listAvailableNumbers,
  importPhoneNumber,
  listPhoneNumbers,
  assignToAgent,
  removePhoneNumber,
  retryVapi,
} = require('../controllers/phoneNumberController');

router.use(authMiddleware);

router.get('/', listPhoneNumbers);
router.post('/import', importPhoneNumber);
router.get('/available/:credentialId', listAvailableNumbers);
router.put('/:id/assign', assignToAgent);
router.delete('/:id', removePhoneNumber);
router.post('/:id/retry-vapi', retryVapi);

module.exports = router;
