"""
Smart Cyber Threat Detection System
ML Model Training Pipeline - Random Forest + Isolation Forest
"""

import pandas as pd
import numpy as np
import joblib
import os
from sklearn.ensemble import RandomForestClassifier, GradientBoostingClassifier, IsolationForest
from sklearn.linear_model import LogisticRegression
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import LabelEncoder, StandardScaler
from sklearn.metrics import (accuracy_score, precision_score, recall_score,
                              f1_score, roc_auc_score, classification_report, confusion_matrix)
import warnings
warnings.filterwarnings('ignore')

# ============================================================
# Configuration
# ============================================================
DATASET_PATH = os.path.join(os.path.dirname(__file__), 'security_logs_dataset_v3.csv')
MODEL_DIR = os.path.join(os.path.dirname(__file__), 'models')
os.makedirs(MODEL_DIR, exist_ok=True)

ATTACK_SEVERITY = {
    'Normal': 'none',
    'DDoS': 'critical',
    'Brute Force': 'high',
    'Port Scan': 'medium',
    'Malware': 'critical',
    'Phishing': 'high',
    'Data Exfiltration': 'critical'
}

# ============================================================
# 1. Load Data
# ============================================================
print("Loading dataset...")
df = pd.read_csv(DATASET_PATH)
df['label'] = df['label'].astype(int)
print(f"Dataset loaded: {df.shape[0]} records, {df.shape[1]} columns")
print(f"Columns: {list(df.columns)}")
print(f"\nAttack distribution:\n{df['attack_type'].value_counts()}")

# ============================================================
# 2. Feature Engineering
# ============================================================
print("\nPreprocessing data...")

# IP address features
def ip_to_int_last_octet(ip):
    try:
        return int(str(ip).split('.')[-1])
    except:
        return 0

def is_private_ip(ip):
    try:
        parts = str(ip).split('.')
        if parts[0] == '192' and parts[1] == '168': return 1
        if parts[0] == '10': return 1
        if parts[0] == '172' and 16 <= int(parts[1]) <= 31: return 1
        return 0
    except:
        return 0

df['src_last_octet'] = df['source_ip'].apply(ip_to_int_last_octet)
df['dst_last_octet'] = df['destination_ip'].apply(ip_to_int_last_octet)
df['src_is_private'] = df['source_ip'].apply(is_private_ip)
df['dst_is_private'] = df['destination_ip'].apply(is_private_ip)

# Protocol encoding
proto_encoder = LabelEncoder()
df['protocol_enc'] = proto_encoder.fit_transform(df['protocol'].fillna('TCP'))

# Country encoding
country_encoder = LabelEncoder()
df['country_enc'] = country_encoder.fit_transform(df['country'].fillna('Unknown'))

# Time features
df['timestamp'] = pd.to_datetime(df['timestamp'], dayfirst=True, errors='coerce')
df['hour'] = df['timestamp'].dt.hour
df['day_of_week'] = df['timestamp'].dt.dayofweek
df['is_weekend'] = (df['day_of_week'] >= 5).astype(int)

# Port risk features
SUSPICIOUS_PORTS = {4444, 6667, 1337, 31337, 8080, 23}
df['src_port_suspicious'] = df['source_port'].apply(lambda x: 1 if x in SUSPICIOUS_PORTS else 0)
df['dst_port_suspicious'] = df['destination_port'].apply(lambda x: 1 if x in SUSPICIOUS_PORTS else 0)
df['is_well_known_dst_port'] = (df['destination_port'] < 1024).astype(int)

# Ratio features
df['packet_per_duration'] = df['packet_size'] / (df['duration'] + 0.001)
df['failed_login_ratio'] = df['failed_login_attempts'] / (df['failed_login_attempts'] + 1)

# Attack type multi-class encoder
attack_encoder = LabelEncoder()
df['attack_label'] = attack_encoder.fit_transform(df['attack_type'])

# Feature selection
FEATURES = [
    'source_port', 'destination_port', 'packet_size', 'duration',
    'failed_login_attempts', 'login_success',
    'src_last_octet', 'dst_last_octet', 'src_is_private', 'dst_is_private',
    'protocol_enc', 'country_enc', 'hour', 'day_of_week', 'is_weekend',
    'src_port_suspicious', 'dst_port_suspicious', 'is_well_known_dst_port',
    'packet_per_duration', 'failed_login_ratio'
]

X = df[FEATURES].fillna(0)
y_binary = df['label']          # 0 = Normal, 1 = Attack
y_multi = df['attack_label']    # Multi-class attack type

# ============================================================
# 3. Train/Test Split
# ============================================================
X_train, X_test, y_bin_train, y_bin_test, y_multi_train, y_multi_test = train_test_split(
    X, y_binary, y_multi, test_size=0.2, random_state=42, stratify=y_binary
)

