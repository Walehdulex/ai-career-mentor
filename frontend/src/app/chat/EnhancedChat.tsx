'use client'

import { useState, useEffect } from 'react'
import axios from 'axios'

interface Message {
  role: 'user' | 'ai'
  content: string
  timestamp?: string
}

interface ChatSession {
  session_id: string
  title: string
  created_at: string
  updated_at: string
}

export default function EnhancedChatPage() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [sessions, setSessions] = useState<ChatSession[]>([])
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null)
  const [showSidebar, setShowSidebar] = useState(false)

  // Load chat sessions on component mount
  useEffect(() => {
    loadChatSessions()
  }, [])

  const loadChatSessions = async () => {
    try {
      const response = await axios.get('http://localhost:8000/api/chat/sessions')
      setSessions(response.data)
    } catch (error) {
      console.error('Error loading sessions:', error)
    }
  }

  const loadChatHistory = async (sessionId: string) => {
    try {
      const response = await axios.get(`http://localhost:8000/api/chat/sessions/${sessionId}`)
      setMessages(response.data.map((msg: any) => ({
        role: msg.role,
        content: msg.content,
        timestamp: msg.timestamp
      })))
      setCurrentSessionId(sessionId)
    } catch (error) {
      console.error('Error loading chat history:', error)
    }
  }

  const startNewChat = () => {
    setMessages([])
    setCurrentSessionId(null)
    setShowSidebar(false)
  }

  const deleteSession = async (sessionId: string, event: React.MouseEvent) => {
    event.stopPropagation() // Prevent session selection when clicking delete
    
    try {
      await axios.delete(`http://localhost:8000/api/chat/sessions/${sessionId}`)
      setSessions(sessions.filter(s => s.session_id !== sessionId))
      
      // If we deleted the current session, start fresh
      if (currentSessionId === sessionId) {
        startNewChat()
      }
    } catch (error) {
      console.error('Error deleting session:', error)
    }
  }

  const sendMessage = async () => {
    if (!input.trim()) return

    const userMessage = input.trim()
    setInput('')
    setIsLoading(true)

    // Add user message to chat immediately
    const newUserMessage: Message = { role: 'user', content: userMessage }
    setMessages(prev => [...prev, newUserMessage])

    try {
      const response = await axios.post('http://localhost:8000/api/chat', {
        message: userMessage,
        session_id: currentSessionId
      })

      // Add AI response to chat
      const aiMessage: Message = { 
        role: 'ai', 
        content: response.data.response 
      }
      setMessages(prev => [...prev, aiMessage])
      
      // Update session ID for subsequent messages
      setCurrentSessionId(response.data.session_id)
      
      // Refresh sessions list to show updated titles
      loadChatSessions()
      
    } catch (error) {
      console.error('Error:', error)
      const errorMessage: Message = { 
        role: 'ai', 
        content: 'Sorry, there was an error connecting to the AI mentor.' 
      }
      setMessages(prev => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  const formatAIMessage = (content: string) => {
    // Split content by common markdown patterns
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
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60)
    
    if (diffInHours < 24) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    } else if (diffInHours < 168) { // 7 days
      return date.toLocaleDateString([], { weekday: 'short' })
    } else {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' })
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <div className={`${showSidebar ? 'translate-x-0' : '-translate-x-full'} fixed inset-y-0 left-0 z-50 w-80 bg-white shadow-lg transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0`}>
        <div className="flex flex-col h-full">
          {/* Sidebar Header */}
          <div className="p-4 border-b">
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
              className="mt-3 w-full bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors"
            >
              + New Chat
            </button>
          </div>

          {/* Chat Sessions */}
          <div className="flex-1 overflow-y-auto">
            {sessions.length === 0 ? (
              <div className="p-4 text-gray-500 text-sm">
                No previous conversations
              </div>
            ) : (
              <div className="p-2">
                {sessions.map((session) => (
                  <div
                    key={session.session_id}
                    className={`group flex items-center justify-between p-3 rounded-lg cursor-pointer hover:bg-gray-100 mb-1 ${
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
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col lg:ml-0">
        {/* Header */}
        <div className="bg-white shadow-sm border-b">
          <div className="max-w-4xl mx-auto px-4 py-4 flex items-center">
            <button
              onClick={() => setShowSidebar(true)}
              className="lg:hidden mr-3 p-2 rounded-md hover:bg-gray-100"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                AI Tech Career Mentor
              </h1>
              <p className="text-gray-600">
                {currentSessionId ? 'Continue your conversation' : 'Start a new conversation'}
              </p>
            </div>
          </div>
        </div>

        {/* Chat Messages */}
        <div className="flex-1 max-w-4xl mx-auto w-full px-4 py-6">
          <div className="space-y-6">
            {messages.length === 0 && (
              <div className="text-center text-gray-500 py-8">
                <h2 className="text-lg font-medium mb-2">
                  👋 Hi! I'm your AI Tech Career Mentor
                </h2>
                <p>Ask me about:</p>
                <ul className="mt-2 space-y-1 text-sm">
                  <li>• Resume and cover letter feedback</li>
                  <li>• Tech career paths and transitions</li>
                  <li>• Skill development recommendations</li>
                  <li>• Interview preparation tips</li>
                  <li>• Job search strategies</li>
                </ul>
              </div>
            )}

            {messages.map((message, index) => (
              <div
                key={index}
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div className="max-w-xs lg:max-w-2xl">
                  {message.role === 'user' ? (
                    <div className="bg-blue-500 text-white px-4 py-3 rounded-lg shadow-sm">
                      <p className="text-sm leading-relaxed">{message.content}</p>
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
          </div>
        </div>

        {/* Input Area */}
        <div className="bg-white border-t">
          <div className="max-w-4xl mx-auto px-4 py-4">
            <div className="flex space-x-4">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Ask me about your tech career... (Press Enter to send)"
                className="flex-1 border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none text-gray-900 placeholder-gray-500"
                rows={2}
              />
              <button
                onClick={sendMessage}
                disabled={!input.trim() || isLoading}
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
