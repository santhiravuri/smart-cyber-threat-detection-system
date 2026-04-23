import { User, Settings as SettingsIcon, Bell, Shield, Database, Trash2 } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import toast from 'react-hot-toast'

export default function Settings() {
  const { user } = useAuth()

  return (
    <div className="page-wrapper fade-in-up">
      <div className="page-header">
        <div>
          <h1 className="page-title">SOC Settings</h1>
          <p className="page-subtitle">Configure security thresholds and user preferences</p>
        </div>
      </div>

      <div className="grid-2-1">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div className="card">
            <div className="section-title"><User size={14} /> Profile Information</div>
            <div className="grid-2">
              <div className="form-group">
                <label className="form-label">Full Name</label>
                <input className="form-input" value={user?.name || ''} readOnly />
              </div>
              <div className="form-group">
                <label className="form-label">Role</label>
                <input className="form-input" value={user?.role || ''} readOnly />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Email Address</label>
              <input className="form-input" value={user?.email || ''} readOnly />
            </div>
            <button className="btn btn-ghost" onClick={() => toast.error('Profile editing disabled for demo')}>
              Update Profile
            </button>
          </div>

          <div className="card">
            <div className="section-title"><Database size={14} /> Data Management</div>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '20px' }}>
              Manage logs and historical alert data retention policies.
            </p>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button className="btn btn-ghost btn-sm" onClick={() => toast.success('Log backup started...')}>
                <Database size={14} /> Backup Logs
              </button>
              <button className="btn btn-danger btn-sm" onClick={() => toast.error('Deletion requires Admin privilege')}>
                <Trash2 size={14} /> Purge 30d Logs
              </button>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div className="card">
            <div className="section-title"><Bell size={14} /> Notifications</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '13px' }}>Critical Alert Email</span>
                <input type="checkbox" defaultChecked />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '13px' }}>Weekly SOC Report</span>
                <input type="checkbox" defaultChecked />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '13px' }}>Browser Notifications</span>
                <input type="checkbox" defaultChecked />
              </div>
            </div>
          </div>

          <div className="card">
            <div className="section-title"><Shield size={14} /> ML Thresholds</div>
            <div className="form-group">
              <label className="form-label">Alert Sensitivity: 0.85</label>
              <input type="range" min="0" max="1" step="0.05" defaultValue="0.85" style={{ width: '100%' }} />
              <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '8px' }}>
                Lowering sensitivity may increase false positives but reduces risk of missed threats.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
