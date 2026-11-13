'use client'

import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../contexts/AuthContext'
<<<<<<< Updated upstream
import { useChat } from '../contexts/ChatContext'
import { useRouter } from 'next/navigation'
import { chatAPI } from '../../../lib/apiService'  // ✅ ADDED: Import chatAPI
import apiClient from '../../../lib/apiService'    // ✅ ADDED: Import apiClient for other endpoints
=======
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import {
  Plus,
  X,
  Menu,
  Trash2,
  Upload,
  Send,
  Loader2,
  FileText,
  Sparkles,
  AlertCircle,
  MessageCircle,
  Briefcase,
  Mic,
} from 'lucide-react'
import { chatAPI } from '../../../lib/apiService'
import apiClient from '../../../lib/apiService'
import { Header, MobileBottomNav } from '../components/layout/Header'
>>>>>>> Stashed changes

interface Message {
  role: 'user' | 'ai'
  content: string
  timestamp?: string
  attachment?: {
    type: 'resume'
    filename: string
    analysis?: string
  }
}

interface ChatSession {
  session_id: string
  title: string
  created_at: string
  updated_at: string
}

const suggestions = [
  { icon: FileText, text: 'What should I improve on my tech resume?' },
  { icon: Briefcase, text: 'Help me plan a move into a new tech role' },
  { icon: Sparkles, text: 'Which skills should I learn next?' },
  { icon: Mic, text: 'Give me tips for a technical interview' },
]

export default function EnhancedChatPage() {
  const { user } = useAuth()
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [sessions, setSessions] = useState<ChatSession[]>([])
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null)
  const [showSidebar, setShowSidebar] = useState(false)
  const [isUploadingResume, setIsUploadingResume] = useState(false)
  const [notice, setNotice] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)


   // ✅ Clear chat data when user changes or logs out
  useEffect(() => {
    if (!user) {
<<<<<<< Updated upstream
      // User logged out - clear everything
      console.log('🔓 User logged out - clearing chat data')
=======
>>>>>>> Stashed changes
      setMessages([])
      setSessions([])
      setCurrentSessionId(null)
      localStorage.removeItem('chat_session_id')
<<<<<<< Updated upstream
    } else {
      // User logged in - load their sessions
      console.log('🔐 User logged in:', user.username, '- loading sessions')
      loadChatSessions()
    }
  }, [user?.id]) // ✅ Trigger when user ID changes

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])
=======
    } else loadChatSessions()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Shrink the textarea back down after sending
  useEffect(() => {
    if (!input && textareaRef.current) textareaRef.current.style.height = 'auto'
  }, [input])
