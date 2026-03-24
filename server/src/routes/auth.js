const { Router } = require('express');
const { register, login, me, listUsers } = require('../controllers/authController');
const authMiddleware = require('../middleware/authMiddleware');
const { authLimiter } = require('../middleware/rateLimiter');

const router = Router();

router.post('/register', authLimiter, register);
router.post('/login', authLimiter, login);
router.get('/me', authMiddleware, me);
router.get('/users', authMiddleware, listUsers);

module.exports = router;
