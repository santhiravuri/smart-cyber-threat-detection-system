import { useEffect, useState, useRef } from 'react'
import { logsAPI } from '../services/api'
import { Activity, Shield, Wifi, Terminal, MapPin, Zap, X, Brain } from 'lucide-react'
import { io } from 'socket.io-client'
import { format } from 'date-fns'
import toast from 'react-hot-toast'

export default function Monitor() {
  const [liveLogs, setLiveLogs] = useState([])
  const [activeThreats, setActiveThreats] = useState([])
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [predictLoading, setPredictLoading] = useState(false)
  const [predictionResult, setPredictionResult] = useState(null)
  
  const [form, setForm] = useState({
    source_ip: '192.168.1.50',
    destination_ip: '10.0.0.1',
    source_port: 4444,
    destination_port: 80,
    protocol: 'TCP',
    packet_size: 1500,
    duration: 1.5,
    failed_login_attempts: 0,
    login_success: 1,
    country: 'United States'
  })

  const fetchLogs = async () => {
    try {
      const res = await logsAPI.getAll({ limit: 20 })
      setLiveLogs(res.logs || [])
    } catch (err) {
      console.error('Failed to fetch logs', err)
    }
  }

  useEffect(() => {
    fetchLogs()

    const socket = io(import.meta.env.VITE_API_URL || 'http://localhost:5000')
    
    socket.on('new_alert', (data) => {
      // Backend sends { alert, detection }
      const newAlert = data.alert || data;
      setActiveThreats(prev => {
        // Prevent duplicates
        if (prev.find(a => a.id === newAlert.id)) return prev;
        return [newAlert, ...prev].slice(0, 5)
      });
      
      // If the backend starts sending the log object in 'new_alert'
      if (data.log) {
        setLiveLogs(prev => [data.log, ...prev].slice(0, 50));
      }
    })

    return () => socket.disconnect()
  }, [])

  const handlePredict = async (e) => {
    e.preventDefault()
    setPredictLoading(true)
    setPredictionResult(null)
    try {
      const res = await logsAPI.create(form)
      setPredictionResult(res.detection)
      
      if (res.detection?.is_threat) {
        toast.error(`DANGER: ${res.detection.threat_type} Detected!`, { 
          icon: '🚨',
          duration: 6000,
          style: { border: '1px solid var(--danger)', background: '#1a0505', color: '#ff4d4d' }
        })
        if (res.alert) {
          setActiveThreats(prev => [res.alert, ...prev].slice(0, 5));
        }
      } else {
        toast.success('Traffic Analysis: SAFE (Label 0)', { icon: '✅' })
      }

      // Auto-close modal after 2.5 seconds so user can see the AI result briefly
      setTimeout(() => {
        closeModal();
      }, 2500);

    } catch (err) {
      toast.error('Forensic Analysis Failed: ' + err.message)
    } finally {
      setPredictLoading(false)
    }
  }

  const closeModal = () => {
    setIsModalOpen(false)
    setPredictionResult(null)
    fetchLogs()
  }

  // Predefined map coordinates for countries (Simplified for demo)
  const countryCoords = {
    'United States': { top: '35%', left: '15%' },
    'China': { top: '40%', left: '75%' },
    'Russia': { top: '25%', left: '60%' },
    'India': { top: '55%', left: '68%' },
    'Brazil': { top: '70%', left: '30%' },
    'Germany': { top: '30%', left: '48%' },
    'Netherlands': { top: '28%', left: '46%' },
    'Unknown': { top: '50%', left: '50%' }
  }

  const handlePreset = (type) => {
    const presets = {
      ddos: { source_ip: '185.12.44.10', destination_ip: '10.0.0.1', source_port: 54321, destination_port: 80, protocol: 'TCP', packet_size: 1480, duration: 0.0001, failed_login_attempts: 0, login_success: 0, country: 'Russia' },
      brute_force: { source_ip: '45.3.22.105', destination_ip: '10.0.5.20', source_port: 2222, destination_port: 22, protocol: 'SSH', packet_size: 64, duration: 0.2, failed_login_attempts: 250, login_success: 0, country: 'China' },
      malware: { source_ip: '103.24.55.12', destination_ip: '10.0.0.1', source_port: 4444, destination_port: 4444, protocol: 'TCP', packet_size: 750, duration: 15000, failed_login_attempts: 0, login_success: 1, country: 'Netherlands' },
      exfiltration: { source_ip: '192.168.1.50', destination_ip: '95.211.33.10', source_port: 1025, destination_port: 21, protocol: 'FTP', packet_size: 450000, duration: 800, failed_login_attempts: 0, login_success: 1, country: 'United States' },
      normal: { source_ip: '192.168.1.100', destination_ip: '1.1.1.1', source_port: 50432, destination_port: 443, protocol: 'HTTPS', packet_size: 600, duration: 2.5, failed_login_attempts: 0, login_success: 1, country: 'United States' }
    }
    if (presets[type]) setForm(presets[type])
  }

  return (
    <div className="page-wrapper fade-in-up">
      {/* ... header remains same ... */}
      <div className="page-header">
        <div>
          <h1 className="page-title">SOC Live Monitor</h1>
          <p className="page-subtitle">Real-time AI forensics & global threat visualization</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          <button className="btn btn-primary" onClick={() => setIsModalOpen(true)} style={{ boxShadow: '0 0 15px var(--glow-primary)' }}>
            <Brain size={16} /> Run AI Prediction
          </button>
          <div className="live-indicator">
            <div className="live-dot" /> LIVE FEED
          </div>
        </div>
      </div>

      <div className="grid-2-1">
        {/* ... tables and stats remain same ... */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', height: '600px', border: '1px solid rgba(0,212,255,0.1)' }}>
          <div className="section-title"><Terminal size={14} /> Network Traffic Stream</div>
          <div className="table-wrapper" style={{ flex: 1, overflowY: 'auto', border: 'none' }}>
            <table>
              <thead style={{ position: 'sticky', top: 0, zIndex: 1, background: 'var(--bg-card)' }}>
                <tr>
                  <th>Timestamp</th>
                  <th>Source</th>
                  <th>Target</th>
                  <th>Protocol</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {liveLogs.map((log, i) => {
                  const isThreat = activeThreats.some(at => at.log_id === log.id);
                  return (
                    <tr key={log.id || i} className={isThreat ? 'alert-pulse' : ''} style={isThreat ? { background: 'rgba(255,59,48,0.05)' } : {}}>
                      <td className="mono" style={{ fontSize: '11px' }}>{format(new Date(log.timestamp), 'HH:mm:ss')}</td>
                      <td className="mono" style={{ color: isThreat ? 'var(--danger)' : 'var(--primary)' }}>{log.source_ip}</td>
                      <td className="mono">{log.destination_ip}</td>
                      <td><span className={`badge ${isThreat ? 'badge-critical' : 'badge-low'}`}>{log.protocol}</span></td>
                      <td>{isThreat ? <span style={{ color: 'var(--danger)', fontSize: '10px', fontWeight: 800 }}>DANGER</span> : <span style={{ color: 'var(--success)', opacity: 0.5 }}>SAFE</span>}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div className="card" style={{ borderLeft: '4px solid var(--danger)' }}>
            <div className="section-title"><Shield size={14} /> Active Threat Log</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {activeThreats.length === 0 ? (
                <div className="empty-state" style={{ padding: '20px' }}>
                  <Wifi size={24} />
                  <p style={{ fontSize: '12px' }}>Scanning for threats...</p>
                </div>
              ) : (
                activeThreats.map((alert, i) => (
                  <div key={alert.id || i} className="stat-card" style={{ padding: '12px', background: 'rgba(255,59,48,0.03)' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--danger)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Zap size={12} fill="currentColor" /> {alert.threat_type}
                      </div>
                      <div className="mono" style={{ fontSize: '11px', margin: '4px 0', opacity: 0.8 }}>Source: {alert.source_ip}</div>
                      <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Confidence: {(alert.confidence_score * 100).toFixed(1)}%</div>
                    </div>
                    <span className={`badge badge-${alert.severity}`}>{alert.severity}</span>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="card" style={{ flex: 1 }}>
            <div className="section-title"><MapPin size={14} /> Threat Origin Map</div>
            <div style={{ height: '300px', background: 'rgba(0,0,0,0.3)', borderRadius: '8px', position: 'relative', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(255,255,255,0.05)' }}>
              <div style={{ opacity: 0.15, position: 'absolute', inset: 0, backgroundImage: 'url("https://upload.wikimedia.org/wikipedia/commons/e/ec/World_map_blank_without_borders.svg")', backgroundSize: 'cover', backgroundPosition: 'center' }} />
              
              {/* Dynamic Threat Indicators */}
              {activeThreats.map((alert, i) => {
                const coords = countryCoords[alert.country] || countryCoords['Unknown'];
                return (
                  <div 
                    key={alert.id || i} 
                    className="live-dot red" 
                    style={{ position: 'absolute', top: coords.top, left: coords.left, transform: 'scale(1.5)', zIndex: 10 }} 
                  >
                    <div className="pulse-ring" />
                  </div>
                )
              })}

              <div className="empty-state" style={{ zIndex: 1, pointerEvents: 'none' }}>
                <p style={{ fontSize: '10px', opacity: 0.5, letterSpacing: '2px' }}>GLOBAL SURVEILLANCE ACTIVE</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Manual Prediction Modal */}
      {isModalOpen && (
        <div className="modal-overlay" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(4px)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="card fade-in-up" style={{ width: '100%', maxWidth: '700px', border: '1px solid var(--primary)', boxShadow: '0 0 30px rgba(0,212,255,0.2)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <Brain color="var(--primary)" />
                <h2 style={{ margin: 0, fontSize: '20px' }}>AI Threat Predictor</h2>
              </div>
              <button className="btn btn-ghost" onClick={closeModal}>
                <X size={20} />
              </button>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '1px' }}>Quick Attack Presets</p>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <button className="btn btn-ghost" style={{ fontSize: '10px', padding: '4px 10px', color: 'var(--danger)', borderColor: 'var(--danger)' }} onClick={() => handlePreset('ddos')}>DDoS Flood</button>
                <button className="btn btn-ghost" style={{ fontSize: '10px', padding: '4px 10px', color: 'var(--warning)', borderColor: 'var(--warning)' }} onClick={() => handlePreset('brute_force')}>Brute Force</button>
                <button className="btn btn-ghost" style={{ fontSize: '10px', padding: '4px 10px', color: 'var(--critical)', borderColor: 'var(--critical)' }} onClick={() => handlePreset('malware')}>Malware Beacon</button>
                <button className="btn btn-ghost" style={{ fontSize: '10px', padding: '4px 10px', color: 'var(--primary)', borderColor: 'var(--primary)' }} onClick={() => handlePreset('exfiltration')}>Data Leak</button>
                <button className="btn btn-ghost" style={{ fontSize: '10px', padding: '4px 10px', color: 'var(--success)', borderColor: 'var(--success)' }} onClick={() => handlePreset('normal')}>Clean Traffic</button>
              </div>
            </div>

            <form onSubmit={handlePredict}>
              <div className="grid-2" style={{ gap: '16px' }}>
                <div className="form-group">
                  <label className="form-label">Source IP</label>
                  <input className="form-input mono" value={form.source_ip} onChange={e => setForm({...form, source_ip: e.target.value})} />
                </div>
                <div className="form-group">
                  <label className="form-label">Destination IP</label>
                  <input className="form-input mono" value={form.destination_ip} onChange={e => setForm({...form, destination_ip: e.target.value})} />
                </div>
                <div className="form-group">
                  <label className="form-label">Source Port</label>
                  <input className="form-input" type="number" value={form.source_port} onChange={e => setForm({...form, source_port: parseInt(e.target.value)})} />
                </div>
                <div className="form-group">
                  <label className="form-label">Destination Port</label>
                  <input className="form-input" type="number" list="common-ports" value={form.destination_port} onChange={e => setForm({...form, destination_port: parseInt(e.target.value)})} />
                  <datalist id="common-ports">
                    <option value="80">HTTP (80)</option>
                    <option value="443">HTTPS (443)</option>
                    <option value="22">SSH (22)</option>
                    <option value="21">FTP (21)</option>
                    <option value="53">DNS (53)</option>
                    <option value="4444">Malware/Metasploit (4444)</option>
                    <option value="8080">Alt HTTP (8080)</option>
                  </datalist>
                </div>
                <div className="form-group">
                  <label className="form-label">Protocol</label>
                  <select className="form-input" value={form.protocol} onChange={e => setForm({...form, protocol: e.target.value})}>
                    {['TCP', 'UDP', 'ICMP', 'HTTP', 'HTTPS', 'FTP', 'SSH', 'DNS'].map(p => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Packet Size (Bytes)</label>
                  <input className="form-input" type="number" placeholder="e.g. 1500" value={form.packet_size} onChange={e => setForm({...form, packet_size: parseInt(e.target.value)})} />
                </div>
                <div className="form-group">
                  <label className="form-label">Duration (Seconds)</label>
                  <input className="form-input" type="number" step="0.1" placeholder="e.g. 1.0" value={form.duration} onChange={e => setForm({...form, duration: parseFloat(e.target.value)})} />
                </div>
                <div className="form-group">
                  <label className="form-label">Failed Logins</label>
                  <input className="form-input" type="number" placeholder="Pattern: 50+ for Brute Force" value={form.failed_login_attempts} onChange={e => setForm({...form, failed_login_attempts: parseInt(e.target.value)})} />
                </div>
                <div className="form-group">
                  <label className="form-label">Login Success (0/1)</label>
                  <select className="form-input" value={form.login_success} onChange={e => setForm({...form, login_success: parseInt(e.target.value)})}>
                    <option value={0}>No (0)</option>
                    <option value={1}>Yes (1)</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Origin Country</label>
                  <select className="form-input" value={form.country} onChange={e => setForm({...form, country: e.target.value})}>
                    {['United States', 'China', 'Russia', 'Germany', 'Brazil', 'India', 'United Kingdom', 'Nigeria', 'Ukraine', 'Iran', 'France', 'Japan', 'South Korea', 'Canada', 'Netherlands'].map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
              </div>

              {predictionResult && (
                <div className="fade-in" style={{ marginTop: '20px', padding: '16px', borderRadius: '8px', background: predictionResult.is_threat ? 'rgba(255,59,48,0.1)' : 'rgba(52,199,89,0.1)', border: `1px solid ${predictionResult.is_threat ? 'var(--danger)' : 'var(--success)'}` }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--text-muted)' }}>AI Prediction Result</div>
                      <div style={{ fontSize: '18px', fontWeight: 800, color: predictionResult.is_threat ? 'var(--danger)' : 'var(--success)' }}>
                        {predictionResult.is_threat ? `🚨 THREAT DETECTED: ${predictionResult.threat_type}` : '✅ TRAFFIC SECURE'}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>CONFIDENCE</div>
                      <div style={{ fontSize: '18px', fontWeight: 800 }}>{(predictionResult.confidence_score * 100).toFixed(1)}%</div>
                    </div>
                  </div>
                  {predictionResult.is_threat && (
                    <div style={{ marginTop: '10px', fontSize: '12px', color: 'var(--text-secondary)' }}>
                      Classification: <b>{predictionResult.attack_category}</b> | Severity: <b>{predictionResult.severity.toUpperCase()}</b>
                    </div>
                  )}
                </div>
              )}

              <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
                <button type="submit" className="btn btn-primary" disabled={predictLoading} style={{ flex: 1, justifyContent: 'center' }}>
                  {predictLoading ? 'Analyzing...' : <><Zap size={16} /> Run AI Prediction</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