print(f"\nTrain size: {len(X_train)}, Test size: {len(X_test)}")

# Scaling
scaler = StandardScaler()
X_train_scaled = scaler.fit_transform(X_train)
X_test_scaled = scaler.transform(X_test)

# ============================================================
# 4. Model Training
# ============================================================

def evaluate_model(model, X_test, y_test, name, multi=False):
    y_pred = model.predict(X_test)
    acc = accuracy_score(y_test, y_pred)
    prec = precision_score(y_test, y_pred, average='weighted', zero_division=0)
    rec = recall_score(y_test, y_pred, average='weighted', zero_division=0)
    f1 = f1_score(y_test, y_pred, average='weighted', zero_division=0)
    print(f"\n{name} Results:")
    print(f"  Accuracy:  {acc:.4f}")
    print(f"  Precision: {prec:.4f}")
    print(f"  Recall:    {rec:.4f}")
    print(f"  F1 Score:  {f1:.4f}")
    if not multi:
        try:
            y_prob = model.predict_proba(X_test)[:, 1]
            auc = roc_auc_score(y_test, y_prob)
            print(f"  ROC-AUC:   {auc:.4f}")
        except:
            pass
    return acc, prec, rec, f1

# --- Random Forest (Primary Binary Classifier) ---
print("\nTraining Random Forest (Binary)...")
rf_model = RandomForestClassifier(
    n_estimators=200,
    max_depth=18,
    min_samples_leaf=1,
    class_weight='balanced',
    random_state=42,
    n_jobs=1
)
rf_model.fit(X_train, y_bin_train)
evaluate_model(rf_model, X_test, y_bin_test, "Random Forest (Binary)")

# --- Random Forest (Multi-class) ---
print("\nTraining Random Forest (Multi-class Attack Type)...")
rf_multi = RandomForestClassifier(
    n_estimators=200,
    max_depth=18,
    class_weight='balanced_subsample',
    random_state=42,
    n_jobs=1
)
rf_multi.fit(X_train, y_multi_train)
evaluate_model(rf_multi, X_test, y_multi_test, "Random Forest (Multi-class)", multi=True)
print(f"\nClassification Report:\n{classification_report(y_multi_test, rf_multi.predict(X_test), target_names=attack_encoder.classes_)}")

# --- Gradient Boosting (Binary) ---
print("\nTraining Gradient Boosting (Binary)...")
gb_model = GradientBoostingClassifier(n_estimators=100, max_depth=5, random_state=42)
gb_model.fit(X_train, y_bin_train)
evaluate_model(gb_model, X_test, y_bin_test, "Gradient Boosting (Binary)")

# --- Isolation Forest (Anomaly Detection) ---
print("\nTraining Isolation Forest (Anomaly Detection)...")
iso_model = IsolationForest(n_estimators=100, contamination=0.5, random_state=42, n_jobs=1)
iso_model.fit(X_train)

# --- Logistic Regression (Binary) ---
print("\nTraining Logistic Regression (Binary)...")
lr_model = LogisticRegression(max_iter=1000, random_state=42)
lr_model.fit(X_train_scaled, y_bin_train)
evaluate_model(lr_model, X_test_scaled, y_bin_test, "Logistic Regression (Binary)")

# ============================================================
# 5. Save Models and Artifacts
# ============================================================
print("\nSaving models and encoders...")
joblib.dump(rf_model, os.path.join(MODEL_DIR, 'rf_binary.pkl'))
joblib.dump(rf_multi, os.path.join(MODEL_DIR, 'rf_multiclass.pkl'))
joblib.dump(gb_model, os.path.join(MODEL_DIR, 'gb_binary.pkl'))
joblib.dump(iso_model, os.path.join(MODEL_DIR, 'iso_forest.pkl'))
joblib.dump(lr_model, os.path.join(MODEL_DIR, 'lr_binary.pkl'))
joblib.dump(scaler, os.path.join(MODEL_DIR, 'scaler.pkl'))
joblib.dump(proto_encoder, os.path.join(MODEL_DIR, 'proto_encoder.pkl'))
joblib.dump(country_encoder, os.path.join(MODEL_DIR, 'country_encoder.pkl'))
joblib.dump(attack_encoder, os.path.join(MODEL_DIR, 'attack_encoder.pkl'))
joblib.dump(FEATURES, os.path.join(MODEL_DIR, 'features.pkl'))
joblib.dump(ATTACK_SEVERITY, os.path.join(MODEL_DIR, 'attack_severity.pkl'))

print(f"\nAll models saved to: {MODEL_DIR}")
print("Models saved:")
for f in os.listdir(MODEL_DIR):
    print(f"  - {f}")
