const pool = require('../config/database');
const axios = require('axios');

const ML_SERVICE_URL = process.env.ML_SERVICE_URL || 'http://localhost:5001';

const ATTACK_SEVERITY = {
  'Brute Force': 'high',
  'DDoS': 'critical',
  'Malware': 'critical',
  'Data Exfiltration': 'critical',
  'Port Scan': 'medium',
  'Phishing': 'high',
  'Normal': 'none',
};

function buildHeuristicDetection({
  source_ip,
  destination_ip,
  source_port,
  destination_port,
  protocol,
  packet_size,
  duration,
  failed_login_attempts,
  login_success,
  country,
}) {
  let threatType = 'Normal';
  let probability = 0;

  if (protocol === 'SSH' && destination_port === 22 && failed_login_attempts >= 40 && login_success === 0) {
    threatType = 'Brute Force';
    probability = 0.98;
  } else if (protocol === 'TCP' && packet_size >= 1400 && duration <= 0.01 && [80, 443].includes(destination_port)) {
    threatType = 'DDoS';
    probability = 0.96;
  } else if (source_port === 4444 || destination_port === 4444) {
    threatType = 'Malware';
    probability = 0.9;
  } else if (protocol === 'FTP' && destination_port === 21 && packet_size >= 100000 && duration >= 120) {
    threatType = 'Data Exfiltration';
    probability = 0.98;
  } else if (protocol === 'TCP' && packet_size <= 120 && duration <= 0.2 && ![22, 80, 443].includes(destination_port)) {
    threatType = 'Port Scan';
    probability = 0.75;
  }

  const isThreat = threatType !== 'Normal';
  return {
    is_threat: isThreat,
    label: isThreat ? 1 : 0,
    threat_type: isThreat ? threatType : 'None',
    attack_category: threatType,
    confidence_score: isThreat ? probability : 1 - probability,
    severity: ATTACK_SEVERITY[threatType] || 'medium',
    threat_probability: probability,
    features_used: {
      source_ip,
      destination_ip,
      source_port,
      destination_port,
      protocol,
      packet_size,
      duration,
      failed_login_attempts,
      login_success,
      country,
      heuristic_fallback: true,
    },
  };
}

// GET /api/logs
async function getLogs(req, res) {
  try {
    const { limit = 100, offset = 0, source_ip, protocol } = req.query;
    let query = 'SELECT * FROM security_logs WHERE 1=1';
    const params = [];
    if (source_ip) { params.push(source_ip); query += ` AND source_ip = $${params.length}`; }
    if (protocol) { params.push(protocol); query += ` AND protocol = $${params.length}`; }
    params.push(parseInt(limit)); query += ` ORDER BY timestamp DESC LIMIT $${params.length}`;
    params.push(parseInt(offset)); query += ` OFFSET $${params.length}`;
    const result = await pool.query(query, params);
    const countResult = await pool.query('SELECT COUNT(*) FROM security_logs');
    res.json({ success: true, total: parseInt(countResult.rows[0].count), logs: result.rows });
  } catch (err) {
    console.error('Get logs error:', err);
    res.status(500).json({ success: false, message: 'Failed to retrieve logs.' });
  }
}

// POST /api/logs  — ingest a log and run ML detection
async function createLog(req, res) {
  const { 
    source_ip, destination_ip, source_port, destination_port, 
    protocol, packet_size, duration, login_attempts, 
    failed_logins, failed_login_attempts, // Accept both names
    login_success, location, event_type, country 
  } = req.body;

  const actualFailedLogins = failed_login_attempts !== undefined ? failed_login_attempts : (failed_logins || 0);

  if (!source_ip || !destination_ip) {
    return res.status(400).json({ success: false, message: 'source_ip and destination_ip are required.' });
  }
  try {
    // 1. Store log in DB
    const logResult = await pool.query(
      `INSERT INTO security_logs (source_ip, destination_ip, source_port, destination_port, protocol, packet_size, duration, login_attempts, failed_logins, login_success, location, event_type, country)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13) RETURNING *`,
      [source_ip, destination_ip, source_port, destination_port, protocol, packet_size, duration, login_attempts || 0, actualFailedLogins, login_success || false, location, event_type, country]
    );
    const log = logResult.rows[0];

    // 2. Send to ML service
    let detection = null;
    const heuristicDetection = buildHeuristicDetection({
      source_ip,
      destination_ip,
      source_port: source_port || 1024,
      destination_port: destination_port || 80,
      protocol: protocol || 'TCP',
      packet_size: packet_size || 512,
      duration: duration || 1.0,
      failed_login_attempts: actualFailedLogins,
      login_success: login_success ? 1 : 0,
      country: country || 'Unknown',
    });

    try {
      const mlResponse = await axios.post(`${ML_SERVICE_URL}/api/detect-threat`, {
        source_ip, destination_ip,
        source_port: source_port || 1024,
        destination_port: destination_port || 80,
        protocol: protocol || 'TCP',
        packet_size: packet_size || 512,
        duration: duration || 1.0,
        failed_login_attempts: actualFailedLogins,
        login_success: login_success ? 1 : 0,
        country: country || 'Unknown'
      }, { timeout: 5000 });
      detection = mlResponse.data;
      if (heuristicDetection.is_threat && !detection.is_threat) {
        detection = heuristicDetection;
      }
    } catch (mlErr) {
      console.warn('ML service unavailable:', mlErr.message);
      detection = heuristicDetection;
    }

    // 3. Create alert if threat detected
    let alert = null;
    if (detection && detection.is_threat) {
      const alertResult = await pool.query(
        `INSERT INTO alerts (threat_type, severity, source_ip, destination_ip, source_port, destination_port, confidence_score, attack_category, status, log_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'open', $9) RETURNING *`,
        [detection.threat_type, detection.severity, source_ip, destination_ip, source_port, destination_port, detection.confidence_score, detection.attack_category, log.id]
      );
      alert = alertResult.rows[0];
      // Emit real-time alert via WebSocket
      if (req.app.get('io')) {
        req.app.get('io').emit('new_alert', { alert, detection });
      }
    }

    res.status(201).json({ success: true, log, detection, alert });
  } catch (err) {
    console.error('Create log error:', err);
    res.status(500).json({ success: false, message: 'Failed to process log.' });
  }
}

// GET /api/logs/stats
async function getLogStats(req, res) {
  try {
    const stats = await pool.query(`
      SELECT 
        COUNT(*) as total_logs,
        COUNT(DISTINCT source_ip) as unique_sources,
        COUNT(DISTINCT protocol) as protocols_used
      FROM security_logs
      WHERE timestamp >= NOW() - INTERVAL '7 days'
    `);
    const hourly = await pool.query(`
      SELECT DATE_TRUNC('hour', timestamp) as hour, COUNT(*) as count
      FROM security_logs
      WHERE timestamp >= NOW() - INTERVAL '24 hours'
      GROUP BY hour ORDER BY hour
    `);
    const protocol = await pool.query(`
      SELECT protocol, COUNT(*) as count FROM security_logs
      WHERE timestamp >= NOW() - INTERVAL '7 days' AND protocol IS NOT NULL
      GROUP BY protocol ORDER BY count DESC
    `);
    res.json({ success: true, stats: stats.rows[0], hourly: hourly.rows, protocol: protocol.rows });
  } catch (err) {
    console.error('Log stats error:', err);
    res.status(500).json({ success: false, message: 'Failed to retrieve stats.' });
  }
}

module.exports = { getLogs, createLog, getLogStats };
