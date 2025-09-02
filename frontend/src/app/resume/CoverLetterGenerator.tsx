import { useState } from "react";   
import axios from 'axios'

interface CoverLetterResult {
    cover_letter: string
    optimization_tips: string
    word_count: number
    company_name: string
    position_title: string
    tone: string
}

interface CoverLetterGeneratorProps {
    resumeData?: any
}

export default function CoverLetterGenerator({ resumeData }: CoverLetterGeneratorProps) {
    const [jobDescription, setJobDescription] = useState('')
    const [companyName, setCompanyName] = useState('')
    const [positionTitle, setPositionTitle] = useState('')
    const [tone, setTone] = useState('professional')
    const [isGenerating, setIsGenerating] = useState(false)
    const [result, setResult] = useState<CoverLetterResult | null>(null)
    const [error, setError] = useState('')

    const generateCoverLetter = async () => {
    if (!jobDescription.trim() || !companyName.trim() || !positionTitle.trim()) {
      setError('Please fill in all required fields')
      return
    }

    if (!resumeData) {
      setError('Please upload and analyze a resume first')
      return
    }

    setError('')
    setIsGenerating(true)
    setResult(null)

    try {
      const response = await axios.post('http://localhost:8000/api/generate-cover-letter', {
        resume_data: resumeData,
        job_description: jobDescription,
        company_name: companyName,
        position_title: positionTitle,
        tone: tone
      })

      if (response.data.status === 'success') {
        setResult(response.data)
      } else {
        setError(response.data.message || 'Failed to generate cover letter')
      }
    } catch (error: any) {
      console.error('Error generating cover letter:', error)
      setError(error.response?.data?.message || 'Error generating cover letter')
    } finally {
      setIsGenerating(false)
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

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            📄 AI Cover Letter Generator
          </h2>
          <p className="text-gray-600">
            Generate personalized cover letters tailored to specific job opportunities
          </p>
        </div>

        {!resumeData && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
            <div className="flex items-center">
              <svg className="w-5 h-5 text-yellow-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
              <p className="text-yellow-800">
                Please upload and analyze a resume first to generate personalized cover letters.
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
              Tone Style
            </label>
            <select
              value={tone}
              onChange={(e) => setTone(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-black focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="professional">Professional & Formal</option>
              <option value="friendly">Friendly & Approachable</option>
              <option value="enthusiastic">Enthusiastic & Energetic</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Job Description *
            </label>
            <textarea
              value={jobDescription}
              onChange={(e) => setJobDescription(e.target.value)}
              placeholder="Paste the complete job description here. Include requirements, responsibilities, and company information for the best results..."
              rows={6}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-black focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-y"
            />
          </div>

          <button
            onClick={generateCoverLetter}
            disabled={isGenerating || !resumeData}
            className="w-full bg-blue-500 text-white py-3 px-6 rounded-lg hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
          >
            {isGenerating ? (
              <div className="flex items-center justify-center">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                Generating Cover Letter...
              </div>
            ) : (
              'Generate Cover Letter'
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

        {/* Generated Cover Letter */}
        {result && (
          <div className="mt-8 space-y-6">
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-center mb-2">
                <svg className="w-5 h-5 text-green-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <h3 className="text-green-800 font-medium">Cover Letter Generated Successfully!</h3>
              </div>
              <div className="text-green-700 text-sm">
                <p>Position: {result.position_title} at {result.company_name}</p>
                <p>Word Count: {result.word_count} words | Tone: {result.tone}</p>
              </div>
            </div>

            {/* Cover Letter Display */}
            <div className="bg-white border rounded-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Your Cover Letter</h3>
                <div className="flex space-x-2">
                  <button
                    onClick={() => copyToClipboard(result.cover_letter)}
                    className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-1 rounded-md text-sm transition-colors"
                  >
                    Copy
                  </button>
                  <button
                    onClick={() => downloadAsText(result.cover_letter, `cover-letter-${result.company_name.toLowerCase()}-${result.position_title.toLowerCase().replace(/\s+/g, '-')}.txt`)}
                    className="bg-blue-100 hover:bg-blue-200 text-blue-700 px-3 py-1 rounded-md text-sm transition-colors"
                  >
                    Download
                  </button>
                </div>
              </div>
              <div className="prose max-w-none">
                <div className="whitespace-pre-wrap text-gray-800 leading-relaxed font-mono text-sm bg-gray-50 p-4 rounded border">
                  {result.cover_letter}
                </div>
              </div>
            </div>

            {/* Optimization Tips */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-blue-900 mb-3">
                💡 Optimization Tips
              </h3>
              <div className="whitespace-pre-wrap text-blue-800 text-sm leading-relaxed">
                {result.optimization_tips}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
