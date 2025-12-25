'use client'

import { useState } from 'react'
import axios from 'axios'
import { apiClient } from '../../../lib/api'
import { ProfessionalResumeDisplay } from '../components/ProfessionalResumeDisplay'

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
      const response = await apiClient.post('/api/optimize-resume', {
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

  const downloadAsDocx = async (content: string, filename: string, docType: string) => {
    try {
      const response = await axios.post(
        `${apiClient.defaults.baseURL}/api/generate-${docType}-docx`,
        {
          content: content,
          filename: filename,
          doc_type: docType,
          company_name: companyName,
          position_title: positionTitle
        },
        {
          responseType: 'blob'
        }
      )
      
      const url = window.URL.createObjectURL(new Blob([response.data]))
      const element = document.createElement('a')
      element.href = url
      element.download = filename.replace('.txt', '.docx')
      document.body.appendChild(element)
      element.click()
      document.body.removeChild(element)
      window.URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Error downloading DOCX:', error)
      alert('Error downloading DOCX file')
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
    
    // Fixed: Use contact.name instead of contact.email
    let formatted = `${contact.name || 'Your Name'}\n`
    formatted += `${contact.phone || 'Phone'} | ${contact.email || 'Email'}\n`
    if (contact.linkedin) formatted += `LinkedIn: ${contact.linkedin}\n`
    if (contact.github) formatted += `GitHub: ${contact.github}\n\n`
    
    formatted += 'TECHNICAL SKILLS\n'
    for (const [category, skillList] of Object.entries(skills)) {
      if (Array.isArray(skillList) && skillList.length > 0) {
        // Fixed: Replace all underscores, not just the first one
        formatted += `${category.replace(/_/g, ' ').toUpperCase()}: ${skillList.join(', ')}\n`
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
                className={`px-6 py-3 font-medium text-sm border-b-2 transition-colors ${
                  !showComparison 
                    ? 'border-green-600 text-green-600' 
                    : 'border-transparent text-gray-600 hover:text-gray-800'
                }`}
              >
                📄 Optimized Resume
              </button>
              <button
                onClick={() => setShowComparison(true)}
                className={`px-6 py-3 font-medium text-sm border-b-2 transition-colors ${
                  showComparison 
                    ? 'border-blue-600 text-blue-600' 
                    : 'border-transparent text-gray-600 hover:text-gray-800'
                }`}
              >
                🔄 Before & After Comparison
              </button>
            </div>

            {/* Optimized Resume Display */}
            {!showComparison && (
              <div className="space-y-4">
                {/* Action Buttons */}
                <div className="flex justify-end space-x-2 bg-gray-50 p-4 rounded-lg border print:hidden">
                  <button
                    onClick={() => copyToClipboard(result.optimized_resume)}
                    className="flex items-center space-x-2 bg-white hover:bg-gray-50 border border-gray-300 text-gray-700 px-4 py-2 rounded-md text-sm transition-colors shadow-sm"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                    </svg>
                    <span>Copy Text</span>
                  </button>
                  
                  <button
                    onClick={() => window.print()}
                    className="flex items-center space-x-2 bg-white hover:bg-gray-50 border border-gray-300 text-gray-700 px-4 py-2 rounded-md text-sm transition-colors shadow-sm"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                    </svg>
                    <span>Print</span>
                  </button>
                  
                  <button
                    onClick={() => downloadAsDocx(
                      result.optimized_resume,
                      `optimized-resume-${result.company_name.toLowerCase()}-${result.position_title.toLowerCase().replace(/\s+/g, '-')}.docx`,
                      'resume'
                    )}
                    className="flex items-center space-x-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md text-sm transition-colors shadow-sm"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <span>Download DOCX</span>
                  </button>
                </div>
                
                {/* Professional Resume Display */}
                <div className="border rounded-lg overflow-hidden shadow-lg print-resume">
                  <ProfessionalResumeDisplay
                    resumeText={result.optimized_resume}
                    companyName={result.company_name}
                    positionTitle={result.position_title}
                  />
                </div>
              </div>
            )}

            {/* Before & After Comparison */}
            {showComparison && (
              <div className="grid lg:grid-cols-2 gap-6">
                {/* Original Resume */}
                <div className="border-2 border-red-200 rounded-lg overflow-hidden bg-white">
                  <div className="bg-red-50 border-b-2 border-red-200 p-4">
                    <h4 className="font-semibold text-gray-900 flex items-center">
                      <span className="w-3 h-3 bg-red-500 rounded-full mr-2"></span>
                      Original Resume
                    </h4>
                    <p className="text-xs text-gray-600 mt-1">Your original version before optimization</p>
                  </div>
                  <div className="p-6 max-h-[700px] overflow-y-auto bg-red-50/30">
                    <div className="whitespace-pre-wrap text-gray-800 text-sm font-mono bg-white p-4 rounded border">
                      {formatOriginalResume()}
                    </div>
                  </div>
                </div>
                
                {/* Optimized Resume */}
                <div className="border-2 border-green-200 rounded-lg overflow-hidden bg-white">
                  <div className="bg-green-50 border-b-2 border-green-200 p-4">
                    <h4 className="font-semibold text-gray-900 flex items-center">
                      <span className="w-3 h-3 bg-green-500 rounded-full mr-2 animate-pulse"></span>
                      Optimized Resume
                    </h4>
                    <p className="text-xs text-gray-600 mt-1">Enhanced with keywords and better structure</p>
                  </div>
                  <div className="max-h-[700px] overflow-y-auto bg-green-50/30">
                    <ProfessionalResumeDisplay
                      resumeText={result.optimized_resume}
                      companyName={result.company_name}
                      positionTitle={result.position_title}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Optimization Summary */}
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-blue-900 mb-3 flex items-center">
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                Optimization Summary & Improvements
              </h3>
              <div className="whitespace-pre-wrap text-blue-900 text-sm leading-relaxed bg-white p-4 rounded border border-blue-100">
                {result.optimization_summary}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}