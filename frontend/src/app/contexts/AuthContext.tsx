'use client'

import React, {createContext, useContext, useState, useEffect}  from "react"
import apiClient, { authAPI } from "../../../lib/apiService"  // ✅ Import apiClient

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

interface UserProfile {
  id: number
  username: string
  email: string
  full_name: string
  role: string
  is_active: boolean
  created_at: string
  current_role?: string
  industry?: string
  years_of_experience?: number
  career_goals?: string
  location?: string
  resume_analyses_count?: number
  cover_letters_count?: number
  optimizations_count?: number
  chat_messages_count?: number
}

interface AuthContextType {
  user: User | null
  userProfile: UserProfile | null
  updateProfile: (profileData: Partial<UserProfile>) => Promise<void>
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
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // Token is handled by apiClient interceptor, so we just need to set it
  useEffect(() => {
    if (token) {
      localStorage.setItem('token', token)
    } else {
      localStorage.removeItem('token')
    }
  }, [token])

  // Loading token and user from localStorage on mount
  useEffect(() => {
    const loadAuth = async () => {
      try {
        const savedToken = localStorage.getItem('auth_token')
        if (savedToken) {
          setToken(savedToken)
          localStorage.setItem('token', savedToken) // For apiClient interceptor
          
          // ✅ FIXED: Use authAPI instead of hardcoded URL
          const response = await authAPI.getProfile()
          setUser(response.data)
          setUserProfile(response.data)
        }
      } catch (error) {
        console.error('Error loading auth:', error)
        // Token is invalid, clear it
        localStorage.removeItem('auth_token')
        localStorage.removeItem('token')
        setToken(null)
      } finally {
        setIsLoading(false)
      }
    }

    loadAuth()
  }, [])

  const login = async (username: string, password: string) => {
  try {
    console.log('🔐 Attempting login for:', username)
    
    const response = await authAPI.login({ username, password })
    
    console.log('📥 Login response:', response.data)
    
    const { access_token, user: userData } = response.data
    
    // ✅ Debug: Check if token is valid
    console.log('🔑 Access token received:', access_token ? 'YES' : 'NO')
    console.log('🔑 Token length:', access_token?.length)
    console.log('🔑 Token preview:', access_token?.substring(0, 50) + '...')
    console.log('👤 User data:', userData)
    
    // Store token
    setToken(access_token)
    setUser(userData)
    setUserProfile(userData)
    localStorage.setItem('auth_token', access_token)
    localStorage.setItem('token', access_token)
    
    // ✅ Verify token was saved
    const savedToken = localStorage.getItem('token')
    console.log('✅ Token saved to localStorage:', savedToken ? 'YES' : 'NO')
    console.log('✅ Saved token matches:', savedToken === access_token)
    
    // ✅ Wait a moment for state to update
    await new Promise(resolve => setTimeout(resolve, 100))
    
    return { success: true }
  } catch (error: unknown) {
    console.error('❌ Login error:', error)
    const errorMessage = error instanceof Error && 'response' in error 
      ? (error as any).response?.data?.detail || 'Login failed'
      : 'Login failed'
    console.error('❌ Error message:', errorMessage)
    return { success: false, error: errorMessage }
  }
  }

  const register = async (username: string, email: string, password: string, fullName: string) => {
    try {
      // ✅ FIXED: Use authAPI instead of hardcoded URL
      const response = await authAPI.register({
        username,
        email,
        password,
        full_name: fullName
      })

      const { access_token, user: userData } = response.data
      
      setToken(access_token)
      setUser(userData)
      setUserProfile(userData)
      localStorage.setItem('auth_token', access_token)
      localStorage.setItem('token', access_token)

      return { success: true }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error && 'response' in error 
        ? (error as any).response?.data?.detail || 'Registration failed'
        : 'Registration failed'
      return { success: false, error: errorMessage }
    }
  }

  const logout = () => {
    setUser(null)
    setUserProfile(null)
    setToken(null)
    localStorage.removeItem('auth_token')
    localStorage.removeItem('token')
  }

  const refreshUser = async () => {
    if (!token) return
    
    try {
      // ✅ FIXED: Use authAPI instead of hardcoded URL
      const response = await authAPI.getProfile()
      setUser(response.data)
      setUserProfile(response.data)
    } catch (error) {
      console.error('Error refreshing user:', error)
    }
  }

  const updateProfile = async (profileData: Partial<UserProfile>) => {
    if (!token) {
      throw new Error('Not authenticated')
    }

    try {
      // ✅ FIXED: Use apiClient instead of hardcoded URL
      const response = await apiClient.patch('/api/auth/profile', profileData)
      
      setUserProfile(response.data)
      // Also update user if the response includes user data
      if (response.data) {
        setUser(prev => prev ? { ...prev, ...response.data } : null)
      }
    } catch (error: unknown) {
      console.error('Error updating profile:', error)
      const errorMessage = error instanceof Error && 'response' in error 
        ? (error as any).response?.data?.detail || 'Failed to update profile'
        : 'Failed to update profile'
      throw new Error(errorMessage)
    }
  }

  const value = {
    user,
    userProfile,
    updateProfile,
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