const { Router } = require('express');
const { listByClient, getById, create, update, remove, analyze, analyzeAll, testAi, clientAnalysis, toggleTask } = require('../controllers/sessionController');
const authMiddleware = require('../middleware/authMiddleware');

const router = Router();

router.use(authMiddleware);

router.get('/test-ai', testAi);
router.get('/client/:clientId', listByClient);
router.post('/client/:clientId/analysis', clientAnalysis);
router.get('/:id', getById);
router.post('/', create);
router.put('/:id', update);
router.delete('/:id', remove);
router.post('/analyze-all', analyzeAll);
router.patch('/tasks/:taskId/toggle', toggleTask);
router.post('/:id/analyze', analyze);

module.exports = router;
