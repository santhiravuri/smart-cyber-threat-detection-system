import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { AuthProvider, useAuth } from './context/AuthContext'

// Layout
import Sidebar from './components/layout/Sidebar'

// Pages
import Login from './pages/Login'
import Register from './pages/Register'
import Dashboard from './pages/Dashboard'
import Monitor from './pages/Monitor'
import Alerts from './pages/Alerts'
import Investigation from './pages/Investigation'
import ThreatIntel from './pages/ThreatIntel'
import Settings from './pages/Settings'

function PrivateRoute({ children }) {
  const { isAuthenticated, loading } = useAuth()
  
  if (loading) return <div className="page-loading"><div className="loading-spinner" /></div>
  return isAuthenticated ? children : <Navigate to="/login" />
}

function AppLayout({ children }) {
  return (
    <div className="app-shell">
      <Sidebar />
      <main className="main-content">
        {children}
      </main>
    </div>
  )
}

function AppRoutes() {
  const { isAuthenticated } = useAuth()

  return (
    <Routes>
      <Route path="/login" element={!isAuthenticated ? <Login /> : <Navigate to="/dashboard" />} />
      <Route path="/register" element={!isAuthenticated ? <Register /> : <Navigate to="/dashboard" />} />
      
      <Route path="/dashboard" element={<PrivateRoute><AppLayout><Dashboard /></AppLayout></PrivateRoute>} />
      <Route path="/monitor" element={<PrivateRoute><AppLayout><Monitor /></AppLayout></PrivateRoute>} />
      <Route path="/alerts" element={<PrivateRoute><AppLayout><Alerts /></AppLayout></PrivateRoute>} />
      <Route path="/investigation" element={<PrivateRoute><AppLayout><Investigation /></AppLayout></PrivateRoute>} />
      <Route path="/threat-intel" element={<PrivateRoute><AppLayout><ThreatIntel /></AppLayout></PrivateRoute>} />
      <Route path="/settings" element={<PrivateRoute><AppLayout><Settings /></AppLayout></PrivateRoute>} />
      
      <Route path="/" element={<Navigate to="/dashboard" />} />
      <Route path="*" element={<Navigate to="/dashboard" />} />
    </Routes>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Toaster position="top-right" toastOptions={{ 
          style: { 
            background: 'var(--bg-card)', 
            color: 'var(--text-primary)', 
            border: '1px solid var(--border)',
            fontSize: '14px'
          } 
        }} />
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  )
}
