const pool = require('../config/database');

// GET /api/alerts
async function getAlerts(req, res) {
  try {
    const { severity, status, attack_category, limit = 50, offset = 0 } = req.query;
    let query = 'SELECT * FROM alerts WHERE 1=1';
    const params = [];
    if (severity) { params.push(severity); query += ` AND severity = $${params.length}`; }
    if (status) { params.push(status); query += ` AND status = $${params.length}`; }
    if (attack_category) { params.push(attack_category); query += ` AND attack_category = $${params.length}`; }
    params.push(parseInt(limit)); query += ` ORDER BY timestamp DESC LIMIT $${params.length}`;
    params.push(parseInt(offset)); query += ` OFFSET $${params.length}`;
    const result = await pool.query(query, params);
    const countResult = await pool.query('SELECT COUNT(*) FROM alerts');
    res.json({ success: true, total: parseInt(countResult.rows[0].count), alerts: result.rows });
  } catch (err) {
    console.error('Get alerts error:', err);
    res.status(500).json({ success: false, message: 'Failed to retrieve alerts.' });
  }
}

// GET /api/alerts/:id
async function getAlertById(req, res) {
  try {
    const { id } = req.params;
    const alertResult = await pool.query('SELECT * FROM alerts WHERE id = $1', [id]);
    if (alertResult.rows.length === 0) return res.status(404).json({ success: false, message: 'Alert not found.' });
    const alert = alertResult.rows[0];
    // Get related log
    let relatedLog = null;
    if (alert.log_id) {
      const logResult = await pool.query('SELECT * FROM security_logs WHERE id = $1', [alert.log_id]);
      relatedLog = logResult.rows[0] || null;
    }
    // Get feedback
    const feedbackResult = await pool.query(
      `SELECT af.*, u.name as analyst_name FROM analyst_feedback af
       JOIN users u ON af.analyst_id = u.id WHERE af.alert_id = $1 ORDER BY af.timestamp DESC`, [id]
    );
    res.json({ success: true, alert, relatedLog, feedback: feedbackResult.rows });
  } catch (err) {
    console.error('Get alert by id error:', err);
    res.status(500).json({ success: false, message: 'Failed to retrieve alert.' });
  }
}

// PUT /api/alerts/status
async function updateAlertStatus(req, res) {
  try {
    const { id, status, analyst_notes } = req.body;
    if (!id || !status) return res.status(400).json({ success: false, message: 'Alert ID and status required.' });
    if (!['open', 'investigating', 'resolved'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status. Must be open, investigating, or resolved.' });
    }
    const result = await pool.query(
      'UPDATE alerts SET status = $1, analyst_notes = $2 WHERE id = $3 RETURNING *',
      [status, analyst_notes || null, id]
    );
    if (result.rows.length === 0) return res.status(404).json({ success: false, message: 'Alert not found.' });
    // Emit real-time update
    if (req.app.get('io')) {
      req.app.get('io').emit('alert_updated', result.rows[0]);
    }
    res.json({ success: true, message: 'Alert status updated.', alert: result.rows[0] });
  } catch (err) {
    console.error('Update alert status error:', err);
    res.status(500).json({ success: false, message: 'Failed to update alert status.' });
  }
}

// POST /api/alerts/feedback
async function submitFeedback(req, res) {
  try {
    const { alert_id, feedback_type, notes } = req.body;
    if (!alert_id || !feedback_type) return res.status(400).json({ success: false, message: 'alert_id and feedback_type required.' });
    if (!['true_positive', 'false_positive'].includes(feedback_type)) {
      return res.status(400).json({ success: false, message: 'Invalid feedback_type.' });
    }
    const result = await pool.query(
      'INSERT INTO analyst_feedback (alert_id, analyst_id, feedback_type, notes) VALUES ($1, $2, $3, $4) RETURNING *',
      [alert_id, req.user.id, feedback_type, notes || null]
    );
    res.status(201).json({ success: true, feedback: result.rows[0] });
  } catch (err) {
    console.error('Submit feedback error:', err);
    res.status(500).json({ success: false, message: 'Failed to submit feedback.' });
  }
}

// GET /api/alerts/stats/summary
async function getAlertStats(req, res) {
  try {
    const summary = await pool.query(`
      SELECT 
        COUNT(*) as total_alerts,
        COUNT(*) FILTER (WHERE severity = 'critical') as critical_alerts,
        COUNT(*) FILTER (WHERE severity = 'high') as high_alerts,
        COUNT(*) FILTER (WHERE severity = 'medium') as medium_alerts,
        COUNT(*) FILTER (WHERE status = 'resolved') as resolved_alerts,
        COUNT(*) FILTER (WHERE status = 'open') as open_alerts,
        COUNT(*) FILTER (WHERE status = 'investigating') as investigating_alerts
      FROM alerts
    `);
    const byType = await pool.query(`
      SELECT attack_category, COUNT(*) as count FROM alerts
      GROUP BY attack_category ORDER BY count DESC
    `);
    const hourly = await pool.query(`
      SELECT DATE_TRUNC('hour', timestamp) as hour, COUNT(*) as count
      FROM alerts WHERE timestamp >= NOW() - INTERVAL '24 hours'
      GROUP BY hour ORDER BY hour
    `);
    const recent = await pool.query(`SELECT * FROM alerts ORDER BY timestamp DESC LIMIT 10`);
    res.json({ success: true, summary: summary.rows[0], byType: byType.rows, hourly: hourly.rows, recent: recent.rows });
  } catch (err) {
    console.error('Alert stats error:', err);
    res.status(500).json({ success: false, message: 'Failed to retrieve stats.' });
  }
}

module.exports = { getAlerts, getAlertById, updateAlertStatus, submitFeedback, getAlertStats };
