'use client'

import React, {createContext, useContext, useState, useEffect}  from "react"
import axios from "axios"


interface User {
  id: number
  username: string
  email: string
  full_name: string
  role: string
  is_active: boolean
  created_at: string
  resume_analyses_count?: number
  cover_letters_count?: number
  optimizations_count?: number
  chat_messages_count?: number
}

interface AuthContextType {
  user: User | null
  token: string | null
  isLoading: boolean
  login: (username: string, password: string) => Promise<{ success: boolean; error?: string }>
  register: (username: string, email: string, password: string, fullName: string) => Promise<{ success: boolean; error?: string }>
  logout: () => void
  refreshUser: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // Setting up axios interceptor for authentication
  useEffect(() => {
    const interceptor = axios.interceptors.request.use(
      (config) => {
        if (token) {
          config.headers.Authorization = `Bearer ${token}`
        }
        return config
      },
      (error) => Promise.reject(error)
    )

    return () => axios.interceptors.request.eject(interceptor)
  }, [token])

  // Loading token and user from localStorage on mount
  useEffect(() => {
    const loadAuth = async () => {
      try {
        const savedToken = localStorage.getItem('auth_token')
        if (savedToken) {
          setToken(savedToken)
          // Verifying token and get user info
          const response = await axios.get('http://localhost:8000/api/auth/me', {
            headers: { Authorization: `Bearer ${savedToken}` }
          })
          setUser(response.data)
        }
      } catch (error) {
        console.error('Error loading auth:', error)
        // Token is invalid, clear it
        localStorage.removeItem('auth_token')
        setToken(null)
      } finally {
        setIsLoading(false)
      }
    }

    loadAuth()
  }, [])

  const login = async (username: string, password: string) => {
    try {
      const response = await axios.post('http://localhost:8000/api/auth/login', {
        username,
        password
      })

      const { access_token, user: userData } = response.data
      
      setToken(access_token)
      setUser(userData)
      localStorage.setItem('auth_token', access_token)
      localStorage.setItem('token', access_token) 

      return { success: true }
    } catch (error: any) {
      const errorMessage = error.response?.data?.detail || 'Login failed'
      return { success: false, error: errorMessage }
    }
  }

  const register = async (username: string, email: string, password: string, fullName: string) => {
    try {
      const response = await axios.post('http://localhost:8000/api/auth/register', {
        username,
        email,
        password,
        full_name: fullName,
        role: 'job_seeker'
      })

      const { access_token, user: userData } = response.data
      
      setToken(access_token)
      setUser(userData)
      localStorage.setItem('auth_token', access_token)
      localStorage.setItem('token', access_token) 

      return { success: true }
    } catch (error: any) {
      const errorMessage = error.response?.data?.detail || 'Registration failed'
      return { success: false, error: errorMessage }
    }
  }

  const logout = () => {
    setUser(null)
    setToken(null)
    localStorage.removeItem('auth_token')
    localStorage.removeItem('token') 
  }

  const refreshUser = async () => {
    if (!token) return
    
    try {
      const response = await axios.get('http://localhost:8000/api/auth/me')
      setUser(response.data)
    } catch (error) {
      console.error('Error refreshing user:', error)
    }
  }

  const value = {
    user,
    token,
    isLoading,
    login,
    register,
    logout,
    refreshUser
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

