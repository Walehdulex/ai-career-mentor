'use client'

import { useState } from 'react'
import axios from 'axios'

interface OptimizationResult {
  optimized_resume: string
  optimization_summary: string
  original_word_count: number
  optimized_word_count: number
  company_name: string
  position_title: string
  optimization_level: string
}

interface ResumeOptimizerProps {
  resumeData?: any
}

export default function ResumeOptimizer({ resumeData }: ResumeOptimizerProps) {
  const [jobDescription, setJobDescription] = useState('')
  const [companyName, setCompanyName] = useState('')
  const [positionTitle, setPositionTitle] = useState('')
  const [optimizationLevel, setOptimizationLevel] = useState('moderate')
  const [isOptimizing, setIsOptimizing] = useState(false)
  const [result, setResult] = useState<OptimizationResult | null>(null)
  const [error, setError] = useState('')
  const [showComparison, setShowComparison] = useState(false)

  const optimizeResume = async () => {
    if (!jobDescription.trim() || !companyName.trim() || !positionTitle.trim()) {
      setError('Please fill in all required fields')
      return
    }

    if (!resumeData) {
      setError('Please upload and analyze a resume first')
      return
    }

    setError('')
    setIsOptimizing(true)
    setResult(null)

    try {
      const response = await axios.post('http://localhost:8000/api/optimize-resume', {
        resume_data: resumeData,
        job_description: jobDescription,
        company_name: companyName,
        position_title: positionTitle,
        optimization_level: optimizationLevel
      })

      if (response.data.status === 'success') {
        setResult(response.data)
      } else {
        setError(response.data.message || 'Failed to optimize resume')
      }
    } catch (error: any) {
      console.error('Error optimizing resume:', error)
      setError(error.response?.data?.message || 'Error optimizing resume')
    } finally {
      setIsOptimizing(false)
    }
  }

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      alert('Copied to clipboard!')
    } catch (error) {
      console.error('Failed to copy to clipboard:', error)
    }
  }

  const downloadAsText = (text: string, filename: string) => {
    const element = document.createElement('a')
    const file = new Blob([text], { type: 'text/plain' })
    element.href = URL.createObjectURL(file)
    element.download = filename
    document.body.appendChild(element)
    element.click()
    document.body.removeChild(element)
  }

  const formatOriginalResume = () => {
    if (!resumeData) return ''
    
    const contact = resumeData.contact_info || {}
    const skills = resumeData.skills || {}
    const experience = resumeData.experience || []
    const education = resumeData.education || []
    
    let formatted = `${contact.email || 'Your Name'}\n`
    formatted += `${contact.phone || 'Phone'} | ${contact.email || 'Email'}\n`
    if (contact.linkedin) formatted += `LinkedIn: ${contact.linkedin}\n`
    if (contact.github) formatted += `GitHub: ${contact.github}\n\n`
    
    formatted += 'TECHNICAL SKILLS\n'
    for (const [category, skillList] of Object.entries(skills)) {
      if (Array.isArray(skillList) && skillList.length > 0) {
        formatted += `${category.replace('_', ' ').toUpperCase()}: ${skillList.join(', ')}\n`
      }
    }
    
    if (experience.length > 0) {
      formatted += '\nPROFESSIONAL EXPERIENCE\n'
      experience.forEach((exp: any) => {
        formatted += `${exp.title || 'Position'} at ${exp.company || 'Company'} (${exp.dates || 'Dates'})\n`
        if (exp.description) {
          formatted += `${exp.description}\n`
        }
        formatted += '\n'
      })
    }
    
    if (education.length > 0) {
      formatted += 'EDUCATION\n'
      education.forEach((edu: any) => {
        formatted += `${edu.degree || 'Degree'} - ${edu.institution || 'Institution'} (${edu.year || 'Year'})\n`
      })
    }
    
    return formatted
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            🎯 Resume Optimizer for Specific Jobs
          </h2>
          <p className="text-gray-600">
            Optimize your resume with job-specific keywords and ATS improvements for higher match rates
          </p>
        </div>

        {!resumeData && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
            <div className="flex items-center">
              <svg className="w-5 h-5 text-yellow-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
              <p className="text-yellow-800">
                Please upload and analyze a resume first to optimize it for specific jobs.
              </p>
            </div>
          </div>
        )}

        {/* Input Form */}
        <div className="space-y-6">
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Company Name *
              </label>
              <input
                type="text"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="e.g., Google, Microsoft, Stripe"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-black focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Position Title *
              </label>
              <input
                type="text"
                value={positionTitle}
                onChange={(e) => setPositionTitle(e.target.value)}
                placeholder="e.g., Senior Frontend Developer, DevOps Engineer"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-black focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Optimization Level
            </label>
            <select
              value={optimizationLevel}
              onChange={(e) => setOptimizationLevel(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-black focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="conservative">Conservative - Minimal, natural changes</option>
              <option value="moderate">Moderate - Strategic keyword integration</option>
              <option value="aggressive">Aggressive - Maximum ATS optimization</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Job Description *
            </label>
            <textarea
              value={jobDescription}
              onChange={(e) => setJobDescription(e.target.value)}
              placeholder="Paste the complete job description here. Include requirements, skills, and responsibilities for the best optimization results..."
              rows={6}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-black focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-y"
            />
          </div>

          <button
            onClick={optimizeResume}
            disabled={isOptimizing || !resumeData}
            className="w-full bg-green-500 text-white py-3 px-6 rounded-lg hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
          >
            {isOptimizing ? (
              <div className="flex items-center justify-center">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                Optimizing Resume...
              </div>
            ) : (
              'Optimize Resume for This Job'
            )}
          </button>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mt-6 bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center">
              <svg className="w-5 h-5 text-red-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-red-800 font-medium">Error</p>
            </div>
            <p className="text-red-700 text-sm mt-1">{error}</p>
          </div>
        )}

        {/* Results */}
        {result && (
          <div className="mt-8 space-y-6">
            {/* Success Message */}
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-center mb-2">
                <svg className="w-5 h-5 text-green-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <h3 className="text-green-800 font-medium">Resume Successfully Optimized!</h3>
              </div>
              <div className="text-green-700 text-sm">
                <p>Target: {result.position_title} at {result.company_name}</p>
                <p>Optimization Level: {result.optimization_level} | Word Count: {result.original_word_count} → {result.optimized_word_count}</p>
              </div>
            </div>

            {/* Tab Navigation */}
            <div className="flex border-b">
              <button
                onClick={() => setShowComparison(false)}
                className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${
                  !showComparison 
                    ? 'border-green-500 text-green-600' 
                    : 'border-transparent text-gray-600 hover:text-gray-800'
                }`}
              >
                Optimized Resume
              </button>
              <button
                onClick={() => setShowComparison(true)}
                className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${
                  showComparison 
                    ? 'border-blue-500 text-blue-600' 
                    : 'border-transparent text-gray-600 hover:text-gray-800'
                }`}
              >
                Before & After Comparison
              </button>
            </div>

            {/* Optimized Resume Display */}
            {!showComparison && (
              <div className="bg-white border rounded-lg p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">Your Optimized Resume</h3>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => copyToClipboard(result.optimized_resume)}
                      className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-1 rounded-md text-sm transition-colors"
                    >
                      Copy
                    </button>
                    <button
                      onClick={() => downloadAsText(result.optimized_resume, `optimized-resume-${result.company_name.toLowerCase()}-${result.position_title.toLowerCase().replace(/\s+/g, '-')}.txt`)}
                      className="bg-green-100 hover:bg-green-200 text-green-700 px-3 py-1 rounded-md text-sm transition-colors"
                    >
                      Download
                    </button>
                  </div>
                </div>
                <div className="prose max-w-none">
                  <div className="whitespace-pre-wrap text-gray-800 leading-relaxed font-mono text-sm bg-gray-50 p-4 rounded border">
                    {result.optimized_resume}
                  </div>
                </div>
              </div>
            )}

            {/* Before & After Comparison */}
            {showComparison && (
              <div className="grid md:grid-cols-2 gap-6">
                <div className="bg-white border rounded-lg p-4">
                  <h4 className="font-semibold text-gray-900 mb-3 flex items-center">
                    <span className="w-3 h-3 bg-red-400 rounded-full mr-2"></span>
                    Original Resume
                  </h4>
                  <div className="whitespace-pre-wrap text-gray-700 text-xs font-mono bg-red-50 p-3 rounded border max-h-96 overflow-y-auto">
                    {formatOriginalResume()}
                  </div>
                </div>
                
                <div className="bg-white border rounded-lg p-4">
                  <h4 className="font-semibold text-gray-900 mb-3 flex items-center">
                    <span className="w-3 h-3 bg-green-400 rounded-full mr-2"></span>
                    Optimized Resume
                  </h4>
                  <div className="whitespace-pre-wrap text-gray-700 text-xs font-mono bg-green-50 p-3 rounded border max-h-96 overflow-y-auto">
                    {result.optimized_resume}
                  </div>
                </div>
              </div>
            )}

            {/* Optimization Summary */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-blue-900 mb-3">
                📊 Optimization Summary
              </h3>
              <div className="whitespace-pre-wrap text-blue-800 text-sm leading-relaxed">
                {result.optimization_summary}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}