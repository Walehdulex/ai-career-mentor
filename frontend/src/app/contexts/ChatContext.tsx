'use client'

import React, { createContext, useContext, useState, useEffect } from 'react'
import { useAuth } from './AuthContext'
import apiClient from '../../../lib/apiService'

interface ChatMessage {
  role: string
  content: string
  timestamp: string
}

interface ChatSession {
  session_id: string
  title: string
  created_at: string
  updated_at: string
}

interface ChatContextType {
  currentSessionId: string | null
  sessions: ChatSession[]
  messages: ChatMessage[]
  isLoading: boolean
  sendMessage: (message: string) => Promise<void>
  loadSession: (sessionId: string) => Promise<void>
  createNewSession: () => void
  deleteSession: (sessionId: string) => Promise<void>
  refreshSessions: () => Promise<void>
}

const ChatContext = createContext<ChatContextType | undefined>(undefined)

export function ChatProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth()
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null)
  const [sessions, setSessions] = useState<ChatSession[]>([])
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [isLoading, setIsLoading] = useState(false)

  // ✅ Clear sessions when user changes
  useEffect(() => {
    if (!user) {
      setCurrentSessionId(null)
      setSessions([])
      setMessages([])
      localStorage.removeItem('chat_session_id')
    } else {
      refreshSessions()
    }
  }, [user])

  const refreshSessions = async () => {
    if (!user) return
    
    try {
      const response = await apiClient.get('/api/chat/sessions')
      setSessions(response.data)
    } catch (error) {
      console.error('Error loading sessions:', error)
    }
  }

  const loadSession = async (sessionId: string) => {
    try {
      setIsLoading(true)
      const response = await apiClient.get(`/api/chat/sessions/${sessionId}`)
      setMessages(response.data)
      setCurrentSessionId(sessionId)
      localStorage.setItem('chat_session_id', sessionId)
    } catch (error) {
      console.error('Error loading session:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const sendMessage = async (message: string) => {
    try {
      setIsLoading(true)
      const response = await apiClient.post('/api/chat', {
        message,
        session_id: currentSessionId
      })

      const newSessionId = response.data.session_id
      
      if (newSessionId !== currentSessionId) {
        setCurrentSessionId(newSessionId)
        localStorage.setItem('chat_session_id', newSessionId)
        await refreshSessions()
      }

      // Reload messages
      await loadSession(newSessionId)
    } catch (error) {
      console.error('Error sending message:', error)
      throw error
    } finally {
      setIsLoading(false)
    }
  }

  const createNewSession = () => {
    setCurrentSessionId(null)
    setMessages([])
    localStorage.removeItem('chat_session_id')
  }

  const deleteSession = async (sessionId: string) => {
    try {
      await apiClient.delete(`/api/chat/sessions/${sessionId}`)
      
      if (sessionId === currentSessionId) {
        createNewSession()
      }
      
      await refreshSessions()
    } catch (error) {
      console.error('Error deleting session:', error)
      throw error
    }
  }

  const value = {
    currentSessionId,
    sessions,
    messages,
    isLoading,
    sendMessage,
    loadSession,
    createNewSession,
    deleteSession,
    refreshSessions
  }

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>
}

export function useChat() {
  const context = useContext(ChatContext)
  if (context === undefined) {
    throw new Error('useChat must be used within a ChatProvider')
  }
  return context
}
