const { Router } = require('express');
const { getPendingTasks, getStats } = require('../controllers/dashboardController');
const authMiddleware = require('../middleware/authMiddleware');

const router = Router();

router.use(authMiddleware);

router.get('/pending-tasks', getPendingTasks);
router.get('/stats', getStats);

module.exports = router;
