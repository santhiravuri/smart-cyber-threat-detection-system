import React, { createContext, useContext, useState, useEffect } from 'react'
import { authAPI } from '../services/api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem('cyber_token')
    const savedUser = localStorage.getItem('cyber_user')
    if (token && savedUser) {
      try {
        setUser(JSON.parse(savedUser))
      } catch {}
    }
    setLoading(false)
  }, [])

  const login = async (email, password) => {
    const res = await authAPI.login(email, password)
    localStorage.setItem('cyber_token', res.token)
    localStorage.setItem('cyber_user', JSON.stringify(res.user))
    setUser(res.user)
    return res
  }

  const logout = () => {
    localStorage.removeItem('cyber_token')
    localStorage.removeItem('cyber_user')
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, login, logout, loading, isAuthenticated: !!user }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
