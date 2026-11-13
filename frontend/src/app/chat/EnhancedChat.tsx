'use client'

import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../contexts/AuthContext'
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

interface Message {
  role: 'user' | 'ai'
  content: string
  timestamp?: string
  attachment?: { type: 'resume'; filename: string; analysis?: string }
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

  useEffect(() => {
    if (!user) {
      setMessages([])
      setSessions([])
      setCurrentSessionId(null)
      localStorage.removeItem('chat_session_id')
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

  const loadChatSessions = async () => {
    if (!user) return
    try {
      const response = await chatAPI.getSessions()
      setSessions(response.data)
      const storedId = localStorage.getItem('chat_session_id')
      if (storedId) {
        const exists = response.data.some((s: ChatSession) => s.session_id === storedId)
        if (exists) {
          setCurrentSessionId(storedId)
          await loadChatHistory(storedId)
        } else {
          localStorage.removeItem('chat_session_id')
          setCurrentSessionId(null)
        }
      }
    } catch (error: any) {
      if (error.response?.status === 403) {
        localStorage.removeItem('chat_session_id')
        setCurrentSessionId(null)
        setSessions([])
      }
    }
  }

  const loadChatHistory = async (sessionId: string) => {
    if (!user) return
    try {
      const response = await chatAPI.getSession(sessionId)
      setMessages(
        response.data.map((msg: any) => ({
          role: msg.role,
          content: msg.content,
          timestamp: msg.timestamp,
          attachment: msg.attachment,
        }))
      )
      setCurrentSessionId(sessionId)
      localStorage.setItem('chat_session_id', sessionId)
    } catch (error: any) {
      if (error.response?.status === 403) {
        localStorage.removeItem('chat_session_id')
        setCurrentSessionId(null)
        setMessages([])
      }
    }
  }

  const startNewChat = () => {
    setMessages([])
    setCurrentSessionId(null)
    localStorage.removeItem('chat_session_id')
    setShowSidebar(false)
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
  }

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    const ext = file.name.substring(file.name.lastIndexOf('.')).toLowerCase()
    if (!['.pdf', '.docx', '.doc'].includes(ext)) {
      setNotice('Please upload a PDF or DOCX file')
      if (fileInputRef.current) fileInputRef.current.value = ''
      return
    }
    setNotice('')
    setIsUploadingResume(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
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
      if (analysisResponse.data.session_id) {
        setCurrentSessionId(analysisResponse.data.session_id)
        localStorage.setItem('chat_session_id', analysisResponse.data.session_id)
      }
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
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value)
    e.target.style.height = 'auto'
    e.target.style.height = `${Math.min(e.target.scrollHeight, 140)}px`
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
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
          </div>
        </div>
      </div>

      <MobileBottomNav />
    </div>
  )
}