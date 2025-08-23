'use client'

import { useState } from "react"  
import axios from "axios"

interface Message {
  role: 'user' | 'ai'
  content: string
}

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const sendMessage = async () => {
    if (!input.trim()) return

    const userMessage = input.trim()
    setInput('')
    setIsLoading(true)

    //Adding user message to chat
    setMessages(prev => [...prev, { role: 'user', content: userMessage}])

    try {
      const response = await axios.post('http://localhost:8000/api/chat', {
        message: userMessage
      })

      //Adding AI response to chat
      setMessages(prev => [...prev, { 
        role: 'ai', 
        content: response.data.response
      }])
    } catch (error) {
      console.error('Error:', error)
      setMessages(prev => [...prev, {
        role: 'ai',
        content: 'Sorry, there was an error connecting to the AI mentor.'
      }])
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey ) {
      e.preventDefault()
      sendMessage()
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <h1 className="text-2xl font-bold text-gray-900">
            AI Tech Career Mentor
          </h1>
          <p className="text-gray-600">
            Get Personalized career advice for your tech journey
          </p>
        </div>
      </div>

      {/* Chat Messages */}
      <div className="flex-1 max-w-4xl mx-auto w-full px-4 py-6">
        <div className="space-y-6">
          {messages.length === 0 && (
            <div className="text-center text-gray-500 py-8">
              <h2 className="text-lg font-medium mb-2">
                👋Hi! I'm your AI Tech Career Mentor
              </h2>
              <p>Ask me about:</p>
              <ul className="mt-2 space-y-1 text-sm">
                <li>Resume and cover letter feedbac</li>
                <li>Tech career paths and transitions</li>
                <li>Skill development recommendations</li>
                <li>Interview preparation tips</li>
                <li>Job search strategies</li>
              </ul>
              </div>
          )}
          #{messages.map((message, index) => (
            <div
              key={index}
              className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div 
                className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                  message.role === 'user'
                    ? 'bg-blue-500 text-white'
                    : 'bg-white text-gray-900 shadow-sm border'
                }`}
            >
              <p className="text-sm whitespace-pre-wrap">{message.content}</p>
            </div>
          </div>
          ))}

          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-white text-gray-900 shadow-sm border px-4 py-2 rounded-lg">
                <div className="flex items-center space-x-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
                  <span className="text-sm">AI mentor is thinking</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/*Input Area */}
      <div className="bg-white border-t">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex space-x-4">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Ask me about your tech career... (Press Enter to send)"
              className="flex-1 border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              rows={2}
            />
            <button
              onClick={sendMessage}
              disabled={!input.trim() || isLoading}
              className="bg-blue-500 text-white px-6 py-2 rounded-lg hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Send
            </button> 
          </div>
        </div>
      </div>
    </div>
  )
}