const { Router } = require('express');
const { getPendingTasks } = require('../controllers/dashboardController');
const authMiddleware = require('../middleware/authMiddleware');

const router = Router();

router.use(authMiddleware);

router.get('/pending-tasks', getPendingTasks);

module.exports = router;
