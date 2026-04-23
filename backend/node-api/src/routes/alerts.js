const express = require('express');
const router = express.Router();
const { getAlerts, getAlertById, updateAlertStatus, submitFeedback, getAlertStats } = require('../controllers/alertsController');
const { authMiddleware } = require('../middleware/auth');

router.get('/stats/summary', authMiddleware, getAlertStats);
router.get('/', authMiddleware, getAlerts);
router.get('/:id', authMiddleware, getAlertById);
router.put('/status', authMiddleware, updateAlertStatus);
router.post('/feedback', authMiddleware, submitFeedback);

module.exports = router;
