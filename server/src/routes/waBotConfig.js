const { Router } = require('express');
const authMiddleware = require('../middleware/authMiddleware');
const bc = require('../controllers/botConfigController');

const router = Router();
router.use(authMiddleware);

router.get('/', bc.getConfig);
router.put('/', bc.updateConfig);

module.exports = router;
