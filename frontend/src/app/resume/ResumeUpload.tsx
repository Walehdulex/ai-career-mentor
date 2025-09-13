'use client'
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import React, { useState } from 'react'
import axios from 'axios'
import CoverLetterGenerator from './CoverLetterGenerator'
import ResumeOptimizer from './ResumeOptimizer'


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
        e.preventDefault
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
    //Validating file type
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

      const response = await axios.post('http://localhost:8000/api/upload-resume', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      })

      setUploadedData(response.data)
      
      // Automatically analyze the resume after upload
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
      const response = await axios.post('http://localhost:8000/api/analyze-resume', resumeData)
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
        <div key={category} className="mb-2">
          <span className="font-medium text-gray-700 capitalize">{category}:</span>
          <div className="flex flex-wrap gap-1 mt-1">
            {skillList.map((skill, index) => (
              <span
                key={index}
                className="px-2 py-1 bg-blue-100 text-blue-800 rounded-md text-sm"
              >
                {skill}
              </span>
            ))}
          </div>
        </div>
      ))
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Resume Analysis & Feedback
          </h1>
          <p className="text-gray-600">
            Upload your resume to get AI-powered feedback and optimization suggestions
          </p>
        </div>

        {/* Upload Area */}
        <div className="bg-white rounded-lg shadow-sm border-2 border-dashed border-gray-300 mb-8">
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`p-8 text-center transition-colors ${
              isDragging ? 'border-blue-500 bg-blue-50' : ''
            }`}
          >
            {uploading ? (
              <div className="flex flex-col items-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mb-4"></div>
                <p className="text-gray-600">Uploading and parsing your resume...</p>
              </div>
            ) : (
              <div>
                <div className="w-16 h-16 mx-auto mb-4 text-gray-400">
                  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                </div>
                <p className="text-xl font-medium text-gray-900 mb-2">
                  Drop your resume here or click to browse
                </p>
                <p className="text-gray-500 mb-4">
                  Supports PDF and DOCX files
                </p>
                <input
                  type="file"
                  onChange={handleFileSelect}
                  accept=".pdf,.docx"
                  className="hidden"
                  id="file-upload"
                />
                <label
                  htmlFor="file-upload"
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 cursor-pointer"
                >
                  Choose File
                </label>
              </div>
            )}
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-6">
            <div className="flex">
              <div className="text-red-800">
                <p className="font-medium">Error</p>
                <p className="text-sm">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* Resume Data Display */}
        {uploadedData && (
          <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
            <h2 className="text-xl font-semibold mb-4">📄 Resume Summary</h2>
            
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <h3 className="font-medium text-gray-900 mb-2">Contact Information</h3>
                <p className="text-sm text-gray-600">Email: {uploadedData.data.email || 'Not found'}</p>
                <p className="text-sm text-gray-600">Phone: {uploadedData.data.phone || 'Not found'}</p>
              </div>
              
              <div>
                <h3 className="font-medium text-gray-900 mb-2">Resume Stats</h3>
                <p className="text-sm text-gray-600">Experience: {uploadedData.data.estimated_experience} years</p>
                <p className="text-sm text-gray-600">Word Count: {uploadedData.data.word_count}</p>
              </div>
            </div>

            <div className="mt-6">
              <h3 className="font-medium text-gray-900 mb-3">🔧 Technical Skills Found</h3>
              {Object.keys(uploadedData.data.skills).some(key => uploadedData.data.skills[key].length > 0) ? (
                <div className="space-y-3">
                  {formatSkills(uploadedData.data.skills)}
                </div>
              ) : (
                <p className="text-gray-500 text-sm">No technical skills detected. Make sure your skills are clearly listed.</p>
              )}
            </div>
          </div>
        )}

         AI Analysis
        {analyzing && (
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <div className="flex items-center">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500 mr-3"></div>
              <p className="text-gray-600">AI is analyzing your resume...</p>
            </div>
          </div>
        )}


        {analysis && (
          <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-8">
            {/* Header */}
            <div className="flex items-center space-x-3 border-b pb-4 mb-6">
              <span className="text-3xl">🤖</span>
              <h2 className="text-2xl font-bold text-gray-900">AI Career Feedback</h2>
            </div>

            {/* Markdown Content */}
            <div className="prose prose-gray max-w-none text-gray-800">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  h1: ({node, ...props}) => (
                    <h1 className="text-2xl font-bold text-blue-600 mt-6 mb-4" {...props} />
                  ),
                  h2: ({node, ...props}) => (
                    <h2 className="text-xl font-semibold text-indigo-600 mt-5 mb-3" {...props} />
                  ),
                  h3: ({node, ...props}) => (
                    <h3 className="text-lg font-semibold text-gray-800 mt-4 mb-2" {...props} />
                  ),
                  p: ({node, ...props}) => (
                    <p className="text-gray-700 leading-relaxed mb-3" {...props} />
                  ),
                  ul: ({node, ...props}) => (
                    <ul className="list-disc pl-6 space-y-1 text-gray-700" {...props} />
                  ),
                  li: ({node, ...props}) => (
                    <li className="leading-snug" {...props} />
                  ),
                  strong: ({node, ...props}) => (
                    <strong className="font-semibold text-gray-900" {...props} />
                  ),
                }}
              >
                {analysis.analysis}
              </ReactMarkdown>
            </div>
          </div>
        )}

       
        {/* Cover Letter Generator - Show after successful analysis */}
        {analysis && uploadedData && (
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <h2 className="text-xl font-semibold mb-4 text-black">📝 Generate Cover Letters</h2>
            <p className="text-gray-600 mb-4">
              Create personalized cover letters for specific job applications using your resume data.
            </p>
            <CoverLetterGenerator resumeData={uploadedData.data} />
          </div>
        )}

        {/* Resume Optimizer - Show after successful analysis */}
        {analysis && uploadedData && (
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <h2 className="text-xl font-semibold mb-4">🎯 Optimize Resume for Specific Jobs</h2>
            <p className="text-gray-600 mb-4">
              Tailor your resume with job-specific keywords and ATS optimization for higher match rates.
            </p>
            <ResumeOptimizer resumeData={uploadedData.data} />
          </div>
        )}
      </div>
    </div>
  )
}


