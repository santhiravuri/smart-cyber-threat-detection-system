import { useEffect, useState, useCallback } from 'react'
import { alertsAPI, logsAPI, threatIntelAPI } from '../services/api'
import toast from 'react-hot-toast'
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts'
import {
  AlertTriangle, Shield, Eye, CheckCircle, Activity, Zap,
  TrendingUp, Clock, RefreshCw
} from 'lucide-react'
import { format } from 'date-fns'

const SEVERITY_COLORS = {
  critical: '#ef4444', high: '#f59e0b', medium: '#a855f7', low: '#10b981'
}

const ATTACK_COLORS = ['#00d4ff', '#ef4444', '#f59e0b', '#10b981', '#7c3aed', '#ec4899', '#f97316']

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload?.length) {
    return (
      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '8px', padding: '10px 14px', fontSize: '12px' }}>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '4px' }}>{label}</p>
        {payload.map((p, i) => (
          <p key={i} style={{ color: p.color }}>{p.name}: <strong>{p.value}</strong></p>
        ))}
      </div>
    )
  }
  return null
}

export default function Dashboard() {
  const [stats, setStats] = useState(null)
  const [logStats, setLogStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [lastUpdated, setLastUpdated] = useState(new Date())

  const fetchData = useCallback(async () => {
    try {
      const [alertStats, logSt] = await Promise.all([
        alertsAPI.getStats().catch(() => null),
        logsAPI.getStats().catch(() => null)
      ])
      setStats(alertStats)
      setLogStats(logSt)
      setLastUpdated(new Date())
    } catch (err) {
      console.warn('Dashboard data fetch issue:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
    const interval = setInterval(fetchData, 30000) // refresh every 30s
    return () => clearInterval(interval)
  }, [fetchData])

  const simulate = async () => {
    try {
      await threatIntelAPI.simulateThreat({})
      toast.success('🚨 Threat simulation triggered!', { style: { background: '#ef4444', color: '#fff' } })
    } catch {
      toast.error('Backend not connected. Start the Node.js server first.')
    }
  }

  const summary = stats?.summary || {}
  const byType = stats?.byType || []
  const hourly = stats?.hourly || []
  const protocolData = logStats?.protocol || []

  const statCards = [
    { label: 'Total Threats', value: summary.total_alerts || 0, icon: AlertTriangle, color: '#ef4444', bg: 'rgba(239,68,68,0.1)' },
    { label: 'Critical Alerts', value: summary.critical_alerts || 0, icon: Zap, color: '#ef4444', bg: 'rgba(239,68,68,0.1)' },
    { label: 'Investigating', value: summary.investigating_alerts || 0, icon: Eye, color: '#f59e0b', bg: 'rgba(245,158,11,0.1)' },
    { label: 'Resolved', value: summary.resolved_alerts || 0, icon: CheckCircle, color: '#10b981', bg: 'rgba(16,185,129,0.1)' },
  ]

  if (loading) {
    return (
      <div className="page-loading">
        <div className="loading-spinner" />
        <span>Loading security intelligence...</span>
      </div>
    )
  }

  return (
    <div className="page-wrapper fade-in-up">
      <div className="page-header">
        <div>
          <h1 className="page-title">Security Operations Center</h1>
          <p className="page-subtitle">Real-time threat intelligence and network monitoring</p>
        </div>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <div className="live-indicator"><div className="live-dot" /> Live Monitoring</div>
          <button className="btn btn-ghost btn-sm" onClick={fetchData} id="refresh-btn"><RefreshCw size={14} /> Refresh</button>
          <button className="btn btn-danger btn-sm" onClick={simulate} id="simulate-threat-btn" title="Simulate a threat for demo"><Zap size={14} /> Simulate Threat</button>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid-4" style={{ marginBottom: '20px' }}>
        {statCards.map((s, i) => (
          <div className="stat-card" key={i}>
            <div className="stat-icon" style={{ background: s.bg, color: s.color }}>
              <s.icon size={24} />
            </div>
            <div>
              <div className="stat-value" style={{ color: s.color }}>{s.value.toLocaleString()}</div>
              <div className="stat-label">{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Charts Row 1 */}
      <div className="grid-2-1" style={{ marginBottom: '20px' }}>
        {/* Hourly threats */}
        <div className="card">
          <div className="section-title"><Activity size={14} /> Threats Per Hour (24h)</div>
          {hourly.length === 0 ? (
            <div className="empty-state"><Activity size={32} /><p>No alerts in the last 24 hours</p></div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={hourly.map(h => ({ hour: format(new Date(h.hour), 'HH:mm'), count: parseInt(h.count) }))}>
                <defs>
                  <linearGradient id="g1" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#00d4ff" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#00d4ff" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                <XAxis dataKey="hour" stroke="var(--text-muted)" tick={{ fontSize: 11 }} />
                <YAxis stroke="var(--text-muted)" tick={{ fontSize: 11 }} />
                <Tooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="count" name="Threats" stroke="#00d4ff" strokeWidth={2} fill="url(#g1)" />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Attack type distribution */}
        <div className="card">
          <div className="section-title"><Shield size={14} /> Attack Distribution</div>
          {byType.length === 0 ? (
            <div className="empty-state"><Shield size={32} /><p>No data yet</p></div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={byType.map(t => ({ name: t.attack_category, value: parseInt(t.count) }))} cx="50%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={3} dataKey="value">
                  {byType.map((_, i) => <Cell key={i} fill={ATTACK_COLORS[i % ATTACK_COLORS.length]} />)}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: '11px', color: 'var(--text-secondary)' }} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Charts Row 2 */}
      <div className="grid-2" style={{ marginBottom: '20px' }}>
        {/* Protocol usage */}
        <div className="card">
          <div className="section-title"><TrendingUp size={14} /> Protocol Usage</div>
          {protocolData.length === 0 ? (
            <div className="empty-state"><TrendingUp size={32} /><p>No protocol data. Logs needed.</p></div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={protocolData.map(p => ({ protocol: p.protocol, count: parseInt(p.count) }))}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                <XAxis dataKey="protocol" stroke="var(--text-muted)" tick={{ fontSize: 11 }} />
                <YAxis stroke="var(--text-muted)" tick={{ fontSize: 11 }} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="count" name="Requests" fill="#7c3aed" radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Alert Status Breakdown */}
        <div className="card">
          <div className="section-title"><Clock size={14} /> Alert Status Overview</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', padding: '8px 0' }}>
            {[
              { label: 'Open', val: summary.open_alerts || 0, color: '#ef4444', pct: summary.total_alerts ? Math.round((summary.open_alerts / summary.total_alerts) * 100) : 0 },
              { label: 'Investigating', val: summary.investigating_alerts || 0, color: '#f59e0b', pct: summary.total_alerts ? Math.round((summary.investigating_alerts / summary.total_alerts) * 100) : 0 },
              { label: 'Resolved', val: summary.resolved_alerts || 0, color: '#10b981', pct: summary.total_alerts ? Math.round((summary.resolved_alerts / summary.total_alerts) * 100) : 0 },
            ].map(item => (
              <div key={item.label}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{item.label}</span>
                  <span style={{ fontSize: '13px', fontWeight: 600, color: item.color }}>{item.val}</span>
                </div>
                <div style={{ height: 6, background: 'rgba(255,255,255,0.06)', borderRadius: '3px', overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${item.pct}%`, background: item.color, borderRadius: '3px', transition: 'width 1s ease', boxShadow: `0 0 8px ${item.color}` }} />
                </div>
              </div>
            ))}
          </div>
          <div style={{ marginTop: '16px', padding: '12px', background: 'rgba(255,255,255,0.03)', borderRadius: '8px', display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Last updated: {format(lastUpdated, 'HH:mm:ss')}</span>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Auto-refresh: 30s</span>
          </div>
        </div>
      </div>
    </div>
  )
}
