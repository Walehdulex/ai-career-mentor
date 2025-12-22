import axios from 'axios'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

// Create axios instance
const apiClient = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

// ✅ FIX: Add typeof window check for localStorage
apiClient.interceptors.request.use(
  (config) => {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('token')
      
      // Debug logging
      console.log('🔑 Request to:', config.url)
      console.log('🔑 Token exists:', !!token)
      
      if (token) {
        config.headers.Authorization = `Bearer ${token}`
      } else {
        console.warn('⚠️ No token found in localStorage')
      }
    }
    return config
  },
  (error) => {
    console.error('❌ Request error:', error)
    return Promise.reject(error)
  }
)

// ✅ ADD: Response interceptor for better error handling
apiClient.interceptors.response.use(
  (response) => {
    console.log('✅ Response:', response.config.url, response.status)
    return response
  },
  (error) => {
    console.error('❌ API Error:', {
      url: error.config?.url,
      status: error.response?.status,
      detail: error.response?.data?.detail,
      message: error.message
    })
    
    if (error.response?.status === 401) {
      console.error('❌ 401 Unauthorized - Token invalid or missing')
      if (typeof window !== 'undefined') {
        localStorage.removeItem('token')
        // Optionally redirect to login
        // window.location.href = '/login'
      }
    }
    
    return Promise.reject(error)
  }
)

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

// ✅ ADD: Jobs APIs for your jobs page
export const jobsAPI = {
  getRecommendations: (params?: { limit?: number; min_score?: number }) =>
    apiClient.get('/api/jobs/recommendations', { params }),
  
  getApplications: () =>
    apiClient.get('/api/applications'),
  
  applyToJob: (jobId: number) =>
    apiClient.post('/api/applications', { job_id: jobId }),
  
  updateApplication: (id: number, data: any) =>
    apiClient.patch(`/api/applications/${id}`, data),
  
  saveJob: (jobId: number) =>
    apiClient.post(`/api/jobs/${jobId}/save`),
  
  unsaveJob: (jobId: number) =>
    apiClient.delete(`/api/jobs/${jobId}/unsave`),
}

export default apiClient