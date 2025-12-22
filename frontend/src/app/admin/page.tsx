'use client'

import { useState, useEffect } from 'react'
import { Database, RefreshCw, CheckCircle, AlertCircle, Loader2 } from 'lucide-react'
import { useAuth } from '@/app/contexts/AuthContext'
import { useRouter } from 'next/navigation'

export default function AdminPage() {
  const { user, isLoading } = useAuth()
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/login')
    }
  }, [user, isLoading, router])

  if (isLoading) {
    return <div className="flex items-center justify-center h-screen">Loading...</div>
  }

  if (!user) {
    return null
  }

  const populateJobs = async () => {
    setLoading(true)
    setError(null)
    setResult(null)

    try {
      const response = await fetch(`${API_URL}/api/admin/populate-jobs`, {
        method: 'POST'
      })

      if (!response.ok) {
        throw new Error(`Failed: ${response.status}`)
      }

      const data = await response.json()
      setResult(data)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const checkDatabase = async () => {
    setLoading(true)
    setError(null)
    setResult(null)

    try {
      const response = await fetch(`${API_URL}/api/admin/check-jobs`)
      const data = await response.json()
      setResult(data)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const checkAPIConfig = async () => {
    setLoading(true)
    setError(null)
    setResult(null)

    try {
      const response = await fetch(`${API_URL}/api/admin/check-config`)
      const data = await response.json()
      setResult(data)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <div className="flex items-center gap-3 mb-8">
            <Database className="w-8 h-8 text-blue-600" />
            <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            {/* Populate Jobs Button */}
            <button
              onClick={populateJobs}
              disabled={loading}
              className="flex flex-col items-center justify-center p-6 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:bg-gray-400"
            >
              {loading ? (
                <Loader2 className="w-8 h-8 animate-spin mb-2" />
              ) : (
                <RefreshCw className="w-8 h-8 mb-2" />
              )}
              <span className="font-semibold">Populate Jobs</span>
              <span className="text-sm text-blue-100">Fetch from APIs</span>
            </button>

            {/* Check Database Button */}
            <button
              onClick={checkDatabase}
              disabled={loading}
              className="flex flex-col items-center justify-center p-6 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors disabled:bg-gray-400"
            >
              {loading ? (
                <Loader2 className="w-8 h-8 animate-spin mb-2" />
              ) : (
                <Database className="w-8 h-8 mb-2" />
              )}
              <span className="font-semibold">Check Database</span>
              <span className="text-sm text-green-100">View job stats</span>
            </button>

            {/* Check API Config Button */}
            <button
              onClick={checkAPIConfig}
              disabled={loading}
              className="flex flex-col items-center justify-center p-6 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors disabled:bg-gray-400"
            >
              {loading ? (
                <Loader2 className="w-8 h-8 animate-spin mb-2" />
              ) : (
                <CheckCircle className="w-8 h-8 mb-2" />
              )}
              <span className="font-semibold">Check API Config</span>
              <span className="text-sm text-purple-100">Verify API keys</span>
            </button>
          </div>

          {/* Results Display */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4 text-black">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
                <div>
                  <h3 className="font-semibold text-red-900">Error</h3>
                  <p className="text-red-700">{error}</p>
                </div>
              </div>
            </div>
          )}

          {result && (
            <div className="bg-gray-50 rounded-lg p-6 border border-gray-200">
              <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-600" />
                Results
              </h3>
              <pre className="bg-white p-4 rounded border border-gray-200 overflow-x-auto text-sm text-black">
                {JSON.stringify(result, null, 2)}
              </pre>

              {/* Quick Stats */}
              {result.total_jobs !== undefined && (
                <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-white p-4 rounded border border-gray-200">
                    <div className="text-2xl font-bold text-blue-600">
                      {result.total_jobs}
                    </div>
                    <div className="text-sm text-gray-600">Total Jobs</div>
                  </div>
                  <div className="bg-white p-4 rounded border border-gray-200">
                    <div className="text-2xl font-bold text-green-600">
                      {result.active_jobs}
                    </div>
                    <div className="text-sm text-gray-600">Active Jobs</div>
                  </div>
                  <div className="bg-white p-4 rounded border border-gray-200">
                    <div className="text-2xl font-bold text-purple-600">
                      {result.adzuna_jobs}
                    </div>
                    <div className="text-sm text-gray-600">Adzuna Jobs</div>
                  </div>
                  <div className="bg-white p-4 rounded border border-gray-200">
                    <div className="text-2xl font-bold text-orange-600">
                      {result.mock_jobs}
                    </div>
                    <div className="text-sm text-gray-600">Mock Jobs</div>
                  </div>
                </div>
              )}

              {/* Populate Results */}
              {result.jobs_added !== undefined && (
                <div className="mt-4 bg-green-50 border border-green-200 rounded-lg p-4">
                  <h4 className="font-semibold text-green-900 mb-2">
                    ✅ Jobs Populated Successfully!
                  </h4>
                  <div className="space-y-1 text-sm text-green-800">
                    <div>• Jobs Added: <strong>{result.jobs_added}</strong></div>
                    <div>• Jobs Updated: <strong>{result.jobs_updated}</strong></div>
                    <div>• Total: <strong>{result.total}</strong></div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Instructions */}
          <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
            <h3 className="font-semibold text-blue-900 mb-3">📝 Instructions</h3>
            <ul className="space-y-2 text-sm text-blue-800">
              <li>
                <strong>Populate Jobs:</strong> Fetches jobs from Adzuna API and stores them in the database
              </li>
              <li>
                <strong>Check Database:</strong> Shows current job statistics and sample jobs
              </li>
              <li>
                <strong>Check API Config:</strong> Verifies that API keys are properly configured
              </li>
            </ul>
          </div>

          {/* Back to Dashboard Link */}
          <div className="mt-6 text-center">
            <a
              href="/dashboard/jobs"
              className="text-blue-600 hover:text-blue-700 font-medium"
            >
              ← Back to Job Dashboard
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}