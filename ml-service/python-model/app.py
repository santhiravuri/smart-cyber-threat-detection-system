"""
Smart Cyber Threat Detection System
FastAPI ML Service - Threat Detection Endpoint
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
import joblib
import numpy as np
import pandas as pd
import os
import uvicorn
from datetime import datetime

# ============================================================
# App Setup
# ============================================================
app = FastAPI(
    title="Cyber Threat Detection ML Service",
    description="Machine Learning-powered threat detection service",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ============================================================
# Load Models
# ============================================================
MODEL_DIR = os.path.join(os.path.dirname(__file__), 'models')

models = {}
try:
    models['rf_binary'] = joblib.load(os.path.join(MODEL_DIR, 'rf_binary.pkl'))
    models['rf_multi'] = joblib.load(os.path.join(MODEL_DIR, 'rf_multiclass.pkl'))
    models['gb_binary'] = joblib.load(os.path.join(MODEL_DIR, 'gb_binary.pkl'))
    models['lr_binary'] = joblib.load(os.path.join(MODEL_DIR, 'lr_binary.pkl'))
    models['scaler'] = joblib.load(os.path.join(MODEL_DIR, 'scaler.pkl'))
    models['proto_encoder'] = joblib.load(os.path.join(MODEL_DIR, 'proto_encoder.pkl'))
    models['country_encoder'] = joblib.load(os.path.join(MODEL_DIR, 'country_encoder.pkl'))
    models['attack_encoder'] = joblib.load(os.path.join(MODEL_DIR, 'attack_encoder.pkl'))
    models['features'] = joblib.load(os.path.join(MODEL_DIR, 'features.pkl'))
    models['attack_severity'] = joblib.load(os.path.join(MODEL_DIR, 'attack_severity.pkl'))
    models['rf_binary'].n_jobs = 1
    models['rf_multi'].n_jobs = 1
    print("All models loaded successfully")
except Exception as e:
    print(f"Warning: Could not load models: {e}. Run train_model.py first.")


# ============================================================
# Request/Response Models
# ============================================================
class ThreatDetectionRequest(BaseModel):
    source_ip: str
    destination_ip: str
    source_port: int
    destination_port: int
    protocol: str
    packet_size: int
    duration: float = 1.0
    failed_login_attempts: int = 0
    login_success: int = 0
    country: str = "Unknown"

class ThreatDetectionResponse(BaseModel):
    is_threat: bool
    label: int
    threat_type: str
    attack_category: str
    confidence_score: float
    severity: str
    threat_probability: float
    features_used: dict


# ============================================================
# Feature Engineering Helpers
# ============================================================
def ip_to_int_last_octet(ip: str) -> int:
    try:
        return int(str(ip).split('.')[-1])
    except:
        return 0

def is_private_ip(ip: str) -> int:
    try:
        parts = str(ip).split('.')
        if parts[0] == '192' and parts[1] == '168': return 1
        if parts[0] == '10': return 1
        if parts[0] == '172' and 16 <= int(parts[1]) <= 31: return 1
        return 0
    except:
        return 0

SUSPICIOUS_PORTS = {4444, 6667, 1337, 31337, 8080, 23}

def encode_safe(encoder, value, default=0):
    try:
        return encoder.transform([value])[0]
    except:
        return default

def extract_features(req: ThreatDetectionRequest) -> dict:
    now = datetime.now()
    proto_enc = encode_safe(models.get('proto_encoder'), req.protocol, 0)
    country_enc = encode_safe(models.get('country_encoder'), req.country, 0)

    features = {
        'source_port': req.source_port,
        'destination_port': req.destination_port,
        'packet_size': req.packet_size,
        'duration': req.duration,
        'failed_login_attempts': req.failed_login_attempts,
        'login_success': req.login_success,
        'src_last_octet': ip_to_int_last_octet(req.source_ip),
        'dst_last_octet': ip_to_int_last_octet(req.destination_ip),
        'src_is_private': is_private_ip(req.source_ip),
        'dst_is_private': is_private_ip(req.destination_ip),
        'protocol_enc': proto_enc,
        'country_enc': country_enc,
        'hour': now.hour,
        'day_of_week': now.weekday(),
        'is_weekend': 1 if now.weekday() >= 5 else 0,
        'src_port_suspicious': 1 if req.source_port in SUSPICIOUS_PORTS else 0,
        'dst_port_suspicious': 1 if req.destination_port in SUSPICIOUS_PORTS else 0,
        'is_well_known_dst_port': 1 if req.destination_port < 1024 else 0,
        'packet_per_duration': req.packet_size / (req.duration + 0.001),
        'failed_login_ratio': req.failed_login_attempts / (req.failed_login_attempts + 1)
    }
    return features


def compute_rule_based_risk(req: ThreatDetectionRequest, features: dict) -> tuple[float, Optional[str], list[str]]:
    score = 0.0
    likely_attack = None
    reasons = []

    if req.protocol == 'SSH' and req.destination_port == 22 and req.failed_login_attempts >= 40 and req.login_success == 0:
        score = max(score, 0.96)
        likely_attack = 'Brute Force'
        reasons.append('high_failed_logins_on_ssh')

    if req.protocol == 'TCP' and req.packet_size >= 1400 and req.duration <= 0.01 and req.destination_port in {80, 443}:
        score = max(score, 0.94)
        likely_attack = likely_attack or 'DDoS'
        reasons.append('ddos_flood_pattern')

    if req.destination_port == 4444 or req.source_port == 4444:
        score = max(score, 0.88)
        likely_attack = likely_attack or 'Malware'
        reasons.append('suspicious_port_4444')

    if req.protocol == 'FTP' and req.destination_port == 21 and req.packet_size >= 100000 and req.duration >= 120:
        score = max(score, 0.97)
        likely_attack = likely_attack or 'Data Exfiltration'
        reasons.append('large_ftp_transfer')

    if req.protocol in {'HTTP', 'HTTPS'} and req.destination_port == 443 and req.login_success == 0 and req.packet_size <= 300:
        score = max(score, 0.78)
        likely_attack = likely_attack or 'Phishing'
        reasons.append('failed_web_auth_pattern')

    if req.protocol == 'TCP' and req.failed_login_attempts == 0 and req.packet_size <= 120 and req.duration <= 0.2 and req.destination_port not in {80, 443, 22}:
        score = max(score, 0.73)
        likely_attack = likely_attack or 'Port Scan'
        reasons.append('rapid_low_volume_probe')

    if features['dst_port_suspicious'] or features['src_port_suspicious']:
        score = max(score, 0.70)
        reasons.append('suspicious_port_seen')

    return score, likely_attack, reasons


def to_plain_python(value):
    if isinstance(value, np.generic):
        return value.item()
    if isinstance(value, dict):
        return {k: to_plain_python(v) for k, v in value.items()}
    if isinstance(value, list):
        return [to_plain_python(v) for v in value]
    return value


# ============================================================
# Routes
# ============================================================
@app.get("/")
def root():
    return {
        "service": "Cyber Threat Detection ML Service",
        "status": "online",
        "version": "1.0.0",
        "models_loaded": len(models) > 0
    }

@app.get("/health")
def health():
    return {"status": "healthy", "models_loaded": 'rf_binary' in models}


@app.post("/api/detect-threat", response_model=ThreatDetectionResponse)
def detect_threat(req: ThreatDetectionRequest):
    if 'rf_binary' not in models:
        raise HTTPException(status_code=503, detail="ML models not loaded. Run train_model.py first.")

    try:
        features = extract_features(req)
        feature_names = models['features']
        X = pd.DataFrame([[features[f] for f in feature_names]], columns=feature_names)

        # Binary prediction ensemble with a rules fallback for obvious attack signatures.
        X_scaled = models['scaler'].transform(X)
        rf_proba = models['rf_binary'].predict_proba(X)[0]
        gb_proba = models['gb_binary'].predict_proba(X)[0]
        lr_proba = models['lr_binary'].predict_proba(X_scaled)[0]
        model_threat_prob = float((rf_proba[1] * 0.5) + (gb_proba[1] * 0.3) + (lr_proba[1] * 0.2))
        rule_threat_prob, heuristic_attack_type, heuristic_reasons = compute_rule_based_risk(req, features)
        threat_prob = max(model_threat_prob, rule_threat_prob)
        is_threat_pred = int(threat_prob >= 0.55)
        confidence_score = max(threat_prob, 1 - threat_prob)

        # Multi-class prediction (attack type)
        multi_pred = models['rf_multi'].predict(X)[0]
        attack_type = models['attack_encoder'].inverse_transform([multi_pred])[0]
        attack_severity = models['attack_severity'].get(attack_type, 'medium')

        is_threat = bool(is_threat_pred)

        if not is_threat:
            attack_type = 'Normal'
            attack_severity = 'none'
            threat_type = 'None'
        else:
            if heuristic_attack_type:
                attack_type = heuristic_attack_type
                attack_severity = models['attack_severity'].get(attack_type, 'high')
            threat_type = attack_type

        return ThreatDetectionResponse(
            is_threat=is_threat,
            label=int(is_threat_pred),
            threat_type=threat_type,
            attack_category=attack_type,
            confidence_score=round(float(confidence_score), 4),
            severity=attack_severity,
            threat_probability=round(threat_prob, 4),
            features_used=to_plain_python({**features, 'heuristic_reasons': heuristic_reasons})
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Prediction error: {str(e)}")


@app.post("/api/detect-batch")
def detect_batch(requests: list[ThreatDetectionRequest]):
    """Batch threat detection for multiple log entries."""
    if 'rf_binary' not in models:
        raise HTTPException(status_code=503, detail="ML models not loaded.")
    results = []
    for req in requests:
        try:
            result = detect_threat(req)
            results.append(result)
        except Exception as e:
            results.append({"error": str(e)})
    return results


if __name__ == "__main__":
    uvicorn.run("app:app", host="0.0.0.0", port=5001, reload=True)
