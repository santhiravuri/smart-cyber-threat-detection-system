"""
Smart Cyber Threat Detection System
Synthetic Dataset Generator - 10,000 Records
"""

import pandas as pd
import numpy as np
import random
import ipaddress
from datetime import datetime, timedelta
import os

random.seed(42)
np.random.seed(42)

NUM_RECORDS = 30000
OUTPUT_PATH = os.path.join(os.path.dirname(__file__), 'security_logs_dataset_v3.csv')
  # Temporarily using a new file to bypass potential locks

# Attack type distribution
ATTACK_TYPES = ['Normal', 'DDoS', 'Brute Force', 'Port Scan', 'Malware', 'Phishing', 'Data Exfiltration']
ATTACK_WEIGHTS = [0.45, 0.15, 0.15, 0.10, 0.08, 0.04, 0.03]

PROTOCOLS = ['TCP', 'UDP', 'ICMP', 'HTTP', 'HTTPS', 'FTP', 'SSH', 'DNS']
COUNTRIES = ['United States', 'China', 'Russia', 'Germany', 'Brazil', 'India', 'United Kingdom', 'Nigeria', 'Ukraine', 'Iran', 'France', 'Japan', 'South Korea', 'Canada', 'Netherlands']

COUNTRY_WEIGHTS = [0.20, 0.15, 0.12, 0.07, 0.06, 0.06, 0.05, 0.05, 0.04, 0.04, 0.04, 0.04, 0.03, 0.03, 0.02]

def random_ip(private=False):
    if private:
        prefix = random.choice(['192.168', '10.0', '172.16'])
        return f"{prefix}.{random.randint(0,255)}.{random.randint(1,254)}"
    octets = [random.randint(1, 254) for _ in range(4)]
    # Avoid private ranges
    while (octets[0] == 192 and octets[1] == 168) or octets[0] == 10 or \
          (octets[0] == 172 and 16 <= octets[1] <= 31):
        octets = [random.randint(1, 254) for _ in range(4)]
    return '.'.join(map(str, octets))

def generate_record(attack_type, start_time):
    timestamp = start_time + timedelta(seconds=random.randint(0, 86400 * 30))
    source_ip = random_ip(private=False)
    dest_ip = random_ip(private=True)
    source_port = random.randint(1024, 65535)
    country = random.choices(COUNTRIES, weights=COUNTRY_WEIGHTS)[0]

    base = {
        'source_ip': source_ip,
        'destination_ip': dest_ip,
        'source_port': source_port,
        'destination_port': None,
        'protocol': None,
        'packet_size': None,
        'duration': None,
        'failed_login_attempts': 0,
        'login_success': 0,
        'country': country,
        'timestamp': timestamp.strftime('%Y-%m-%d %H:%M:%S'),
        'attack_type': attack_type,
        'label': 0 if attack_type == 'Normal' else 1
    }

    if attack_type == 'Normal':
        base['destination_port'] = random.choice([80, 443, 53, 22])
        base['protocol'] = random.choice(['TCP', 'HTTPS', 'HTTP', 'DNS'])
        base['packet_size'] = random.randint(300, 1000)
        base['duration'] = round(random.uniform(0.5, 5.0), 3)
        base['failed_login_attempts'] = 0 
        base['login_success'] = 1

    elif attack_type == 'DDoS':
        base['destination_port'] = random.choice([80, 443])
        base['protocol'] = 'TCP'
        base['packet_size'] = random.randint(1450, 1500) 
        base['duration'] = round(random.uniform(0.0001, 0.001), 6) # Extreme fast
        base['failed_login_attempts'] = 0
        base['login_success'] = 0

    elif attack_type == 'Brute Force':
        base['destination_port'] = 22
        base['protocol'] = 'SSH'
        base['packet_size'] = random.randint(40, 100)
        base['duration'] = round(random.uniform(0.1, 0.5), 3)
        base['failed_login_attempts'] = random.randint(100, 500) # Clear sign
        base['login_success'] = 0

    elif attack_type == 'Port Scan':
        base['destination_port'] = random.randint(1, 65535)
        base['protocol'] = 'TCP'
        base['packet_size'] = 40
        base['duration'] = 0.0001
        base['failed_login_attempts'] = 0
        base['login_success'] = 0

    elif attack_type == 'Malware':
        base['destination_port'] = 4444
        base['protocol'] = 'TCP'
        base['packet_size'] = random.randint(500, 1000)
        base['duration'] = round(random.uniform(10000, 20000), 2) # Permanent connection
        base['failed_login_attempts'] = 0
        base['login_success'] = 1

    elif attack_type == 'Phishing':
        base['destination_port'] = 443
        base['protocol'] = 'HTTPS'
        base['packet_size'] = random.randint(500, 1500)
        base['duration'] = round(random.uniform(30.0, 120.0), 3)
        base['failed_login_attempts'] = random.randint(5, 10) 
        base['login_success'] = 0

    elif attack_type == 'Data Exfiltration':
        base['destination_port'] = 21
        base['protocol'] = 'FTP'
        base['packet_size'] = random.randint(100000, 500000) # Massive data
        base['duration'] = round(random.uniform(500, 1000), 2)
        base['failed_login_attempts'] = 0
        base['login_success'] = 1

    return base

print("Generating synthetic dataset...")
start_time = datetime(2025, 1, 1)
records = []

for _ in range(NUM_RECORDS):
    attack_type = random.choices(ATTACK_TYPES, weights=ATTACK_WEIGHTS)[0]
    records.append(generate_record(attack_type, start_time))

df = pd.DataFrame(records)
df = df.sample(frac=1, random_state=42).reset_index(drop=True)

os.makedirs(os.path.dirname(OUTPUT_PATH), exist_ok=True)
df.to_csv(OUTPUT_PATH, index=False)

print(f"Dataset generated: {OUTPUT_PATH}")
print(f"Total records: {len(df)}")
print(f"\nAttack type distribution:\n{df['attack_type'].value_counts()}")
print(f"\nLabel distribution:\n{df['label'].value_counts()}")
print(f"\nColumns: {list(df.columns)}")
