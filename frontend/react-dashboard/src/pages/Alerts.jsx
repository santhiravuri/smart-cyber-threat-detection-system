import { useEffect, useState } from 'react'
import { alertsAPI } from '../services/api'
import { format } from 'date-fns'
import { Search, Filter, AlertCircle, Eye, MoreVertical, RefreshCcw } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'

export default function Alerts() {
  const [alerts, setAlerts] = useState([])
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState({ severity: '', status: '', attack_category: '' })
  const navigate = useNavigate()

  useEffect(() => {
    fetchAlerts()
  }, [filters])

  const fetchAlerts = async () => {
    setLoading(true)
    try {
      const res = await alertsAPI.getAll(filters)
      setAlerts(res.alerts || [])
    } catch (err) {
      toast.error('Failed to fetch alerts')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="page-wrapper fade-in-up">
      <div className="page-header">
        <div>
          <h1 className="page-title">Threat Alerts</h1>
          <p className="page-subtitle">Historical and active security alerts detected by AI</p>
        </div>
        <button className="btn btn-ghost btn-sm" onClick={fetchAlerts}>
          <RefreshCcw size={14} /> Refresh
        </button>
      </div>

      <div className="card" style={{ marginBottom: '20px' }}>
        <div className="filter-row">
          <div style={{ flex: 1, position: 'relative' }}>
            <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input 
              className="form-input" 
              placeholder="Search by IP, Threat Type..." 
              style={{ paddingLeft: '40px' }}
            />
          </div>
          <select 
            className="form-input" 
            value={filters.severity} 
            onChange={e => setFilters({...filters, severity: e.target.value})}
          >
            <option value="">All Severities</option>
            <option value="critical">Critical</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
          <select 
            className="form-input" 
            value={filters.status} 
            onChange={e => setFilters({...filters, status: e.target.value})}
          >
            <option value="">All Statuses</option>
            <option value="open">Open</option>
            <option value="investigating">Investigating</option>
            <option value="resolved">Resolved</option>
          </select>
        </div>

        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Threat Type</th>
                <th>Severity</th>
                <th>Source IP</th>
                <th>Destination IP</th>
                <th>Status</th>
                <th>Time</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="8" style={{ textAlign: 'center', padding: '40px' }}>
                    <div className="loading-spinner" style={{ margin: '0 auto' }} />
                  </td>
                </tr>
              ) : alerts.length === 0 ? (
                <tr>
                  <td colSpan="8" style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                    No alerts found
                  </td>
                </tr>
              ) : (
                alerts.map(alert => (
                  <tr key={alert.id}>
                    <td className="mono">#{alert.id}</td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <AlertCircle size={14} color={alert.severity === 'critical' ? 'var(--danger)' : 'var(--warning)'} />
                        {alert.threat_type}
                      </div>
                    </td>
                    <td>
                      <span className={`badge badge-${alert.severity}`}>{alert.severity}</span>
                    </td>
                    <td className="mono">{alert.source_ip}</td>
                    <td className="mono">{alert.destination_ip}</td>
                    <td>
                      <span className={`badge badge-${alert.status}`}>{alert.status}</span>
                    </td>
                    <td style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                      {format(new Date(alert.timestamp), 'MMM d, HH:mm:ss')}
                    </td>
                    <td>
                      <button 
                        className="btn btn-ghost btn-sm" 
                        onClick={() => navigate(`/investigation?id=${alert.id}`)}
                      >
                        <Eye size={12} /> View
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
