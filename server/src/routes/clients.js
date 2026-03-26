const { Router } = require('express');
const { list, getById, create, update, remove, getTwilioLastCall } = require('../controllers/clientController');
const authMiddleware = require('../middleware/authMiddleware');

const router = Router();

router.use(authMiddleware);

router.get('/', list);
router.get('/:id', getById);
router.get('/:id/twilio/last-call', getTwilioLastCall);
router.post('/', create);
router.put('/:id', update);
router.delete('/:id', remove);

module.exports = router;
