require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');

// Routes
const authRoutes = require('./routes/auth');
const logsRoutes = require('./routes/logs');
const alertsRoutes = require('./routes/alerts');

const app = express();
const httpServer = http.createServer(app);

// ============================================================
// WebSocket Setup
// ============================================================
const io = new Server(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

app.set('io', io);

io.on('connection', (socket) => {
  console.log(`🔌 WebSocket client connected: ${socket.id}`);
  socket.emit('connected', { message: 'Connected to Cyber Threat Detection System', timestamp: new Date().toISOString() });
  socket.on('disconnect', () => {
    console.log(`🔌 WebSocket client disconnected: ${socket.id}`);
  });
});

// ============================================================
// Middleware
// ============================================================
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({ origin: '*', methods: ['GET', 'POST', 'PUT', 'DELETE'] }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 500,
  message: { success: false, message: 'Too many requests, please try again later.' }
});
app.use('/api/', limiter);

// ============================================================
// Routes
// ============================================================
app.use('/api/auth', authRoutes);
app.use('/api/logs', logsRoutes);
app.use('/api/alerts', alertsRoutes);

// Threat intelligence (mock blacklist)
app.get('/api/threat-intel', (req, res) => {
  res.json({
    success: true,
    blacklisted_ips: [
      '45.33.32.156', '23.20.239.12', '85.25.43.94', '103.21.16.1', '192.241.235.16',
      '91.121.215.173', '1.179.150.185', '212.58.252.127', '80.82.70.118', '185.220.101.47'
    ],
    malicious_domains: [
      'malware-c2.ru', 'phishing-bank.tk', 'exfiltrate.onion', 'botnet-master.cn', 'ransomware.io'
    ],
    suspicious_patterns: [
      'Multiple failed SSH logins > 50 in 5 minutes',
      'Outbound traffic to Tor exit nodes',
      'ICMP flood > 10000 pps',
      'DNS tunneling via high-entropy subdomains',
      'Unusual port 4444/1337 outbound connections'
    ]
  });
});

// Real-time threat simulation endpoint (for demo)
app.post('/api/simulate-threat', (req, res) => {
  const { authMiddleware } = require('./middleware/auth');
  const mockAlert = {
    id: Math.floor(Math.random() * 100000),
    threat_type: ['DDoS', 'Brute Force', 'Malware', 'Port Scan'][Math.floor(Math.random() * 4)],
    severity: ['critical', 'high', 'medium'][Math.floor(Math.random() * 3)],
    source_ip: `${Math.floor(Math.random()*254)+1}.${Math.floor(Math.random()*254)+1}.${Math.floor(Math.random()*254)+1}.${Math.floor(Math.random()*254)+1}`,
    destination_ip: '192.168.1.100',
    confidence_score: parseFloat((Math.random() * 0.4 + 0.6).toFixed(4)),
    status: 'open',
    timestamp: new Date().toISOString()
  };
  io.emit('new_alert', { alert: mockAlert, simulation: true });
  res.json({ success: true, message: 'Simulated threat emitted', alert: mockAlert });
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ success: true, status: 'online', timestamp: new Date().toISOString(), version: '1.0.0' });
});

// 404 Handler
app.use((req, res) => {
  res.status(404).json({ success: false, message: `Route ${req.method} ${req.path} not found.` });
});

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ success: false, message: 'Internal server error', error: process.env.NODE_ENV === 'development' ? err.message : undefined });
});

// ============================================================
// Start Server
// ============================================================
const PORT = process.env.PORT || 5000;
httpServer.listen(PORT, () => {
  console.log(`\n🚀 Cyber Threat Detection API running on http://localhost:${PORT}`);
  console.log(`🔌 WebSocket server ready`);
  console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}\n`);
});

module.exports = { app, io };
