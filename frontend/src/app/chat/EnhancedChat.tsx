'use client'

import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useRouter } from 'next/navigation'
import { chatAPI } from '../../../lib/apiService'
import apiClient from '../../../lib/apiService'
import { MobileBottomNav } from '../components/layout/Header'

interface Message {
  role: 'user' | 'ai'
  content: string
  timestamp?: string
  attachment?: { type: 'resume'; filename: string; analysis?: string }
}
interface ChatSession {
  session_id: string; title: string; created_at: string; updated_at: string;
}

export default function EnhancedChatPage() {
  const { token, user } = useAuth()
  const router = useRouter()
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [sessions, setSessions] = useState<ChatSession[]>([])
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null)
  const [showSidebar, setShowSidebar] = useState(false)
  const [isUploadingResume, setIsUploadingResume] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!user) { setMessages([]); setSessions([]); setCurrentSessionId(null); localStorage.removeItem('chat_session_id'); }
    else loadChatSessions()
  }, [user?.id])

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  const loadChatSessions = async () => {
    if (!user) return
    try {
      const response = await chatAPI.getSessions()
      setSessions(response.data)
      const storedId = localStorage.getItem('chat_session_id')
      if (storedId) {
        const exists = response.data.some((s: ChatSession) => s.session_id === storedId)
        if (exists) { setCurrentSessionId(storedId); await loadChatHistory(storedId); }
        else { localStorage.removeItem('chat_session_id'); setCurrentSessionId(null); }
      }
    } catch (error: any) {
      if (error.response?.status === 403) { localStorage.removeItem('chat_session_id'); setCurrentSessionId(null); setSessions([]); }
    }
  }

  const loadChatHistory = async (sessionId: string) => {
    if (!user) return
    try {
      const response = await chatAPI.getSession(sessionId)
      setMessages(response.data.map((msg: any) => ({ role: msg.role, content: msg.content, timestamp: msg.timestamp, attachment: msg.attachment })))
      setCurrentSessionId(sessionId)
      localStorage.setItem('chat_session_id', sessionId)
    } catch (error: any) {
      if (error.response?.status === 403) { localStorage.removeItem('chat_session_id'); setCurrentSessionId(null); setMessages([]); }
    }
  }

  const startNewChat = () => { setMessages([]); setCurrentSessionId(null); localStorage.removeItem('chat_session_id'); setShowSidebar(false); }

  const deleteSession = async (sessionId: string, event: React.MouseEvent) => {
    event.stopPropagation()
    try {
      await chatAPI.deleteSession(sessionId)
      setSessions(s => s.filter(x => x.session_id !== sessionId))
      if (currentSessionId === sessionId) startNewChat()
    } catch {}
  }

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    const ext = file.name.substring(file.name.lastIndexOf('.')).toLowerCase()
    if (!['.pdf', '.docx', '.doc'].includes(ext)) { alert('Please upload a PDF or DOCX file'); return; }
    setIsUploadingResume(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      const uploadResponse = await apiClient.post('/api/upload-resume', formData, { headers: { 'Content-Type': 'multipart/form-data' } })
      const resumeData = uploadResponse.data.data
      setMessages(prev => [...prev, { role: 'user', content: `I've uploaded my resume: ${file.name}`, attachment: { type: 'resume', filename: file.name } }])
      const analysisResponse = await apiClient.post('/api/analyze-resume', resumeData)
      setMessages(prev => [...prev, { role: 'ai', content: `I've analyzed your resume "${file.name}":\n\n${analysisResponse.data.analysis}`, attachment: { type: 'resume', filename: file.name, analysis: analysisResponse.data.analysis } }])
      if (analysisResponse.data.session_id) { setCurrentSessionId(analysisResponse.data.session_id); localStorage.setItem('chat_session_id', analysisResponse.data.session_id); }
      loadChatSessions()
    } catch {
      setMessages(prev => [...prev, { role: 'ai', content: 'Sorry, there was an error analyzing your resume. Please try again.' }])
    } finally { setIsUploadingResume(false); if (fileInputRef.current) fileInputRef.current.value = '' }
  }

  const sendMessage = async () => {
    if (!input.trim()) return
    const userMessage = input.trim()
    setInput('')
    setIsLoading(true)
    setMessages(prev => [...prev, { role: 'user', content: userMessage }])
    try {
      const response = await chatAPI.sendMessage({ message: userMessage, session_id: currentSessionId || undefined })
      setMessages(prev => [...prev, { role: 'ai', content: response.data.response }])
      const newId = response.data.session_id
      if (newId !== currentSessionId) { setCurrentSessionId(newId); localStorage.setItem('chat_session_id', newId); await loadChatSessions(); }
    } catch (error: any) {
      if (error.response?.status === 403) { alert('Session belongs to another user. Starting new chat.'); startNewChat(); }
      else setMessages(prev => [...prev, { role: 'ai', content: 'Sorry, there was an error. Please try again.' }])
    } finally { setIsLoading(false); }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }

  const formatAIMessage = (content: string) => {
    const lines = content.split('\n')
    return (
      <div className="space-y-1">
        {lines.map((line, i) => {
          const trimmed = line.trim()
          if (!trimmed) return <br key={i} />
          if (trimmed.startsWith('###') || trimmed.startsWith('##'))
            return <h3 key={i} className="font-semibold text-gray-800 mt-3 mb-1 text-sm">{trimmed.replace(/^#+\s*/, '')}</h3>
          if (trimmed.includes('**')) {
            const parts = trimmed.split('**')
            return <p key={i} className="text-sm text-gray-700 leading-relaxed mb-1">{parts.map((p, j) => j % 2 === 1 ? <strong key={j} className="font-semibold text-gray-800">{p}</strong> : p)}</p>
          }
          if (trimmed.startsWith('- ') || trimmed.startsWith('* '))
            return <div key={i} className="flex items-start mb-1"><div className="w-1.5 h-1.5 bg-blue-400 rounded-full mt-2 mr-2 flex-shrink-0" /><p className="text-sm text-gray-700 leading-relaxed">{trimmed.replace(/^[-*]\s*/, '')}</p></div>
          return <p key={i} className="text-sm text-gray-700 leading-relaxed mb-2">{trimmed}</p>
        })}
      </div>
    )
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString), now = new Date()
    const hours = (now.getTime() - date.getTime()) / (1000 * 60 * 60)
    if (hours < 24) return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    if (hours < 168) return date.toLocaleDateString([], { weekday: 'short' })
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' })
  }

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">

      {/* Sidebar overlay on mobile */}
      {showSidebar && <div className="fixed inset-0 bg-black/40 z-40 lg:hidden" onClick={() => setShowSidebar(false)} />}

      {/* Sidebar */}
      <div className={`${showSidebar ? 'translate-x-0' : '-translate-x-full'} fixed inset-y-0 left-0 z-50 w-72 bg-white shadow-xl transform transition-transform duration-300 lg:translate-x-0 lg:static lg:shadow-none flex flex-col border-r border-gray-200`}>
        <div className="flex-shrink-0 p-4 border-b bg-white">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-semibold text-gray-900">Chat History</h2>
            <button onClick={() => setShowSidebar(false)} className="lg:hidden p-1 rounded-md hover:bg-gray-100">
              <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>
          <button onClick={startNewChat} className="w-full bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 text-sm flex items-center justify-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
            New Chat
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-2">
          {sessions.length === 0 ? (
            <p className="text-sm text-gray-400 text-center p-4">No conversations yet</p>
          ) : sessions.map(session => (
            <div key={session.session_id}
              className={`group flex items-center justify-between p-3 rounded-lg cursor-pointer hover:bg-gray-100 mb-1 transition-colors ${currentSessionId === session.session_id ? 'bg-blue-50 border border-blue-200' : ''}`}
              onClick={() => { loadChatHistory(session.session_id); setShowSidebar(false); }}>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">{session.title}</p>
                <p className="text-xs text-gray-500">{formatDate(session.updated_at)}</p>
              </div>
              <button onClick={e => deleteSession(session.session_id, e)} className="opacity-0 group-hover:opacity-100 p-1 text-red-400 hover:text-red-600">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Main area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <div className="flex-shrink-0 bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <button onClick={() => router.push('/dashboard')} className="p-2 rounded-lg hover:bg-gray-100 flex-shrink-0">
              <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
            </button>
            <button onClick={() => setShowSidebar(true)} className="lg:hidden p-2 rounded-lg hover:bg-gray-100 flex-shrink-0">
              <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
            </button>
            <div className="min-w-0">
              <h1 className="text-base sm:text-lg font-bold text-gray-900 truncate">AI Career Mentor</h1>
              <p className="text-xs text-gray-500 truncate">{currentSessionId ? 'Continue conversation' : 'Start a new conversation'}</p>
            </div>
          </div>
          <div className="flex-shrink-0">
            <input ref={fileInputRef} type="file" accept=".pdf,.docx,.doc" onChange={handleFileUpload} className="hidden" />
            <button onClick={() => fileInputRef.current?.click()} disabled={isUploadingResume}
              className="flex items-center gap-1.5 bg-green-500 hover:bg-green-600 text-white px-3 py-2 rounded-lg text-sm transition-colors disabled:opacity-50">
              {isUploadingResume ? (
                <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
              ) : (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" /></svg>
              )}
              <span className="hidden sm:inline">{isUploadingResume ? 'Analysing…' : 'Upload CV'}</span>
            </button>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-5">
          <div className="max-w-3xl mx-auto space-y-5">
            {messages.length === 0 && (
              <div className="text-center py-10">
                <div className="w-14 h-14 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
                </div>
                <h2 className="text-lg font-semibold text-gray-900 mb-1">Hi! I'm your AI Career Mentor 👋</h2>
                <p className="text-sm text-gray-500 mb-4">Ask me about resumes, career advice, interview prep, or job search strategies.</p>
                <div className="inline-block bg-white border border-gray-200 rounded-xl p-4 text-left shadow-sm">
                  {[['📄', 'Resume & cover letter feedback'], ['🚀', 'Career paths & transitions'], ['💡', 'Skill development tips'], ['🎯', 'Interview preparation']].map(([icon, text]) => (
                    <div key={text} className="flex items-center gap-2 text-sm text-gray-600 py-1"><span>{icon}</span>{text}</div>
                  ))}
                </div>
              </div>
            )}
            {messages.map((message, index) => (
              <div key={index} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] sm:max-w-[75%] ${message.role === 'user' ? '' : ''}`}>
                  {message.role === 'user' ? (
                    <div className="bg-blue-500 text-white px-4 py-3 rounded-2xl rounded-tr-sm">
                      <p className="text-sm leading-relaxed">{message.content}</p>
                      {message.attachment && (
                        <div className="mt-2 pt-2 border-t border-blue-400 flex items-center text-xs opacity-90 gap-1">
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                          <span className="truncate">{message.attachment.filename}</span>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="bg-white border border-gray-200 rounded-2xl rounded-tl-sm p-4 shadow-sm">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-5 h-5 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center flex-shrink-0">
                          <span className="text-white text-[9px] font-bold">AI</span>
                        </div>
                        <span className="text-xs text-gray-400 font-medium">Career Mentor</span>
                      </div>
                      {formatAIMessage(message.content)}
                    </div>
                  )}
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-white border border-gray-200 rounded-2xl rounded-tl-sm p-4 shadow-sm">
                  <div className="flex items-center gap-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500" />
                    <span className="text-sm text-gray-500">Thinking…</span>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Input */}
        <div className="flex-shrink-0 bg-white border-t border-gray-200 px-4 py-3">
          <div className="max-w-3xl mx-auto flex gap-3">
            <textarea value={input} onChange={e => setInput(e.target.value)} onKeyPress={handleKeyPress}
              placeholder="Ask me anything about your career…"
              className="flex-1 border border-gray-300 rounded-xl px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              rows={2} disabled={isLoading || isUploadingResume} />
            <button onClick={sendMessage} disabled={!input.trim() || isLoading || isUploadingResume}
              className="bg-blue-500 hover:bg-blue-600 text-white px-4 rounded-xl disabled:opacity-40 transition-colors self-end pb-0 flex items-center justify-center h-[42px]">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
            </button>
          </div>
        </div>
      </div>

      <MobileBottomNav />
    </div>
  )
}