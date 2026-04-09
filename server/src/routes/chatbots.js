const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const cc = require('../controllers/chatbotController');

router.get('/', authMiddleware, cc.listChatbots);
router.get('/:id', authMiddleware, cc.getChatbot);
router.post('/', authMiddleware, cc.createChatbot);
router.put('/:id', authMiddleware, cc.updateChatbot);
router.delete('/:id', authMiddleware, cc.deleteChatbot);

module.exports = router;
