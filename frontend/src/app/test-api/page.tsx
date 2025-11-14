'use client'

import { useEffect, useState } from 'react'
import { chatAPI, authAPI } from '../../../lib/apiService'


export default function TestAPI() {
  const [status, setStatus] = useState<string>('Testing...')
  const [backendUrl, setBackendUrl] = useState<string>('')

  useEffect(() => {
    // Show which URL is being used
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
    setBackendUrl(apiUrl)
    
    // Test connection
    testConnection()
  }, [])

  const testConnection = async () => {
    try {
      setStatus('Connecting to backend...')
      
      // Test a simple endpoint (health check or docs)
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/docs`)
      
      if (response.ok) {
        setStatus('✅ Backend connection successful!')
      } else {
        setStatus('❌ Backend responded but with error')
      }
    } catch (error) {
      setStatus('❌ Cannot connect to backend. Make sure it is running!')
      console.error(error)
    }
  }

  const testChatAPI = async () => {
    try {
      setStatus('Testing chat API...')
      const response = await chatAPI.sendMessage({
        message: 'Hello, this is a test message'
      })
      setStatus('✅ Chat API works! Response: ' + response.data.response.substring(0, 50) + '...')
    } catch (error: any) {
      setStatus('❌ Chat API failed: ' + error.message)
      console.error(error)
    }
  }

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">API Connection Test</h1>
      
      <div className="bg-gray-100 p-4 rounded-lg mb-4">
        <p className="font-semibold">Backend URL:</p>
        <p className="text-sm text-gray-700 break-all">{backendUrl}</p>
      </div>

      <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg mb-4">
        <p className="font-semibold mb-2">Connection Status:</p>
        <p className={status.includes('✅') ? 'text-green-600' : status.includes('❌') ? 'text-red-600' : 'text-gray-600'}>
          {status}
        </p>
      </div>

      <div className="space-y-3">
        <button
          onClick={testConnection}
          className="w-full bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
        >
          Test Backend Connection
        </button>

        <button
          onClick={testChatAPI}
          className="w-full bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
        >
          Test Chat API
        </button>
      </div>

      <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded">
        <p className="text-sm font-semibold mb-2">⚠️ Troubleshooting:</p>
        <ul className="text-sm space-y-1">
          <li>• Make sure backend is running on port 8000</li>
          <li>• Check .env.local has correct NEXT_PUBLIC_API_URL</li>
          <li>• Restart frontend after changing .env files</li>
          <li>• Check browser console for detailed errors (F12)</li>
        </ul>
      </div>
    </div>
  )
}