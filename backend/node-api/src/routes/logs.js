const express = require('express');
const router = express.Router();
const { getLogs, createLog, getLogStats } = require('../controllers/logsController');
const { authMiddleware } = require('../middleware/auth');

router.get('/stats', authMiddleware, getLogStats);
router.get('/', authMiddleware, getLogs);
router.post('/', authMiddleware, createLog);

module.exports = router;
