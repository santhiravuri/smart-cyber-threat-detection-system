import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { authAPI } from '../services/api'
import toast, { Toaster } from 'react-hot-toast'
import { Shield, User, Lock, Mail, Users, Zap, ArrowRight } from 'lucide-react'

export default function Register() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'analyst' })
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      const res = await authAPI.register(form)
      toast.success('Account created! Logging you in...')
      // Auto-login after registration
      localStorage.setItem('cyber_token', res.token)
      localStorage.setItem('cyber_user', JSON.stringify(res.user))
      window.location.href = '/dashboard'
    } catch (err) {
      toast.error(err.message || 'Registration failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', fontFamily: 'var(--font-main)', position: 'relative', overflow: 'hidden' }}>
      <Toaster position="top-right" />
      
      {/* Cyber grid background */}
      <div style={{ position: 'absolute', inset: 0, backgroundImage: 'linear-gradient(rgba(0,212,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(0,212,255,0.03) 1px, transparent 1px)', backgroundSize: '50px 50px', pointerEvents: 'none' }} />
      
      <div style={{ width: '100%', maxWidth: '440px', position: 'relative', zIndex: 1 }}>
        <div style={{ textAlign: 'center', marginBottom: '30px' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 64, height: 64, borderRadius: '16px', background: 'rgba(0,212,255,0.1)', border: '1px solid var(--border)', marginBottom: '16px' }}>
            <Shield size={32} color="var(--primary)" />
          </div>
          <h1 style={{ fontSize: '24px', fontWeight: '800', color: 'var(--text-primary)' }}>Join the <span style={{ color: 'var(--primary)' }}>Defense</span></h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>Create your SOC Analyst credentials</p>
        </div>

        <div className="card" style={{ padding: '32px' }}>
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">Full Name</label>
              <div style={{ position: 'relative' }}>
                <User size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input
                  className="form-input"
                  placeholder="John Doe"
                  value={form.name}
                  onChange={e => setForm({ ...form, name: e.target.value })}
                  style={{ paddingLeft: '40px' }}
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Email Address</label>
              <div style={{ position: 'relative' }}>
                <Mail size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input
                  className="form-input"
                  type="email"
                  placeholder="analyst@cyberdefense.io"
                  value={form.email}
                  onChange={e => setForm({ ...form, email: e.target.value })}
                  style={{ paddingLeft: '40px' }}
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Role</label>
              <div style={{ position: 'relative' }}>
                <Users size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <select
                  className="form-input"
                  value={form.role}
                  onChange={e => setForm({ ...form, role: e.target.value })}
                  style={{ paddingLeft: '40px' }}
                  required
                >
                  <option value="analyst">Security Analyst</option>
                  <option value="admin">System Admin</option>
                </select>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Access Password</label>
              <div style={{ position: 'relative' }}>
                <Lock size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input
                  className="form-input"
                  type="password"
                  placeholder="••••••••"
                  value={form.password}
                  onChange={e => setForm({ ...form, password: e.target.value })}
                  style={{ paddingLeft: '40px' }}
                  required
                />
              </div>
            </div>

            <button className="btn btn-primary btn-lg" type="submit" disabled={loading} style={{ width: '100%', justifyContent: 'center' }}>
              {loading ? 'Creating Account...' : <><Zap size={16} /> Register Identity</>}
            </button>
          </form>

          <div style={{ marginTop: '24px', textAlign: 'center' }}>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
              Already have an identity? 
              <Link to="/login" style={{ color: 'var(--primary)', marginLeft: '6px', textDecoration: 'none', fontWeight: 600 }}>
                Sign In <ArrowRight size={12} style={{ verticalAlign: 'middle' }} />
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
