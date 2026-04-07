const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const ac = require('../controllers/agentController');

router.get('/', authMiddleware, ac.listAgents);
router.get('/:id', authMiddleware, ac.getAgent);
router.post('/', authMiddleware, ac.createAgent);
router.put('/:id', authMiddleware, ac.updateAgent);
router.post('/:id/duplicate', authMiddleware, ac.duplicateAgent);
router.delete('/:id', authMiddleware, ac.deleteAgent);

module.exports = router;
