import { useEffect, useState } from 'react'
import { threatIntelAPI } from '../services/api'
import { Globe, Shield, Terminal, Search, ExternalLink, AlertTriangle } from 'lucide-react'
import toast from 'react-hot-toast'

export default function ThreatIntel() {
  const [intel, setIntel] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchIntel()
  }, [])

  const fetchIntel = async () => {
    setLoading(true)
    try {
      const res = await threatIntelAPI.get()
      setIntel(res)
    } catch (err) {
      toast.error('Failed to load threat intelligence')
    } finally {
      setLoading(false)
    }
  }

  if (loading || !intel) {
    return <div className="page-loading"><div className="loading-spinner" /></div>
  }

  return (
    <div className="page-wrapper fade-in-up">
      <div className="page-header">
        <div>
          <h1 className="page-title">Threat Intelligence Center</h1>
          <p className="page-subtitle">Global blacklist and suspicious pattern database</p>
        </div>
        <button className="btn btn-primary btn-sm" onClick={fetchIntel}>
          Update Database
        </button>
      </div>

      <div className="grid-2">
        <div className="card">
          <div className="section-title"><Globe size={14} /> Blacklisted IP Addresses</div>
          <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '16px' }}>
            Known malicious IPs involved in recent botnet or C2 activity.
          </p>
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>IP Address</th>
                  <th>Risk</th>
                  <th>Source</th>
                </tr>
              </thead>
              <tbody>
                {intel.blacklisted_ips.map((ip, i) => (
                  <tr key={i}>
                    <td className="mono" style={{ color: 'var(--danger)' }}>{ip}</td>
                    <td><span className="badge badge-critical">CRITICAL</span></td>
                    <td style={{ fontSize: '11px', color: 'var(--text-muted)' }}>ThreatFeed v2</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div className="card">
            <div className="section-title"><Shield size={14} /> Suspicious Domains</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {intel.malicious_domains.map((domain, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px', background: 'rgba(255,255,255,0.03)', borderRadius: '6px' }}>
                  <span className="mono" style={{ fontSize: '13px' }}>{domain}</span>
                  <ExternalLink size={14} color="var(--text-muted)" />
                </div>
              ))}
            </div>
          </div>

          <div className="card">
            <div className="section-title"><AlertTriangle size={14} /> Heuristic Patterns</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {intel.suspicious_patterns.map((pattern, i) => (
                <div key={i} style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                  <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--primary)', marginTop: '6px' }} />
                  <p style={{ fontSize: '13px', color: 'var(--text-primary)' }}>{pattern}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
