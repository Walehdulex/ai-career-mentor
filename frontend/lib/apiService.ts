import axios from 'axios'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

// Create axios instance
const apiClient = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Add auth token to requests
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Auth APIs
export const authAPI = {
  register: (data: { username: string; email: string; password: string; full_name: string }) =>
    apiClient.post('/api/auth/register', data),
  
  login: (data: { username: string; password: string }) =>
    apiClient.post('/api/auth/login', data),
  
  getProfile: () =>
    apiClient.get('/api/auth/me'),
}

// Chat APIs
export const chatAPI = {
  sendMessage: (data: { message: string; session_id?: string }) =>
    apiClient.post('/api/chat', data),
  
  getSessions: () =>
    apiClient.get('/api/chat/sessions'),
  
  getSession: (sessionId: string) =>
    apiClient.get(`/api/chat/sessions/${sessionId}`),
  
  deleteSession: (sessionId: string) =>
    apiClient.delete(`/api/chat/sessions/${sessionId}`),
}

// Resume APIs
export const resumeAPI = {
  analyzeResume: (formData: FormData) =>
    apiClient.post('/api/resume/analyze', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  
  optimizeResume: (data: { resume_text: string; job_description: string }) =>
    apiClient.post('/api/resume/optimize', data),
  
  downloadOptimizedResume: (data: { resume_text: string; job_description: string }) =>
    apiClient.post('/api/resume/optimize/download', data, {
      responseType: 'blob',
    }),
}

// Cover Letter APIs
export const coverLetterAPI = {
  generate: (data: { resume_text: string; job_description: string; company_name: string }) =>
    apiClient.post('/api/cover-letter/generate', data),
  
  download: (data: { resume_text: string; job_description: string; company_name: string }) =>
    apiClient.post('/api/cover-letter/download', data, {
      responseType: 'blob',
    }),
}

// Profile APIs
export const profileAPI = {
  getProfile: () =>
    apiClient.get('/api/profile'),
  
  updateProfile: (data: Record<string, unknown>) =>
    apiClient.put('/api/profile', data),
  
  getAnalytics: () =>
    apiClient.get('/api/profile/analytics'),
}

export default apiClient