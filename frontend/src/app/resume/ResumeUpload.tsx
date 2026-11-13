'use client'

import React, { useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Upload, AlertCircle, Loader2, Sparkles } from 'lucide-react'
import CoverLetterGenerator from './CoverLetterGenerator'
import ResumeOptimizer from './ResumeOptimizer'
import { apiClient } from '../../../lib/api'
import { Header, MobileBottomNav } from '../components/layout/Header'

interface UploadedResumeData {
  filename: string
  data: {
    email: string
    phone: string
    skills: {
      [key: string]: string[]
    }
    estimated_experience: number
    word_count: number
    character_count: number
    raw_talent: string
  }
}

interface AnalysisResult {
  analysis: string
  resume_data: UploadedResumeData['data']
}

export default function ResumeUpload() {
  const [isDragging, setIsDragging] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [analyzing, setAnalyzing] = useState(false)
  const [uploadedData, setUploadedData] = useState<UploadedResumeData | null>(null)
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null)
  const [error, setError] = useState('')

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault() // was missing the (), which stopped drag and drop working
    setIsDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)

    const files = Array.from(e.dataTransfer.files)
    if (files.length > 0) {
      handleFileUpload(files[0])
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files && files.length > 0) {
      handleFileUpload(files[0])
    }
  }

  const handleFileUpload = async (file: File) => {
    if (!file.name.toLowerCase().endsWith('.pdf') && !file.name.toLowerCase().endsWith('.docx')) {
      setError('Please upload a PDF or DOCX file')
      return
    }

    setError('')
    setUploading(true)
    setUploadedData(null)
    setAnalysis(null)

    try {
      const formData = new FormData()
      formData.append('file', file)

      const response = await apiClient.post('/api/upload-resume', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })

      setUploadedData(response.data)

      // Analyze automatically after upload
      await analyzeResume(response.data.data)
    } catch (error: any) {
      console.error('Upload error:', error)
      setError(error.response?.data?.detail || 'Error uploading resume')
    } finally {
      setUploading(false)
    }
  }

  const analyzeResume = async (resumeData: UploadedResumeData['data']) => {
    setAnalyzing(true)
    try {
      const response = await apiClient.post('/api/analyze-resume', resumeData)
      setAnalysis(response.data)
    } catch (error: any) {
      console.error('Analysis error:', error)
      setError(error.response?.data?.detail || 'Error analyzing resume')
    } finally {
      setAnalyzing(false)
    }
  }

  const formatSkills = (skills: { [key: string]: string[] }) => {
    return Object.entries(skills)
      .filter(([_, skillList]) => skillList.length > 0)
      .map(([category, skillList]) => (
        <div key={category}>
          <span className="text-sm font-medium text-gray-700 capitalize">
            {category.replace(/_/g, ' ')}
          </span>
          <div className="flex flex-wrap gap-1.5 mt-1.5">
            {skillList.map((skill, index) => (
              <span
                key={index}
                className="px-2.5 py-0.5 bg-blue-50 text-blue-700 border border-blue-100 rounded-full text-xs font-medium"
              >
                {skill}
              </span>
            ))}
          </div>
        </div>
      ))
  }

  const hasSkills =
    uploadedData && Object.keys(uploadedData.data.skills).some((key) => uploadedData.data.skills[key].length > 0)

  return (
    <div className="min-h-screen bg-gray-50 pb-24 sm:pb-0">
      <Header />

      {/* Banner, same gradient as the dashboard */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
          <h1 className="text-xl sm:text-3xl font-bold mb-1 leading-tight">Resume analysis</h1>
          <p className="text-blue-100 text-sm">
            Upload your resume to get AI feedback, then tailor it and write a cover letter for a specific job.
          </p>
        </div>
      </div>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* Upload area */}
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`bg-white rounded-xl border-2 border-dashed shadow-sm p-8 text-center transition-colors ${
            isDragging ? 'border-blue-500 bg-blue-50' : 'border-gray-300'
          }`}
        >
          {uploading ? (
            <div className="flex flex-col items-center py-2">
              <Loader2 className="w-10 h-10 animate-spin text-blue-600 mb-3" />
              <p className="text-gray-600 text-sm">Uploading and reading your resume...</p>
            </div>
          ) : (
            <div>
              <div className="w-12 h-12 mx-auto mb-4 rounded-lg bg-blue-600 flex items-center justify-center">
                <Upload className="w-6 h-6 text-white" />
              </div>
              <p className="text-lg font-semibold text-gray-900 mb-1">
                Drop your resume here, or choose a file
              </p>
              <p className="text-sm text-gray-500 mb-5">PDF or DOCX</p>
              <input
                type="file"
                onChange={handleFileSelect}
                accept=".pdf,.docx"
                className="hidden"
                id="file-upload"
              />
              <label
                htmlFor="file-upload"
                className="inline-flex items-center px-5 py-2.5 text-sm font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700 cursor-pointer transition-colors"
              >
                Choose file
              </label>
            </div>
          )}
        </div>

        {/* Error */}
        {error && (
          <div className="flex items-start gap-2 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <p>{error}</p>
          </div>
        )}

        {/* Resume summary */}
        {uploadedData && (
          <section className="bg-white rounded-xl border border-gray-100 shadow-sm">
            <div className="px-5 sm:px-6 py-4 border-b border-gray-100">
              <h2 className="text-base font-semibold text-gray-900">Resume summary</h2>
              <p className="text-sm text-gray-500 mt-0.5 truncate">{uploadedData.filename}</p>
            </div>

            <div className="p-5 sm:p-6 space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-sm font-medium text-gray-900 mb-1.5">Contact</h3>
                  <p className="text-sm text-gray-600">Email: {uploadedData.data.email || 'Not found'}</p>
                  <p className="text-sm text-gray-600">Phone: {uploadedData.data.phone || 'Not found'}</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-900 mb-1.5">Stats</h3>
                  <p className="text-sm text-gray-600">
                    Experience: {uploadedData.data.estimated_experience} years
                  </p>
                  <p className="text-sm text-gray-600">Word count: {uploadedData.data.word_count}</p>
                </div>
              </div>

              <div>
                <h3 className="text-sm font-medium text-gray-900 mb-3">Skills found</h3>
                {hasSkills ? (
                  <div className="space-y-3">{formatSkills(uploadedData.data.skills)}</div>
                ) : (
                  <p className="text-gray-500 text-sm">
                    No technical skills detected. Make sure your skills are clearly listed on your resume.
                  </p>
                )}
              </div>
            </div>
          </section>
        )}

        {/* AI analysis */}
        {analyzing && (
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 flex items-center gap-3">
            <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
            <p className="text-gray-600 text-sm">Analyzing your resume...</p>
          </div>
        )}

        {analysis && (
          <section className="bg-white rounded-xl border border-gray-100 shadow-sm">
            <div className="px-5 sm:px-6 py-4 border-b border-gray-100 flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-purple-600 flex items-center justify-center shrink-0">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <h2 className="text-base font-semibold text-gray-900">AI feedback</h2>
            </div>

            <div className="p-5 sm:p-6 max-w-none text-gray-800">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  h1: ({ node, ...props }) => (
                    <h1 className="text-2xl font-bold text-gray-900 mt-6 mb-3" {...props} />
                  ),
                  h2: ({ node, ...props }) => (
                    <h2 className="text-lg font-semibold text-blue-700 mt-5 mb-2" {...props} />
                  ),
                  h3: ({ node, ...props }) => (
                    <h3 className="text-base font-semibold text-gray-800 mt-4 mb-2" {...props} />
                  ),
                  p: ({ node, ...props }) => (
                    <p className="text-gray-700 text-sm leading-relaxed mb-3" {...props} />
                  ),
                  ul: ({ node, ...props }) => (
                    <ul className="list-disc pl-6 space-y-1 text-sm text-gray-700 mb-3" {...props} />
                  ),
                  li: ({ node, ...props }) => <li className="leading-snug" {...props} />,
                  strong: ({ node, ...props }) => (
                    <strong className="font-semibold text-gray-900" {...props} />
                  ),
                }}
              >
                {analysis.analysis}
              </ReactMarkdown>
            </div>
          </section>
        )}

        {/* Tools, shown after a successful analysis. Each component has its own heading. */}
        {analysis && uploadedData && (
          <>
            <CoverLetterGenerator resumeData={uploadedData.data} />
            <ResumeOptimizer resumeData={uploadedData.data} />
          </>
        )}
      </main>

      <MobileBottomNav />
    </div>
  )
}