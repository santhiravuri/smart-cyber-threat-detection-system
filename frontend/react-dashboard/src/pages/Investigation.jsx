import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { alertsAPI } from '../services/api'
import { format } from 'date-fns'
import { 
  ShieldAlert, ShieldCheck, MessageSquare, Save, 
  History, Info, Globe, HardDrive, Network 
} from 'lucide-react'
import toast from 'react-hot-toast'

export default function Investigation() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const alertId = searchParams.get('id')
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [loadError, setLoadError] = useState('')
  const [notes, setNotes] = useState('')
  const [status, setStatus] = useState('')
  const [investigatingAlerts, setInvestigatingAlerts] = useState([])
  const [investigatingLoading, setInvestigatingLoading] = useState(false)

  useEffect(() => {
    fetchInvestigatingAlerts()
  }, [alertId])

  const fetchAlertDetails = async () => {
    setLoading(true)
    setLoadError('')
    try {
      const res = await alertsAPI.getById(alertId)
      setData(res)
      setStatus(res.alert.status)
      setNotes(res.alert.analyst_notes || '')
    } catch (err) {
      setData(null)
      setLoadError(err.message || 'Failed to load alert details')
      toast.error('Failed to load alert details')
    } finally {
      setLoading(false)
    }
  }

  const fetchInvestigatingAlerts = async () => {
    setInvestigatingLoading(true)
    try {
      const res = await alertsAPI.getAll({ status: 'investigating', limit: 100, offset: 0 })
      setInvestigatingAlerts(res.alerts || [])
    } catch (err) {
      setInvestigatingAlerts([])
    } finally {
      setInvestigatingLoading(false)
    }
  }

  const handleUpdate = async () => {
    try {
      await alertsAPI.updateStatus({ id: alertId, status, analyst_notes: notes })
      toast.success('Alert status updated successfully')
      // Clear form fields, then reload updated data
      setNotes('')
      setStatus('')
      await Promise.all([fetchAlertDetails(), fetchInvestigatingAlerts()])
    } catch (err) {
      toast.error('Update failed')
    }
  }

  const handleFeedback = async (type) => {
    try {
      await alertsAPI.submitFeedback({ alert_id: alertId, feedback_type: type, notes: 'Analyst verification' })
      toast.success(`Marked as ${type.replace('_', ' ')}`)
    } catch (err) {
      toast.error('Feedback failed')
    }
  }

  useEffect(() => {
    if (alertId) fetchAlertDetails()
  }, [alertId])

  if (!alertId) {
    return (
      <div className="page-wrapper">
        <div className="empty-state" style={{ marginTop: '100px' }}>
          <ShieldAlert size={48} />
          <h2>No Incident Selected</h2>
          <p>Please select an alert from the Alerts page to start investigation</p>
        </div>
      </div>
    )
  }

  if (loading) {
    return <div className="page-loading"><div className="loading-spinner" /></div>
  }

  if (!data) {
    return (
      <div className="page-wrapper fade-in-up">
        <div className="page-header">
          <div>
            <h1 className="page-title">Investigation</h1>
            <p className="page-subtitle">Incident investigation and resolution</p>
          </div>
        </div>

        <div className="grid-2-1">
          <div className="card">
            <div className="empty-state" style={{ padding: '28px 16px' }}>
              <ShieldAlert size={40} />
              <h2>Incident Not Found</h2>
              <p style={{ color: 'var(--text-secondary)' }}>{loadError || 'Unable to load the selected incident.'}</p>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div className="card">
              <div className="section-title"><MessageSquare size={14} /> Under Investigation</div>
              {investigatingLoading ? (
                <div className="page-loading" style={{ minHeight: 120 }}>
                  <div className="loading-spinner" />
                </div>
              ) : investigatingAlerts.length === 0 ? (
                <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>No alerts currently under investigation</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {investigatingAlerts.map((a) => (
                    <button
                      key={a.id}
                      className="btn btn-ghost btn-sm"
                      style={{ justifyContent: 'space-between' }}
                      onClick={() => navigate(`/investigation?id=${a.id}`)}
                    >
                      <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <ShieldAlert size={12} />
                        <span style={{ fontWeight: 600 }}>{a.threat_type}</span>
                      </span>
                      <span className={`badge badge-${a.severity}`}>{a.severity}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    )
  }

  const { alert, relatedLog, feedback } = data

  return (
    <div className="page-wrapper fade-in-up">
      <div className="page-header">
        <div>
          <h1 className="page-title">Incident Analysis: {alert.threat_type}</h1>
          <p className="page-subtitle">Detailed forensics and analyst resolution tools</p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button className="btn btn-success" onClick={() => handleFeedback('true_positive')}>
            <ShieldAlert size={14} /> True Positive
          </button>
          <button className="btn btn-ghost" onClick={() => handleFeedback('false_positive')}>
            < ShieldCheck size={14} /> False Positive
          </button>
        </div>
      </div>

      <div className="grid-2-1">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Forensics Card */}
          <div className="card">
            <div className="section-title"><Info size={14} /> Threat Forensics</div>
            <div className="grid-2" style={{ gap: '24px' }}>
              <div>
                <dt style={{ color: 'var(--text-muted)', fontSize: '11px', textTransform: 'uppercase' }}>Confidence Score</dt>
                <dd style={{ fontSize: '24px', fontWeight: 800, color: 'var(--primary)' }}>{(alert.confidence_score * 100).toFixed(1)}%</dd>
                
                <dt style={{ color: 'var(--text-muted)', fontSize: '11px', textTransform: 'uppercase', marginTop: '16px' }}>Attack Vector</dt>
                <dd style={{ fontSize: '16px', fontWeight: 600 }}>{alert.attack_category}</dd>
              </div>
              <div style={{ textAlign: 'right' }}>
                <span className={`badge badge-${alert.severity}`} style={{ padding: '6px 16px', fontSize: '12px' }}>{alert.severity} SEVERITY</span>
                <div style={{ marginTop: '16px', color: 'var(--text-secondary)', fontSize: '12px' }}>
                  Detected at: <br /><b>{format(new Date(alert.timestamp), 'yyyy-MM-dd HH:mm:ss')}</b>
                </div>
              </div>
            </div>
          </div>

          {/* Network Details */}
          <div className="card">
            <div className="section-title"><Network size={14} /> Network Context</div>
            <div className="grid-3" style={{ gap: '16px' }}>
              <div style={{ padding: '12px', background: 'rgba(255,255,255,0.03)', borderRadius: '8px' }}>
                <div style={{ color: 'var(--text-muted)', fontSize: '10px' }}>SOURCE IP</div>
                <div className="mono" style={{ color: 'var(--primary)', fontWeight: 600 }}>{alert.source_ip}</div>
                <div style={{ color: 'var(--text-secondary)', fontSize: '11px', marginTop: '4px' }}>Port: {alert.source_port}</div>
              </div>
              <div style={{ padding: '12px', background: 'rgba(255,255,255,0.03)', borderRadius: '8px' }}>
                <div style={{ color: 'var(--text-muted)', fontSize: '10px' }}>DESTINATION IP</div>
                <div className="mono" style={{ color: 'var(--primary)', fontWeight: 600 }}>{alert.destination_ip}</div>
                <div style={{ color: 'var(--text-secondary)', fontSize: '11px', marginTop: '4px' }}>Port: {alert.destination_port}</div>
              </div>
              <div style={{ padding: '12px', background: 'rgba(255,255,255,0.03)', borderRadius: '8px' }}>
                <div style={{ color: 'var(--text-muted)', fontSize: '10px' }}>ORIGIN</div>
                <div style={{ fontWeight: 600 }}>{relatedLog?.country || 'Unknown'}</div>
                <div style={{ color: 'var(--text-secondary)', fontSize: '11px', marginTop: '4px' }}>{relatedLog?.location || 'Unknown'}</div>
              </div>
            </div>
          </div>

          {/* Raw Log */}
          <div className="card">
            <div className="section-title"><HardDrive size={14} /> Raw Packet Evidence</div>
            <pre style={{ background: '#05080f', padding: '16px', borderRadius: '8px', fontSize: '12px', color: '#00ff41', overflowX: 'auto', border: '1px solid #1a2a4a' }}>
              {JSON.stringify(relatedLog, null, 2)}
            </pre>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Under Investigation */}
          <div className="card">
            <div className="section-title"><MessageSquare size={14} /> Under Investigation</div>
            {investigatingLoading ? (
              <div className="page-loading" style={{ minHeight: 120 }}>
                <div className="loading-spinner" />
              </div>
            ) : investigatingAlerts.length === 0 ? (
              <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>No alerts currently under investigation</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {investigatingAlerts.map((a) => (
                  <button
                    key={a.id}
                    className="btn btn-ghost btn-sm"
                    style={{ justifyContent: 'space-between' }}
                    onClick={() => navigate(`/investigation?id=${a.id}`)}
                  >
                    <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <ShieldAlert size={12} />
                      <span style={{ fontWeight: 600 }}>{a.threat_type}</span>
                    </span>
                    <span className={`badge badge-${a.severity}`}>{a.severity}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Resolution Control */}
          <div className="card">
            <div className="section-title"><Save size={14} /> Resolution Control</div>
            <div className="form-group">
              <label className="form-label">Incident Status</label>
              <select className="form-input" value={status} onChange={e => setStatus(e.target.value)}>
                <option value="open">Open</option>
                <option value="investigating">Investigating</option>
                <option value="resolved">Resolved</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Analyst Notes</label>
              <textarea 
                className="form-input" 
                placeholder="Enter investigation details..." 
                value={notes} 
                onChange={e => setNotes(e.target.value)}
              />
            </div>
            <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }} onClick={handleUpdate}>
              <Save size={16} /> Save Changes
            </button>
          </div>

          {/* Timeline / History */}
          <div className="card">
            <div className="section-title"><History size={14} /> Analysis History</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {feedback.length === 0 ? (
                <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>No feedback history available</p>
              ) : (
                feedback.map(f => (
                  <div key={f.id} style={{ borderLeft: '2px solid var(--border)', paddingLeft: '12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: '12px', fontWeight: 600 }}>{f.analyst_name}</span>
                      <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{format(new Date(f.timestamp), 'MMM d, HH:mm')}</span>
                    </div>
                    <div className={`badge badge-${f.feedback_type === 'true_positive' ? 'critical' : 'resolved'}`} style={{ fontSize: '9px', margin: '4px 0' }}>
                      {f.feedback_type}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
