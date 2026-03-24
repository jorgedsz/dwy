const { Router } = require('express');
const { listByClient, getById, create, update, remove, analyze } = require('../controllers/sessionController');
const authMiddleware = require('../middleware/authMiddleware');

const router = Router();

router.use(authMiddleware);

router.get('/client/:clientId', listByClient);
router.get('/:id', getById);
router.post('/', create);
router.put('/:id', update);
router.delete('/:id', remove);
router.post('/:id/analyze', analyze);

module.exports = router;
