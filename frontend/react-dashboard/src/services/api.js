import axios from 'axios'
import toast from 'react-hot-toast'

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000'

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 10000,
})

// Attach token to all requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('cyber_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// Handle auth errors
api.interceptors.response.use(
  (response) => response.data,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('cyber_token')
      localStorage.removeItem('cyber_user')
      window.location.href = '/login'
    }
    const message = error.response?.data?.message || error.message || 'Request failed'
    return Promise.reject(new Error(message))
  }
)

// ============================================================
// Auth API
// ============================================================
export const authAPI = {
  login: (email, password) => api.post('/api/auth/login', { email, password }),
  register: (data) => api.post('/api/auth/register', data),
  me: () => api.get('/api/auth/me'),
}

// ============================================================
// Alerts API
// ============================================================
export const alertsAPI = {
  getAll: (params) => api.get('/api/alerts', { params }),
  getById: (id) => api.get(`/api/alerts/${id}`),
  updateStatus: (data) => api.put('/api/alerts/status', data),
  submitFeedback: (data) => api.post('/api/alerts/feedback', data),
  getStats: () => api.get('/api/alerts/stats/summary'),
}

// ============================================================
// Logs API
// ============================================================
export const logsAPI = {
  getAll: (params) => api.get('/api/logs', { params }),
  create: (data) => api.post('/api/logs', data),
  getStats: () => api.get('/api/logs/stats'),
}

// ============================================================
// Threat Intel API
// ============================================================
export const threatIntelAPI = {
  get: () => api.get('/api/threat-intel'),
  simulateThreat: (data) => api.post('/api/simulate-threat', data),
}

export default api
