const { Router } = require('express');
const authMiddleware = require('../middleware/authMiddleware');
const ac = require('../controllers/alertController');

const router = Router();
router.use(authMiddleware);

router.get('/', ac.listAlerts);
router.patch('/:id/resolve', ac.resolveAlert);
router.patch('/project/:projectId/resolve-all', ac.resolveAllForProject);

module.exports = router;
