-- ============================================================
-- Smart Cyber Threat Detection System - PostgreSQL Schema
-- ============================================================

-- Drop existing tables (order matters due to foreign keys)
DROP TABLE IF EXISTS analyst_feedback CASCADE;
DROP TABLE IF EXISTS alerts CASCADE;
DROP TABLE IF EXISTS security_logs CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- ============================================================
-- USERS TABLE
-- ============================================================
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(150) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL DEFAULT 'analyst' CHECK (role IN ('admin', 'analyst')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- SECURITY LOGS TABLE
-- ============================================================
CREATE TABLE security_logs (
    id SERIAL PRIMARY KEY,
    source_ip VARCHAR(45) NOT NULL,
    destination_ip VARCHAR(45) NOT NULL,
    source_port INTEGER,
    destination_port INTEGER,
    protocol VARCHAR(20),
    packet_size INTEGER,
    duration FLOAT,
    login_attempts INTEGER DEFAULT 0,
    failed_logins INTEGER DEFAULT 0,
    login_success BOOLEAN DEFAULT FALSE,
    location VARCHAR(100),
    event_type VARCHAR(100),
    country VARCHAR(100),
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- ALERTS TABLE
-- ============================================================
CREATE TABLE alerts (
    id SERIAL PRIMARY KEY,
    threat_type VARCHAR(100) NOT NULL,
    severity VARCHAR(20) NOT NULL CHECK (severity IN ('critical', 'high', 'medium', 'low')),
    source_ip VARCHAR(45) NOT NULL,
    destination_ip VARCHAR(45) NOT NULL,
    source_port INTEGER,
    destination_port INTEGER,
    confidence_score FLOAT,
    attack_category VARCHAR(100),
    status VARCHAR(20) NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'investigating', 'resolved')),
    log_id INTEGER REFERENCES security_logs(id) ON DELETE SET NULL,
    analyst_notes TEXT,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- ANALYST FEEDBACK TABLE
-- ============================================================
CREATE TABLE analyst_feedback (
    id SERIAL PRIMARY KEY,
    alert_id INTEGER NOT NULL REFERENCES alerts(id) ON DELETE CASCADE,
    analyst_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    feedback_type VARCHAR(20) NOT NULL CHECK (feedback_type IN ('true_positive', 'false_positive')),
    notes TEXT,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================
CREATE INDEX idx_logs_timestamp ON security_logs(timestamp DESC);
CREATE INDEX idx_logs_source_ip ON security_logs(source_ip);
CREATE INDEX idx_alerts_status ON alerts(status);
CREATE INDEX idx_alerts_severity ON alerts(severity);
CREATE INDEX idx_alerts_timestamp ON alerts(timestamp DESC);
CREATE INDEX idx_alerts_source_ip ON alerts(source_ip);

-- ============================================================
-- DEFAULT ADMIN USER (password: Admin@123 - bcrypt hashed)
-- ============================================================
INSERT INTO users (name, email, password, role) VALUES
    ('Admin User', 'admin@cyberdefense.io', '$2b$10$rQZpvQ4lL2cFnxFo0jlXoO6/pJvM.TxfD2mF9Yil4FEzBWLhZpI3S', 'admin'),
    ('SOC Analyst', 'analyst@cyberdefense.io', '$2b$10$rQZpvQ4lL2cFnxFo0jlXoO6/pJvM.TxfD2mF9Yil4FEzBWLhZpI3S', 'analyst');
