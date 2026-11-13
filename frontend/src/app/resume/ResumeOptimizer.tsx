'use client'

import { useState } from 'react'
import { Target, AlertCircle, CheckCircle2, Loader2, Copy, Check, Printer, Download, BarChart3 } from 'lucide-react'
import apiClient from '../../../lib/api'
import { ResumeTemplateSelector } from '../components/ResumeTemplateSelector'
import { generateTemplateDocx } from '../../../lib/docxGenerator'

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

const labelClass = 'block text-sm font-medium text-gray-700 mb-1.5'
const inputClass =
  'w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent'
const secondaryButton =
  'flex items-center gap-1.5 bg-white hover:bg-gray-50 border border-gray-300 text-gray-700 px-3 py-1.5 rounded-lg text-sm transition-colors'

export default function ResumeOptimizer({ resumeData }: ResumeOptimizerProps) {
  const [jobDescription, setJobDescription] = useState('')
  const [companyName, setCompanyName] = useState('')
  const [positionTitle, setPositionTitle] = useState('')
  const [optimizationLevel, setOptimizationLevel] = useState('moderate')
  const [isOptimizing, setIsOptimizing] = useState(false)
  const [result, setResult] = useState<OptimizationResult | null>(null)
  const [error, setError] = useState('')
  const [showComparison, setShowComparison] = useState(false)
  const [copied, setCopied] = useState(false)
  const [selectedTemplate, setSelectedTemplate] = useState<'ats' | 'modern' | 'engineering'>('ats')

  const optimizeResume = async () => {
    if (!jobDescription.trim() || !companyName.trim() || !positionTitle.trim()) {
      setError('Please fill in the company, position and job description')
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
        optimization_level: optimizationLevel,
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
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (error) {
      console.error('Failed to copy to clipboard:', error)
      setError('Could not copy to the clipboard')
    }
  }

  const downloadAsDocx = async () => {
    if (!result) return

    try {
      await generateTemplateDocx(
        result.optimized_resume,
        result.company_name,
        result.position_title,
        selectedTemplate
      )
    } catch (error) {
      console.error('Error generating DOCX:', error)
      setError('Could not download the DOCX file. Please try again.')
    }
  }

  const formatOriginalResume = () => {
    if (!resumeData) return ''

    const contact = resumeData.contact_info || {}
    const skills = resumeData.skills || {}
    const experience = resumeData.experience || []
    const education = resumeData.education || []

    const name = resumeData.raw_text?.split('\n')[0]?.trim() || contact.name || 'Your Name'

    let formatted = `${name}\n`
    formatted += `${contact.phone || 'Phone'} | ${contact.email || 'Email'}\n`
    if (contact.linkedin) formatted += `LinkedIn: ${contact.linkedin}\n`
    if (contact.github) formatted += `GitHub: ${contact.github}\n\n`

    formatted += 'TECHNICAL SKILLS\n'
    for (const [category, skillList] of Object.entries(skills)) {
      if (Array.isArray(skillList) && skillList.length > 0) {
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
    <section className="bg-white rounded-xl border border-gray-100 shadow-sm">
      <div className="px-5 sm:px-6 py-4 border-b border-gray-100 flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-orange-500 flex items-center justify-center shrink-0">
          <Target className="w-5 h-5 text-white" />
        </div>
        <div>
          <h2 className="text-base font-semibold text-gray-900">Tailor your resume to a job</h2>
          <p className="text-sm text-gray-500">Add the right keywords and improve ATS match rates</p>
        </div>
      </div>

      <div className="p-5 sm:p-6 space-y-5">
        {!resumeData && (
          <div className="flex items-start gap-2 rounded-lg bg-yellow-50 border border-yellow-200 px-4 py-3 text-sm text-yellow-800">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <p>Upload and analyze a resume first to tailor it to a job.</p>
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
          <label className={labelClass}>Optimization level</label>
          <select
            value={optimizationLevel}
            onChange={(e) => setOptimizationLevel(e.target.value)}
            className={inputClass}
          >
            <option value="conservative">Conservative: minimal, natural changes</option>
            <option value="moderate">Moderate: strategic keyword integration</option>
            <option value="aggressive">Aggressive: maximum ATS optimization</option>
          </select>
        </div>

        <div>
          <label className={labelClass}>Job description *</label>
          <textarea
            value={jobDescription}
            onChange={(e) => setJobDescription(e.target.value)}
            placeholder="Paste the full job description, including requirements, skills and responsibilities."
            rows={6}
            className={`${inputClass} resize-y`}
          />
        </div>

        <button
          onClick={optimizeResume}
          disabled={isOptimizing || !resumeData}
          className="w-full bg-blue-600 text-white py-3 px-6 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium text-sm"
        >
          {isOptimizing ? (
            <span className="flex items-center justify-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              Tailoring your resume...
            </span>
          ) : (
            'Tailor my resume'
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
                <p className="font-medium">Resume tailored</p>
                <p className="text-green-700">
                  {result.position_title} at {result.company_name}, {result.optimization_level} level, words{' '}
                  {result.original_word_count} to {result.optimized_word_count}
                </p>
              </div>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-gray-200">
              <button
                onClick={() => setShowComparison(false)}
                className={`px-4 sm:px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                  !showComparison
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-600 hover:text-gray-900'
                }`}
              >
                Tailored resume
              </button>
              <button
                onClick={() => setShowComparison(true)}
                className={`px-4 sm:px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                  showComparison
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-600 hover:text-gray-900'
                }`}
              >
                Before and after
              </button>
            </div>

            {!showComparison && (
              <div className="space-y-4">
                <div className="flex flex-wrap justify-end gap-2 bg-gray-50 p-3 rounded-lg border border-gray-200 print:hidden">
                  <button onClick={() => copyToClipboard(result.optimized_resume)} className={secondaryButton}>
                    {copied ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
                    {copied ? 'Copied' : 'Copy text'}
                  </button>
                  <button onClick={() => window.print()} className={secondaryButton}>
                    <Printer className="w-4 h-4" />
                    Print
                  </button>
                  <button
                    onClick={downloadAsDocx}
                    className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg text-sm transition-colors"
                  >
                    <Download className="w-4 h-4" />
                    Download DOCX
                  </button>
                </div>

                <ResumeTemplateSelector
                  resumeText={result.optimized_resume}
                  companyName={result.company_name}
                  positionTitle={result.position_title}
                  onTemplateChange={(template) => setSelectedTemplate(template)}
                />
              </div>
            )}

            {showComparison && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="border border-gray-200 rounded-xl overflow-hidden bg-white">
                  <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
                    <h4 className="text-sm font-semibold text-gray-900">Original</h4>
                    <p className="text-xs text-gray-500">Your resume before changes</p>
                  </div>
                  <div className="p-4 max-h-[600px] overflow-y-auto whitespace-pre-wrap text-gray-800 text-sm font-mono">
                    {formatOriginalResume()}
                  </div>
                </div>

                <div className="border border-blue-200 rounded-xl overflow-hidden bg-white">
                  <div className="px-4 py-3 bg-blue-50 border-b border-blue-200">
                    <h4 className="text-sm font-semibold text-gray-900">Tailored</h4>
                    <p className="text-xs text-gray-500">With keywords and better structure</p>
                  </div>
                  <div className="p-4 max-h-[600px] overflow-y-auto whitespace-pre-wrap text-gray-800 text-sm">
                    {result.optimized_resume}
                  </div>
                </div>
              </div>
            )}

            <div className="rounded-xl bg-blue-50 border border-blue-100 p-4 sm:p-5">
              <h3 className="flex items-center gap-2 text-sm font-semibold text-blue-900 mb-2">
                <BarChart3 className="w-4 h-4" />
                What changed
              </h3>
              <div className="whitespace-pre-wrap text-blue-900 text-sm leading-relaxed">
                {result.optimization_summary}
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  )
}