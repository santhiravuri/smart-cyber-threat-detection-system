import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import toast, { Toaster } from 'react-hot-toast'
import { Shield, Eye, EyeOff, Zap, Lock, Mail, ArrowRight } from 'lucide-react'

export default function LoginPage() {
  const { login } = useAuth()
  const [form, setForm] = useState({ email: '', password: '' })
  const [show, setShow] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      await login(form.email, form.password)
      toast.success('Welcome back, Analyst!')
    } catch (err) {
      toast.error(err.message || 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  const fillDemo = (role) => {
    if (role === 'admin') setForm({ email: 'admin@cyberdefense.io', password: 'Admin@123' })
    else setForm({ email: 'analyst@cyberdefense.io', password: 'Admin@123' })
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', fontFamily: 'var(--font-main)', position: 'relative', overflow: 'hidden' }}>
      <Toaster position="top-right" toastOptions={{ style: { background: 'var(--bg-card)', color: 'var(--text-primary)', border: '1px solid var(--border)' } }} />

      {/* Cyber grid background */}
      <div style={{ position: 'absolute', inset: 0, backgroundImage: 'linear-gradient(rgba(0,212,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(0,212,255,0.03) 1px, transparent 1px)', backgroundSize: '50px 50px', pointerEvents: 'none' }} />
      {/* Gradient blobs */}
      <div style={{ position: 'absolute', width: '500px', height: '500px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(0,212,255,0.06) 0%, transparent 70%)', top: '-100px', right: '-100px', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', width: '400px', height: '400px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(124,58,237,0.08) 0%, transparent 70%)', bottom: '-100px', left: '-100px', pointerEvents: 'none' }} />

      <div style={{ width: '100%', maxWidth: '440px', position: 'relative', zIndex: 1 }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 72, height: 72, borderRadius: '20px', background: 'linear-gradient(135deg, rgba(0,212,255,0.2), rgba(124,58,237,0.2))', border: '1px solid rgba(0,212,255,0.3)', marginBottom: '20px', boxShadow: '0 0 30px rgba(0,212,255,0.2)' }}>
            <Shield size={36} color="var(--primary)" />
          </div>
          <h1 style={{ fontSize: '26px', fontWeight: '800', letterSpacing: '-0.5px', color: 'var(--text-primary)' }}>
            Cyber<span style={{ color: 'var(--primary)', textShadow: '0 0 20px rgba(0,212,255,0.5)' }}>Shield</span>
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginTop: '4px' }}>Smart Threat Detection System</p>
        </div>

        {/* Card */}
        <div className="card" style={{ padding: '32px' }}>
          <h2 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '6px', color: 'var(--text-primary)' }}>Sign in to SOC Dashboard</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginBottom: '28px' }}>Enter your credentials to access the security console</p>

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">Email Address</label>
              <div style={{ position: 'relative' }}>
                <Mail size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input
                  className="form-input"
                  type="email"
                  placeholder="analyst@cyberdefense.io"
                  value={form.email}
                  onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                  style={{ paddingLeft: '40px' }}
                  required
                  id="email-input"
                />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Password</label>
              <div style={{ position: 'relative' }}>
                <Lock size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input
                  className="form-input"
                  type={show ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={form.password}
                  onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                  style={{ paddingLeft: '40px', paddingRight: '44px' }}
                  required
                  id="password-input"
                />
                <button type="button" onClick={() => setShow(s => !s)} style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
                  {show ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button className="btn btn-primary btn-lg" type="submit" disabled={loading} style={{ width: '100%', justifyContent: 'center' }} id="login-btn">
              {loading ? (
                <><div className="loading-spinner" style={{ width: 18, height: 18, borderWidth: 2 }} /> Authenticating...</>
              ) : (
                <><Zap size={16} /> Access Dashboard</>
              )}
            </button>
          </form>

          {/* Demo credentials */}
          <div style={{ marginTop: '24px', padding: '16px', background: 'rgba(0,212,255,0.05)', borderRadius: '8px', border: '1px solid rgba(0,212,255,0.1)' }}>
            <p style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '10px' }}>Demo Credentials</p>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <button className="btn btn-ghost btn-sm" onClick={() => fillDemo('admin')} id="demo-admin-btn">Admin</button>
              <button className="btn btn-ghost btn-sm" onClick={() => fillDemo('analyst')} id="demo-analyst-btn">SOC Analyst</button>
            </div>
          </div>

          <div style={{ marginTop: '24px', textAlign: 'center' }}>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
              Don't have an account? 
              <Link to="/register" style={{ color: 'var(--primary)', marginLeft: '6px', textDecoration: 'none', fontWeight: 600 }}>
                Create One <ArrowRight size={12} style={{ verticalAlign: 'middle' }} />
              </Link>
            </p>
          </div>
        </div>

        <p style={{ textAlign: 'center', marginTop: '20px', fontSize: '12px', color: 'var(--text-muted)' }}>
          © 2026 CyberShield SOC Platform. Secured by AI.
        </p>
      </div>
    </div>
  )
}
