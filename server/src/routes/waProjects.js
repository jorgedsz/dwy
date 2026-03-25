const { Router } = require('express');
const authMiddleware = require('../middleware/authMiddleware');
const pc = require('../controllers/projectController');

const router = Router();
router.use(authMiddleware);

router.get('/', pc.listProjects);
router.get('/stats', pc.getProjectStats);
router.get('/:id', pc.getProject);
router.put('/:id', pc.updateProject);
router.get('/:id/messages', pc.getProjectMessages);
router.get('/:id/alerts', pc.getProjectAlerts);
router.post('/:id/chat', pc.chatWithPMAgent);

module.exports = router;
