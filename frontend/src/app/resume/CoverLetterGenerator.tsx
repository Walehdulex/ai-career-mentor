'use client'

import { useState } from 'react'
import { FileText, AlertCircle, CheckCircle2, Loader2, Copy, Check, Download, Lightbulb } from 'lucide-react'
import { apiClient } from '../../../lib/api'

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

const labelClass = 'block text-sm font-medium text-gray-700 mb-1.5'
const inputClass =
  'w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent'

export default function CoverLetterGenerator({ resumeData }: CoverLetterGeneratorProps) {
  const [jobDescription, setJobDescription] = useState('')
  const [companyName, setCompanyName] = useState('')
  const [positionTitle, setPositionTitle] = useState('')
  const [tone, setTone] = useState('professional')
  const [isGenerating, setIsGenerating] = useState(false)
  const [result, setResult] = useState<CoverLetterResult | null>(null)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)

  const generateCoverLetter = async () => {
    if (!jobDescription.trim() || !companyName.trim() || !positionTitle.trim()) {
      setError('Please fill in the company, position and job description')
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
      const response = await apiClient.post('/api/generate-cover-letter', {
        resume_data: resumeData,
        job_description: jobDescription,
        company_name: companyName,
        position_title: positionTitle,
        tone: tone,
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
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (error) {
      console.error('Failed to copy to clipboard:', error)
      setError('Could not copy to the clipboard')
    }
  }

  const downloadAsDocx = async (content: string, filename: string, docType: string) => {
    try {
      // Uses apiClient so the auth token is sent
      const response = await apiClient.post(
        `/api/generate-${docType}-docx`,
        {
          content: content,
          filename: filename,
          doc_type: docType,
          company_name: companyName,
          position_title: positionTitle,
        },
        { responseType: 'blob' }
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
      setError('Could not download the DOCX file. Please try again.')
    }
  }

  return (
    <section className="bg-white rounded-xl border border-gray-100 shadow-sm">
      <div className="px-5 sm:px-6 py-4 border-b border-gray-100 flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-green-600 flex items-center justify-center shrink-0">
          <FileText className="w-5 h-5 text-white" />
        </div>
        <div>
          <h2 className="text-base font-semibold text-gray-900">Cover letter</h2>
          <p className="text-sm text-gray-500">Write a cover letter tailored to a specific job</p>
        </div>
      </div>

      <div className="p-5 sm:p-6 space-y-5">
        {!resumeData && (
          <div className="flex items-start gap-2 rounded-lg bg-yellow-50 border border-yellow-200 px-4 py-3 text-sm text-yellow-800">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <p>Upload and analyze a resume first to write a personalized cover letter.</p>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>Company name *</label>
            <input
              type="text"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              placeholder="e.g. Monzo, Stripe"
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Position title *</label>
            <input
              type="text"
              value={positionTitle}
              onChange={(e) => setPositionTitle(e.target.value)}
              placeholder="e.g. Frontend Developer"
              className={inputClass}
            />
          </div>
        </div>

        <div>
          <label className={labelClass}>Tone</label>
          <select value={tone} onChange={(e) => setTone(e.target.value)} className={inputClass}>
            <option value="professional">Professional and formal</option>
            <option value="friendly">Friendly and approachable</option>
            <option value="enthusiastic">Enthusiastic and energetic</option>
          </select>
        </div>

        <div>
          <label className={labelClass}>Job description *</label>
          <textarea
            value={jobDescription}
            onChange={(e) => setJobDescription(e.target.value)}
            placeholder="Paste the full job description, including requirements and responsibilities."
            rows={6}
            className={`${inputClass} resize-y`}
          />
        </div>

        <button
          onClick={generateCoverLetter}
          disabled={isGenerating || !resumeData}
          className="w-full bg-blue-600 text-white py-3 px-6 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium text-sm"
        >
          {isGenerating ? (
            <span className="flex items-center justify-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              Writing your cover letter...
            </span>
          ) : (
            'Generate cover letter'
          )}
        </button>

        {error && (
          <div className="flex items-start gap-2 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <p>{error}</p>
          </div>
        )}

        {result && (
          <div className="pt-2 space-y-5">
            <div className="flex items-start gap-2 rounded-lg bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-800">
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
              <div>
                <p className="font-medium">Cover letter ready</p>
                <p className="text-green-700">
                  {result.position_title} at {result.company_name}, {result.word_count} words, {result.tone} tone
                </p>
              </div>
            </div>

            <div className="border border-gray-200 rounded-xl overflow-hidden">
              <div className="flex items-center justify-between gap-2 px-4 py-3 bg-gray-50 border-b border-gray-200">
                <h3 className="text-sm font-semibold text-gray-900">Your cover letter</h3>
                <div className="flex gap-2">
                  <button
                    onClick={() => copyToClipboard(result.cover_letter)}
                    className="flex items-center gap-1.5 bg-white hover:bg-gray-50 border border-gray-300 text-gray-700 px-3 py-1.5 rounded-lg text-sm transition-colors"
                  >
                    {copied ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
                    {copied ? 'Copied' : 'Copy'}
                  </button>
                  <button
                    onClick={() =>
                      downloadAsDocx(
                        result.cover_letter,
                        `cover-letter-${result.company_name.toLowerCase()}-${result.position_title
                          .toLowerCase()
                          .replace(/\s+/g, '-')}.docx`,
                        'cover-letter'
                      )
                    }
                    className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg text-sm transition-colors"
                  >
                    <Download className="w-4 h-4" />
                    DOCX
                  </button>
                </div>
              </div>
              <div className="p-4 sm:p-5 whitespace-pre-wrap text-gray-800 text-sm leading-relaxed">
                {result.cover_letter}
              </div>
            </div>

            {result.optimization_tips && (
              <div className="rounded-xl bg-blue-50 border border-blue-100 p-4 sm:p-5">
                <h3 className="flex items-center gap-2 text-sm font-semibold text-blue-900 mb-2">
                  <Lightbulb className="w-4 h-4" />
                  Tips to improve it
                </h3>
                <div className="whitespace-pre-wrap text-blue-900 text-sm leading-relaxed">
                  {result.optimization_tips}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  )
}