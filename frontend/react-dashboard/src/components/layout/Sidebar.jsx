import { useEffect, useState, useRef } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import {
  Shield, LayoutDashboard, Radio, Bell, FileSearch,
  Globe, Settings, LogOut, ChevronRight, User, Wifi
} from 'lucide-react'
import { io } from 'socket.io-client'

const navItems = [
  { icon: LayoutDashboard, label: 'Dashboard', path: '/dashboard' },
  { icon: Radio, label: 'Threat Monitor', path: '/monitor' },
  { icon: Bell, label: 'Alerts', path: '/alerts' },
  { icon: FileSearch, label: 'Investigation', path: '/investigation' },
  { icon: Globe, label: 'Threat Intel', path: '/threat-intel' },
  { icon: Settings, label: 'Settings', path: '/settings' },
]

export default function Sidebar({ onNewAlert }) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [wsStatus, setWsStatus] = useState('connecting')
  const [alertCount, setAlertCount] = useState(0)
  const socketRef = useRef(null)

  useEffect(() => {
    const socket = io(import.meta.env.VITE_API_URL || 'http://localhost:5000', { transports: ['websocket', 'polling'] })
    socketRef.current = socket

    socket.on('connect', () => setWsStatus('connected'))
    socket.on('disconnect', () => setWsStatus('disconnected'))
    socket.on('connect_error', () => setWsStatus('error'))
    socket.on('new_alert', (data) => {
      setAlertCount(c => c + 1)
      if (onNewAlert) onNewAlert(data)
    })
    return () => socket.disconnect()
  }, [onNewAlert])

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <aside style={{
      position: 'fixed', left: 0, top: 0, bottom: 0, width: '260px',
      background: 'var(--bg-secondary)', borderRight: '1px solid var(--border)',
      display: 'flex', flexDirection: 'column', zIndex: 100,
      backdropFilter: 'blur(20px)'
    }}>
      {/* Logo */}
      <div style={{ padding: '24px 20px 20px', borderBottom: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ width: 40, height: 40, borderRadius: '10px', background: 'linear-gradient(135deg, rgba(0,212,255,0.2), rgba(124,58,237,0.2))', border: '1px solid rgba(0,212,255,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 15px rgba(0,212,255,0.2)' }}>
            <Shield size={22} color="var(--primary)" />
          </div>
          <div>
            <div style={{ fontWeight: 800, fontSize: '16px', letterSpacing: '-0.5px' }}>
              Cyber<span style={{ color: 'var(--primary)' }}>Shield</span>
            </div>
            <div style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.8px' }}>SOC Platform v1.0</div>
          </div>
        </div>

        {/* WS Status */}
        <div style={{ marginTop: '14px', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Wifi size={11} color={wsStatus === 'connected' ? 'var(--accent)' : wsStatus === 'connecting' ? 'var(--warning)' : 'var(--danger)'} />
          <span style={{ fontSize: '10px', color: wsStatus === 'connected' ? 'var(--accent)' : 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            {wsStatus === 'connected' ? 'Live Feed Active' : wsStatus === 'connecting' ? 'Connecting...' : 'Feed Disconnected'}
          </span>
          {wsStatus === 'connected' && <div className="live-dot" />}
        </div>
      </div>

      {/* Navigation */}
      <nav style={{ flex: 1, padding: '12px 12px', overflowY: 'auto' }}>
        <div style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px', padding: '8px 8px', marginBottom: '4px' }}>Navigation</div>
        {navItems.map((item) => (
          <NavLink key={item.path} to={item.path} style={({ isActive }) => ({
            display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 12px',
            borderRadius: '8px', marginBottom: '4px', textDecoration: 'none',
            color: isActive ? 'var(--primary)' : 'var(--text-secondary)',
            background: isActive ? 'rgba(0,212,255,0.08)' : 'transparent',
            border: isActive ? '1px solid rgba(0,212,255,0.15)' : '1px solid transparent',
            transition: 'all 0.2s', fontWeight: isActive ? 600 : 400,
            fontSize: '14px', position: 'relative',
          })}>
            <item.icon size={18} />
            <span style={{ flex: 1 }}>{item.label}</span>
            {item.label === 'Alerts' && alertCount > 0 && (
              <span style={{ background: 'var(--danger)', color: '#fff', fontSize: '10px', fontWeight: 700, borderRadius: '100px', padding: '1px 6px', minWidth: '18px', textAlign: 'center' }}>
                {alertCount > 99 ? '99+' : alertCount}
              </span>
            )}
          </NavLink>
        ))}
      </nav>

      {/* User */}
      <div style={{ padding: '16px', borderTop: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px', padding: '10px', borderRadius: '8px', background: 'rgba(255,255,255,0.03)' }}>
          <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--gradient-cyber)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <User size={16} color="white" />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: '13px', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user?.name}</div>
            <div style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'capitalize' }}>{user?.role}</div>
          </div>
        </div>
        <button className="btn btn-ghost" style={{ width: '100%', justifyContent: 'center', fontSize: '12px' }} onClick={handleLogout} id="logout-btn">
          <LogOut size={14} /> Sign Out
        </button>
      </div>
    </aside>
  )
}