>>>>>>> Stashed changes

  // ✅ Load sessions with user verification
  const loadChatSessions = async () => {
    if (!user) {
      console.log('❌ No user - cannot load sessions')
      setSessions([])
      return
    }

    try {
      console.log('📥 Loading chat sessions for user:', user.username)
      const response = await chatAPI.getSessions()
      console.log('✅ Loaded sessions:', response.data.length)
      setSessions(response.data)
<<<<<<< Updated upstream

      // ✅ Verify stored session belongs to current user
      const storedSessionId = localStorage.getItem('chat_session_id')
      if (storedSessionId) {
        const sessionExists = response.data.some(
          (s: ChatSession) => s.session_id === storedSessionId
        )
        
        if (sessionExists) {
          console.log('✅ Restoring session:', storedSessionId)
          setCurrentSessionId(storedSessionId)
          await loadChatHistory(storedSessionId)
        } else {
          console.log('⚠️ Stored session does not belong to this user - clearing')
=======
      const storedId = localStorage.getItem('chat_session_id')
      if (storedId) {
        const exists = response.data.some((s: ChatSession) => s.session_id === storedId)
        if (exists) {
          setCurrentSessionId(storedId)
          await loadChatHistory(storedId)
        } else {
>>>>>>> Stashed changes
          localStorage.removeItem('chat_session_id')
          setCurrentSessionId(null)
        }
      }
    } catch (error: any) {
<<<<<<< Updated upstream
      console.error('❌ Error loading sessions:', error)
      
      // ✅ Handle 403 errors (unauthorized)
      if (error.response?.status === 403) {
        console.log('🚫 Access denied - clearing session data')
=======
      if (error.response?.status === 403) {
>>>>>>> Stashed changes
        localStorage.removeItem('chat_session_id')
        setCurrentSessionId(null)
        setSessions([])
      }
    }
  }

  // ✅ Load chat history with ownership verification
  const loadChatHistory = async (sessionId: string) => {
    if (!user) {
      console.log('❌ No user - cannot load chat history')
      return
    }

    try {
      console.log('📥 Loading chat history for session:', sessionId)
      const response = await chatAPI.getSession(sessionId)
<<<<<<< Updated upstream
      setMessages(response.data.map((msg: any) => ({
        role: msg.role,
        content: msg.content,
        timestamp: msg.timestamp,
        attachment: msg.attachment
      })))
=======
      setMessages(
        response.data.map((msg: any) => ({
          role: msg.role,
          content: msg.content,
          timestamp: msg.timestamp,
          attachment: msg.attachment,
        }))
      )
>>>>>>> Stashed changes
      setCurrentSessionId(sessionId)
      localStorage.setItem('chat_session_id', sessionId)
      console.log('✅ Chat history loaded:', response.data.length, 'messages')
    } catch (error: any) {
<<<<<<< Updated upstream
      console.error('❌ Error loading chat history:', error)
      
      // ✅ Handle 403 errors
      if (error.response?.status === 403) {
        console.log('🚫 Access denied to this session - clearing')
        localStorage.removeItem('chat_session_id')
        setCurrentSessionId(null)
        setMessages([])
        alert('This chat session belongs to another user. Starting a new chat.')
=======
      if (error.response?.status === 403) {
        localStorage.removeItem('chat_session_id')
        setCurrentSessionId(null)
        setMessages([])
>>>>>>> Stashed changes
      }
    }
  }

  const startNewChat = () => {
<<<<<<< Updated upstream
    console.log('🆕 Starting new chat')
=======
>>>>>>> Stashed changes
    setMessages([])
    setCurrentSessionId(null)
    localStorage.removeItem('chat_session_id')
    setShowSidebar(false)
<<<<<<< Updated upstream
=======
    setNotice('')
  }

  const deleteSession = async (sessionId: string, event: React.MouseEvent) => {
    event.stopPropagation()
    try {
      await chatAPI.deleteSession(sessionId)
      setSessions((s) => s.filter((x) => x.session_id !== sessionId))
      if (currentSessionId === sessionId) startNewChat()
    } catch {
      setNotice("Couldn't delete that conversation. Please try again.")
    }
>>>>>>> Stashed changes
  }

  // ✅ Delete session with ownership verification
  const deleteSession = async (sessionId: string, event: React.MouseEvent) => {
    event.stopPropagation()
    
    try {
      console.log('🗑️ Deleting session:', sessionId)
      await chatAPI.deleteSession(sessionId)
      setSessions(sessions.filter(s => s.session_id !== sessionId))
      
      if (currentSessionId === sessionId) {
        startNewChat()
      }
      console.log('✅ Session deleted')
    } catch (error: any) {
      console.error('❌ Error deleting session:', error)
      
      // ✅ Handle 403 errors
      if (error.response?.status === 403) {
        alert('You cannot delete this session.')
      }
    }
  }

  // ✅ UPDATED: Using apiClient (automatically includes base URL and auth)
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
<<<<<<< Updated upstream

    // Validate file type
    const validExtensions = ['.pdf', '.docx', '.doc']
    const fileExtension = file.name.substring(file.name.lastIndexOf('.')).toLowerCase()
    
    if (!validExtensions.includes(fileExtension)) {
      alert('Please upload a PDF or DOCX file')
      return
    }

=======
    const ext = file.name.substring(file.name.lastIndexOf('.')).toLowerCase()
    if (!['.pdf', '.docx', '.doc'].includes(ext)) {
      setNotice('Please upload a PDF or DOCX file')
      if (fileInputRef.current) fileInputRef.current.value = ''
      return
    }
    setNotice('')
>>>>>>> Stashed changes
    setIsUploadingResume(true)

    try {
      // Upload and parse resume
      const formData = new FormData()
      formData.append('file', file)
<<<<<<< Updated upstream

      // ✅ UPDATED: Using apiClient
      const uploadResponse = await apiClient.post('/api/upload-resume', formData, {
        headers: { 
          'Content-Type': 'multipart/form-data'
        }
      })

      const resumeData = uploadResponse.data.data

      // Add user message showing resume upload
      const userMessage: Message = {
        role: 'user',
        content: `I've uploaded my resume: ${file.name}`,
        attachment: {
          type: 'resume',
          filename: file.name
        }
      }
      setMessages(prev => [...prev, userMessage])

      // Analyze resume
      // ✅ UPDATED: Using apiClient
      const analysisResponse = await apiClient.post('/api/analyze-resume', resumeData)

      // Add AI response with analysis
      const aiMessage: Message = {
        role: 'ai',
        content: `I've analyzed your resume "${file.name}". Here's my detailed feedback:\n\n${analysisResponse.data.analysis}`,
        attachment: {
          type: 'resume',
          filename: file.name,
          analysis: analysisResponse.data.analysis
        }
      }
      setMessages(prev => [...prev, aiMessage])

      // Update session ID
=======
      const uploadResponse = await apiClient.post('/api/upload-resume', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      const resumeData = uploadResponse.data.data
      setMessages((prev) => [
        ...prev,
        {
          role: 'user',
          content: `I've uploaded my resume: ${file.name}`,
          attachment: { type: 'resume', filename: file.name },
        },
      ])
      const analysisResponse = await apiClient.post('/api/analyze-resume', resumeData)
      setMessages((prev) => [
        ...prev,
        {
          role: 'ai',
          content: `I've analyzed your resume "${file.name}":\n\n${analysisResponse.data.analysis}`,
          attachment: { type: 'resume', filename: file.name, analysis: analysisResponse.data.analysis },
        },
      ])
>>>>>>> Stashed changes
      if (analysisResponse.data.session_id) {
        setCurrentSessionId(analysisResponse.data.session_id)
        localStorage.setItem('chat_session_id', analysisResponse.data.session_id)
      }
<<<<<<< Updated upstream

      loadChatSessions()

    } catch (error) {
      console.error('Error uploading resume:', error)
      const errorMessage: Message = {
        role: 'ai',
        content: 'Sorry, there was an error analyzing your resume. Please try again or check if the file is in the correct format.'
      }
      setMessages(prev => [...prev, errorMessage])
    } finally {
      setIsUploadingResume(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  // ✅ UPDATED: Using chatAPI
  const sendMessage = async () => {
  if (!input.trim()) return

  const userMessage = input.trim()
  setInput('')
  setIsLoading(true)

  const newUserMessage: Message = { role: 'user', content: userMessage }
  setMessages(prev => [...prev, newUserMessage])

  try {
    // ✅ ALWAYS send session_id (generate if doesn't exist)
       
    const response = await chatAPI.sendMessage({
      message: userMessage,
      session_id: currentSessionId || undefined
    })

    const aiMessage: Message = { 
      role: 'ai', 
      content: response.data.response 
    }
    setMessages(prev => [...prev, aiMessage])
    
    // ✅ Update session ID
      const newSessionId = response.data.session_id
      if (newSessionId !== currentSessionId) {
        console.log('📝 New session created:', newSessionId)
        setCurrentSessionId(newSessionId)
        localStorage.setItem('chat_session_id', newSessionId)
        await loadChatSessions()
      }

    } catch (error: any) {
      console.error('❌ Error sending message:', error)
      
      // ✅ Handle 403 errors
      if (error.response?.status === 403) {
        alert('This chat session belongs to another user. Starting a new chat.')
        startNewChat()
      } else {
        const errorMessage: Message = { 
          role: 'ai', 
          content: 'Sorry, there was an error connecting to the AI mentor. Please try again.' 
        }
        setMessages(prev => [...prev, errorMessage])
      }
    } finally {
      setIsLoading(false)
    }
  }
    
  
  const handleKeyPress = (e: React.KeyboardEvent) => {
=======
      loadChatSessions()
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: 'ai', content: 'Sorry, there was an error analyzing your resume. Please try again.' },
      ])
    } finally {
      setIsUploadingResume(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const sendMessage = async (override?: string) => {
    const userMessage = (override ?? input).trim()
    if (!userMessage || isLoading || isUploadingResume) return
    setInput('')
    setNotice('')
    setIsLoading(true)
    setMessages((prev) => [...prev, { role: 'user', content: userMessage }])
    try {
      const response = await chatAPI.sendMessage({
        message: userMessage,
        session_id: currentSessionId || undefined,
      })
      setMessages((prev) => [...prev, { role: 'ai', content: response.data.response }])
      const newId = response.data.session_id
      if (newId !== currentSessionId) {
        setCurrentSessionId(newId)
        localStorage.setItem('chat_session_id', newId)
        await loadChatSessions()
      }
    } catch (error: any) {
      if (error.response?.status === 403) {
        startNewChat()
        setNotice('That conversation belongs to another account, so we started a new chat.')
      } else {
        setMessages((prev) => [...prev, { role: 'ai', content: 'Sorry, there was an error. Please try again.' }])
      }
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
>>>>>>> Stashed changes
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

<<<<<<< Updated upstream
  const formatAIMessage = (content: string) => {
    const lines = content.split('\n')
    const formattedContent = []
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim()
      
      if (!line) {
        formattedContent.push(<br key={i} />)
        continue
      }
      
      // Headers (### or ##)
      if (line.startsWith('###') || line.startsWith('##')) {
        const headerText = line.replace(/^#+\s*/, '')
        formattedContent.push(
          <h3 key={i} className="font-semibold text-gray-800 mt-3 mb-1 text-sm">
            {headerText}
          </h3>
        )
      }
      // Bold text (**text**)
      else if (line.includes('**')) {
        const parts = line.split('**')
        const formattedLine = parts.map((part, index) => 
          index % 2 === 1 ? 
            <strong key={index} className="font-semibold text-gray-800">{part}</strong> : 
            part
        )
        formattedContent.push(
          <p key={i} className="text-sm text-gray-700 leading-relaxed mb-1">
            {formattedLine}
          </p>
        )
      }
      // Bullet points (- or *)
      else if (line.startsWith('- ') || line.startsWith('* ')) {
        const bulletText = line.replace(/^[-*]\s*/, '')
        formattedContent.push(
          <div key={i} className="flex items-start mb-1">
            <div className="w-1.5 h-1.5 bg-blue-400 rounded-full mt-2 mr-2 flex-shrink-0"></div>
            <p className="text-sm text-gray-700 leading-relaxed">{bulletText}</p>
          </div>
        )
      }
      // Regular paragraphs
      else {
        formattedContent.push(
          <p key={i} className="text-sm text-gray-700 leading-relaxed mb-2">
            {line}
          </p>
        )
      }
    }
    
    return <div className="space-y-1">{formattedContent}</div>
=======
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value)
    e.target.style.height = 'auto'
    e.target.style.height = `${Math.min(e.target.scrollHeight, 140)}px`
>>>>>>> Stashed changes
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
<<<<<<< Updated upstream
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60)
    
    if (diffInHours < 24) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    } else if (diffInHours < 168) {
      return date.toLocaleDateString([], { weekday: 'short' })
    } else {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' })
    }
  }

  return (
  <div className="h-screen bg-gray-50 flex overflow-hidden"> {/* ✅ Changed min-h-screen to h-screen and added overflow-hidden */}
    {/* Sidebar - Fixed with internal scroll */}
    <div className={`${
      showSidebar ? 'translate-x-0' : '-translate-x-full'
    } fixed inset-y-0 left-0 z-50 w-80 bg-white shadow-lg transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0 flex flex-col`}>
      
      {/* Sidebar Header - Fixed at top */}
      <div className="flex-shrink-0 p-4 border-b bg-white">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Chat History</h2>
          <button
            onClick={() => setShowSidebar(false)}
            className="lg:hidden p-1 rounded-md hover:bg-gray-100"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <button
          onClick={startNewChat}
          className="mt-3 w-full bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors flex items-center justify-center"
        >
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          New Chat
        </button>
      </div>

      {/* Chat Sessions - Scrollable area */}
      <div className="flex-1 overflow-y-auto">
        {sessions.length === 0 ? (
          <div className="p-4 text-gray-500 text-sm text-center">
            No previous conversations
          </div>
        ) : (
          <div className="p-2">
            {sessions.map((session) => (
              <div
                key={session.session_id}
                className={`group flex items-center justify-between p-3 rounded-lg cursor-pointer hover:bg-gray-100 mb-1 transition-colors ${
                  currentSessionId === session.session_id ? 'bg-blue-50 border border-blue-200' : ''
                }`}
                onClick={() => loadChatHistory(session.session_id)}
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {session.title}
                  </p>
                  <p className="text-xs text-gray-500">
                    {formatDate(session.updated_at)}
                  </p>
                </div>
                <button
                  onClick={(e) => deleteSession(session.session_id, e)}
                  className="opacity-0 group-hover:opacity-100 p-1 text-red-500 hover:text-red-700 transition-all"
                  title="Delete conversation"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>

    {/* Main Chat Area */}
    <div className="flex-1 flex flex-col h-screen"> {/* ✅ Added h-screen */}
      {/* Header - Fixed at top */}
      <div className="flex-shrink-0 bg-white shadow-sm border-b">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            {/* Back to Dashboard Button */}
            <button
              onClick={() => router.push('/dashboard')}
              className="p-2 rounded-lg hover:bg-gray-100 transition-colors group"
              title="Back to Dashboard"
            >
              <svg 
                className="w-5 h-5 text-gray-600 group-hover:text-blue-600" 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth={2} 
                  d="M10 19l-7-7m0 0l7-7m-7 7h18" 
                />
              </svg>
            </button>

            <button
              onClick={() => setShowSidebar(true)}
              className="lg:hidden p-2 rounded-md hover:bg-gray-100"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                AI Tech Career Mentor
              </h1>
              <p className="text-gray-600 text-sm"> {/* ✅ Added text-sm to reduce height */}
                {user ? (
                  <span>
                    {currentSessionId ? 'Continue your conversation' : 'Start a new conversation'} 
                    <span className="text-sm text-blue-600 ml-2">({user.username})</span>
                  </span>
                ) : (
                  'Start a new conversation'
                )}
              </p>
            </div>
          </div>

          {/* Upload Resume Button */}
          <div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.docx,.doc"
              onChange={handleFileUpload}
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploadingResume}
              className="flex items-center space-x-2 bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
              title="Upload and analyze resume"
            >
              {isUploadingResume ? (
                <>
                  <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span className="hidden sm:inline">Analyzing...</span>
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                  <span className="hidden sm:inline">Upload Resume</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Chat Messages - Scrollable area with fixed height */}
      <div className="flex-1 overflow-y-auto"> {/* This will take remaining space */}
        <div className="max-w-4xl mx-auto w-full px-4 py-6">
          <div className="space-y-6">
            {messages.length === 0 && (
              <div className="text-center text-gray-500 py-12">
                <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                </div>
                <h2 className="text-xl font-semibold text-gray-900 mb-2">
                  👋 Hi! I'm your AI Tech Career Mentor
                </h2>
                <p className="text-gray-600 mb-4">Ask me about:</p>
                <div className="max-w-md mx-auto bg-white border border-gray-200 rounded-lg p-6 shadow-sm text-left">
                  <ul className="space-y-3 text-sm">
                    <li className="flex items-start">
                      <span className="text-blue-500 mr-3 text-lg">📄</span>
                      <span>Resume and cover letter feedback</span>
                    </li>
                    <li className="flex items-start">
                      <span className="text-blue-500 mr-3 text-lg">🚀</span>
                      <span>Tech career paths and transitions</span>
                    </li>
                    <li className="flex items-start">
                      <span className="text-blue-500 mr-3 text-lg">💡</span>
                      <span>Skill development recommendations</span>
                    </li>
                    <li className="flex items-start">
                      <span className="text-blue-500 mr-3 text-lg">🎯</span>
                      <span>Interview preparation tips</span>
                    </li>
                    <li className="flex items-start">
                      <span className="text-blue-500 mr-3 text-lg">🔍</span>
                      <span>Job search strategies</span>
                    </li>
                  </ul>
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <p className="text-xs text-gray-500 flex items-center">
                      <svg className="w-4 h-4 mr-1 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                      </svg>
                      Click "Upload Resume" above to get instant feedback
                    </p>
                  </div>
                </div>
              </div>
            )}

            {messages.map((message, index) => (
              <div
                key={index}
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div className="max-w-xs lg:max-w-2xl">
                  {message.role === 'user' ? (
                    <div>
                      <div className="bg-blue-500 text-white px-4 py-3 rounded-lg shadow-sm">
                        <p className="text-sm leading-relaxed">{message.content}</p>
                        {message.attachment && (
                          <div className="mt-2 pt-2 border-t border-blue-400 flex items-center text-xs opacity-90">
                            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            <span className="truncate">{message.attachment.filename}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-4">
                      <div className="flex items-center mb-2">
                        <div className="w-6 h-6 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center mr-2">
                          <span className="text-white text-xs font-bold">AI</span>
                        </div>
                        <span className="text-xs text-gray-500 font-medium">Career Mentor</span>
                      </div>
                      {formatAIMessage(message.content)}
                    </div>
                  )}
                </div>
              </div>
            ))}

            {isLoading && (
              <div className="flex justify-start">
                <div className="max-w-xs lg:max-w-2xl">
                  <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-4">
                    <div className="flex items-center mb-2">
                      <div className="w-6 h-6 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center mr-2">
                        <span className="text-white text-xs font-bold">AI</span>
                      </div>
                      <span className="text-xs text-gray-500 font-medium">Career Mentor</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
                      <span className="text-sm text-gray-600">Thinking...</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
=======
    const hours = (now.getTime() - date.getTime()) / (1000 * 60 * 60)
    if (hours < 24) return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    if (hours < 168) return date.toLocaleDateString([], { weekday: 'short' })
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' })
  }

  return (
    <div className="flex flex-col h-[100dvh] bg-gray-50 pb-16 sm:pb-0">
      <Header />

      <div className="flex flex-1 min-h-0 relative">
        {/* Sidebar overlay on mobile */}
        {showSidebar && (
          <div className="fixed inset-0 bg-black/40 z-40 lg:hidden" onClick={() => setShowSidebar(false)} />
        )}

        {/* Sidebar */}
        <aside
          className={`${
            showSidebar ? 'translate-x-0' : '-translate-x-full'
          } fixed inset-y-0 left-0 z-50 w-72 bg-white shadow-xl transform transition-transform duration-300 lg:translate-x-0 lg:static lg:shadow-none flex flex-col border-r border-gray-100`}
        >
          <div className="flex-shrink-0 p-4 border-b border-gray-100">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-base font-semibold text-gray-900">Conversations</h2>
              <button
                onClick={() => setShowSidebar(false)}
                aria-label="Close conversations"
                className="lg:hidden p-1.5 rounded-lg hover:bg-gray-100"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <button
              onClick={startNewChat}
              className="w-full bg-blue-600 text-white px-4 py-2.5 rounded-lg hover:bg-blue-700 text-sm font-medium flex items-center justify-center gap-2 transition-colors"
            >
              <Plus className="w-4 h-4" />
              New chat
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-2">
            {sessions.length === 0 ? (
              <p className="text-sm text-gray-400 text-center p-4">No conversations yet</p>
            ) : (
              sessions.map((session) => (
                <div
                  key={session.session_id}
                  className={`group flex items-center justify-between gap-2 p-3 rounded-lg cursor-pointer hover:bg-gray-50 mb-1 transition-colors ${
                    currentSessionId === session.session_id ? 'bg-blue-50 border border-blue-100' : ''
                  }`}
                  onClick={() => {
                    loadChatHistory(session.session_id)
                    setShowSidebar(false)
                  }}
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{session.title}</p>
                    <p className="text-xs text-gray-500">{formatDate(session.updated_at)}</p>
                  </div>
                  {/* Always visible on touch screens, hover-only on desktop */}
                  <button
                    onClick={(e) => deleteSession(session.session_id, e)}
                    aria-label="Delete conversation"
                    className="lg:opacity-0 lg:group-hover:opacity-100 p-1.5 rounded-md text-gray-400 hover:text-red-600 hover:bg-red-50 transition-opacity"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))
            )}
          </div>
        </aside>

        {/* Main chat area */}
        <div className="flex-1 flex flex-col min-w-0 min-h-0">
          {/* Chat toolbar */}
          <div className="flex-shrink-0 bg-white border-b border-gray-100 px-4 py-2.5 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <button
                onClick={() => setShowSidebar(true)}
                aria-label="Open conversations"
                className="lg:hidden p-2 rounded-lg hover:bg-gray-100 flex-shrink-0"
              >
                <Menu className="w-5 h-5 text-gray-600" />
              </button>
              <div className="w-9 h-9 rounded-lg bg-green-600 flex items-center justify-center flex-shrink-0">
                <MessageCircle className="w-5 h-5 text-white" />
              </div>
              <div className="min-w-0">
                <h1 className="text-sm sm:text-base font-semibold text-gray-900 truncate">Career chat</h1>
                <p className="text-xs text-gray-500 truncate">
                  {currentSessionId ? 'Continuing your conversation' : 'New conversation'}
                </p>
              </div>
            </div>

            <div className="flex-shrink-0">
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.docx,.doc"
                onChange={handleFileUpload}
                className="hidden"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploadingResume}
                className="flex items-center gap-1.5 bg-white hover:bg-gray-50 border border-gray-300 text-gray-700 px-3 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
              >
                {isUploadingResume ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Upload className="w-4 h-4" />
                )}
                <span className="hidden sm:inline">{isUploadingResume ? 'Analyzing...' : 'Upload resume'}</span>
              </button>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-5">
            <div className="max-w-3xl mx-auto space-y-5">
              {messages.length === 0 && (
                <div className="py-8 sm:py-12 text-center">
                  <div className="w-14 h-14 bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl flex items-center justify-center mx-auto mb-4">
                    <Sparkles className="w-7 h-7 text-white" />
                  </div>
                  <h2 className="text-xl font-bold text-gray-900 mb-1">How can I help with your career?</h2>
                  <p className="text-sm text-gray-500 mb-6">
                    Ask about resumes, career paths, skills, interviews or your job search.
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-left">
                    {suggestions.map(({ icon: Icon, text }) => (
                      <button
                        key={text}
                        onClick={() => sendMessage(text)}
                        className="group flex items-start gap-3 bg-white border border-gray-100 rounded-xl p-3.5 shadow-sm hover:shadow-md hover:border-blue-100 transition-all"
                      >
                        <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                          <Icon className="w-4 h-4" />
                        </div>
                        <span className="text-sm text-gray-700 leading-snug">{text}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {messages.map((message, index) => (
                <div key={index} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className="max-w-[88%] sm:max-w-[78%]">
                    {message.role === 'user' ? (
                      <div className="bg-blue-600 text-white px-4 py-3 rounded-2xl rounded-tr-sm">
                        <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p>
                        {message.attachment && (
                          <div className="mt-2 pt-2 border-t border-blue-400/60 flex items-center text-xs text-blue-50 gap-1.5">
                            <FileText className="w-3.5 h-3.5 shrink-0" />
                            <span className="truncate">{message.attachment.filename}</span>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="bg-white border border-gray-100 rounded-2xl rounded-tl-sm p-4 shadow-sm">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="w-5 h-5 bg-gradient-to-r from-blue-600 to-purple-600 rounded-md flex items-center justify-center shrink-0">
                            <span className="text-white text-[9px] font-bold">AI</span>
                          </div>
                          <span className="text-xs text-gray-400 font-medium">Career Mentor</span>
                        </div>
                        <ReactMarkdown
                          remarkPlugins={[remarkGfm]}
                          components={{
                            h1: ({ node, ...props }) => (
                              <h3 className="text-base font-semibold text-gray-900 mt-3 mb-1.5" {...props} />
                            ),
                            h2: ({ node, ...props }) => (
                              <h3 className="text-sm font-semibold text-gray-900 mt-3 mb-1.5" {...props} />
                            ),
                            h3: ({ node, ...props }) => (
                              <h4 className="text-sm font-semibold text-gray-800 mt-3 mb-1" {...props} />
                            ),
                            p: ({ node, ...props }) => (
                              <p className="text-sm text-gray-700 leading-relaxed mb-2" {...props} />
                            ),
                            ul: ({ node, ...props }) => (
                              <ul className="list-disc pl-5 space-y-1 text-sm text-gray-700 mb-2" {...props} />
                            ),
                            ol: ({ node, ...props }) => (
                              <ol className="list-decimal pl-5 space-y-1 text-sm text-gray-700 mb-2" {...props} />
                            ),
                            li: ({ node, ...props }) => <li className="leading-snug" {...props} />,
                            strong: ({ node, ...props }) => (
                              <strong className="font-semibold text-gray-900" {...props} />
                            ),
                            a: ({ node, ...props }) => (
                              <a
                                className="text-blue-600 hover:underline"
                                target="_blank"
                                rel="noopener noreferrer"
                                {...props}
                              />
                            ),
                            code: ({ node, ...props }) => (
                              <code className="bg-gray-100 text-gray-800 px-1 py-0.5 rounded text-xs" {...props} />
                            ),
                          }}
                        >
                          {message.content}
                        </ReactMarkdown>
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-white border border-gray-100 rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                    <span className="text-sm text-gray-500">Thinking...</span>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          </div>

          {/* Input */}
          <div className="flex-shrink-0 bg-white border-t border-gray-100 px-4 py-3">
            <div className="max-w-3xl mx-auto">
              {notice && (
                <div
                  role="alert"
                  className="mb-3 flex items-start gap-2 rounded-lg bg-red-50 border border-red-200 px-3 py-2.5 text-sm text-red-700"
                >
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <p className="flex-1">{notice}</p>
                  <button onClick={() => setNotice('')} aria-label="Dismiss" className="text-red-400 hover:text-red-600">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}
              <div className="flex gap-2 items-end">
                <textarea
                  ref={textareaRef}
                  value={input}
                  onChange={handleInputChange}
                  onKeyDown={handleKeyDown}
                  placeholder="Ask me anything about your career..."
                  className="flex-1 border border-gray-300 rounded-xl px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                  rows={1}
                  disabled={isLoading || isUploadingResume}
                />
                <button
                  onClick={() => sendMessage()}
                  disabled={!input.trim() || isLoading || isUploadingResume}
                  aria-label="Send message"
                  className="bg-blue-600 hover:bg-blue-700 text-white w-11 h-11 rounded-xl disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center justify-center shrink-0"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </div>
>>>>>>> Stashed changes
          </div>
        </div>
      </div>

      {/* Input Area - Fixed at bottom */}
      <div className="flex-shrink-0 bg-white border-t">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex space-x-4">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Ask me about your tech career... (Press Enter to send)"
              className="flex-1 border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none text-gray-900 placeholder-gray-500"
              rows={2}
              disabled={isLoading || isUploadingResume}
            />
            <button
              onClick={sendMessage}
              disabled={!input.trim() || isLoading || isUploadingResume}
              className="bg-blue-500 text-white px-6 py-2 rounded-lg hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Send
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
)
}