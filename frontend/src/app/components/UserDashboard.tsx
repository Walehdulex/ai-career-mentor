'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Briefcase,
  FileText,
  Bell,
  TrendingUp,
  Check,
  ArrowRight,
  MessageCircle,
  Settings,
  Target,
<<<<<<< Updated upstream
  Mic
} from 'lucide-react'
import { Header } from './layout/Header'

export default function UserDashboard() {
  const { user } = useAuth()
  const pathname = usePathname()
=======
  Mic,
  ChevronRight,
  CheckCircle2,
  Circle,
  MapPin,
} from 'lucide-react'
import { Header, MobileBottomNav } from './layout/Header'
import { apiClient } from '../../../lib/api'

interface TopMatch {
  id: number
  title: string
  company: string
  location: string
  remoteType: string
  matchScore: number
}

const getMatchScoreColor = (score: number) => {
  if (score >= 90) return 'bg-green-100 text-green-800 border-green-200'
  if (score >= 80) return 'bg-blue-100 text-blue-800 border-blue-200'
  if (score >= 70) return 'bg-yellow-100 text-yellow-800 border-yellow-200'
  return 'bg-gray-100 text-gray-800 border-gray-200'
}

export default function UserDashboard() {
  const { user, userProfile } = useAuth()
  const [matches, setMatches] = useState<TopMatch[]>([])
  const [matchesLoading, setMatchesLoading] = useState(true)
  const [matchesError, setMatchesError] = useState(false)

  useEffect(() => {
    if (!user) return

    const loadMatches = async () => {
      try {
        const response = await apiClient.get('/api/jobs/recommendations', {
          params: { limit: 20, min_score: 0 },
        })
        const list: TopMatch[] = (response.data?.recommendations || [])
          .map((rec: any) => ({
            id: rec.job.id,
            title: rec.job.title,
            company: rec.job.company_name,
            location: rec.job.location,
            remoteType: rec.job.remote_type,
            matchScore: rec.match_score,
          }))
          .sort((a: TopMatch, b: TopMatch) => b.matchScore - a.matchScore)
          .slice(0, 3)
        setMatches(list)
      } catch (error) {
        console.error('Could not load job matches:', error)
        setMatchesError(true)
      } finally {
        setMatchesLoading(false)
      }
    }

    loadMatches()
  }, [user])
>>>>>>> Stashed changes

  if (!user) return null

  const navItems = [
    { name: 'Dashboard', href: '/dashboard', icon: FileText },
    { name: 'Job Matching', href: '/dashboard/jobs', icon: Briefcase },
    { name: 'Career Chat', href: '/chat', icon: MessageCircle },
    { name: 'Profile', href: '/profile', icon: Settings },
  ]

  const stats = [
    {
      name: 'Resume Analyses',
      value: user.resume_analyses_count || 0,
      icon: <FileText className="w-6 h-6" />,
      color: 'bg-blue-50 text-blue-600',
    },
    {
      name: 'Cover Letters',
      value: user.cover_letters_count || 0,
      icon: <FileText className="w-6 h-6" />,
      color: 'bg-green-50 text-green-600',
    },
    {
      name: 'Optimizations',
      value: user.optimizations_count || 0,
      icon: <Target className="w-6 h-6" />,
      color: 'bg-purple-50 text-purple-600',
    },
    {
      name: 'Chat Messages',
      value: user.chat_messages_count || 0,
      icon: <MessageCircle className="w-6 h-6" />,
      color: 'bg-orange-50 text-orange-600',
    },
  ]

  const quickActions = [
    {
      title: 'Analyze Resume',
      description: 'Upload and get AI-powered feedback on your resume',
      href: '/resume',
      icon: FileText, // Component type (not JSX)
      color: 'blue',
    },
    {
      title: 'Career Chat',
      description: 'Get personalized career advice from our AI mentor',
      href: '/chat',
      icon: MessageCircle,
      color: 'green',
    },
    {
      title: 'Mock Interview',
      description: 'Practice interviews with AI feedback',
      href: '/interview',
      icon: Mic,
      color: 'purple',
    },
    {
      title: 'Job Matching',
      description: 'Find jobs that match your skills and preferences',
      href: '/dashboard/jobs',
      icon: Briefcase,
      color: 'orange',
    },
  ]

<<<<<<< Updated upstream
  const getColorClasses = (color: string) => {
    const colors: Record<string, string> = {
      blue: 'bg-blue-50 text-blue-600 group-hover:bg-blue-100',
      purple: 'bg-purple-50 text-purple-600 group-hover:bg-purple-100',
      green: 'bg-green-50 text-green-600 group-hover:bg-green-100',
      orange: 'bg-orange-50 text-orange-600 group-hover:bg-orange-100',
    }
    return colors[color]
  }
=======
  // Get started checklist, based on counts and profile fields we already have
  const profileDone = !!(userProfile?.current_role && userProfile?.industry && userProfile?.career_goals)
  const checklist = [
    { label: 'Complete your profile', done: profileDone, href: '/profile' },
    { label: 'Analyze your resume', done: (user.resume_analyses_count || 0) > 0, href: '/resume' },
    { label: 'Tailor your resume to a job', done: (user.optimizations_count || 0) > 0, href: '/resume' },
    { label: 'Write a cover letter', done: (user.cover_letters_count || 0) > 0, href: '/resume' },
    { label: 'Ask the career chat a question', done: (user.chat_messages_count || 0) > 0, href: '/chat' },
  ]
  const doneCount = checklist.filter((item) => item.done).length
  const showChecklist = doneCount < checklist.length

  const memberSince = user.created_at ? new Date(user.created_at).toLocaleDateString() : null
>>>>>>> Stashed changes

  return (
    <div className="min-h-screen bg-gray-50 pb-24 sm:pb-0">
      <Header />

<<<<<<< Updated upstream
      <div className="flex">
        {/* Sidebar */}
        <aside className="w-64 bg-white border-r shadow-sm p-4 min-h-[calc(100vh-64px)]">
          <h2 className="text-lg font-bold text-gray-900 mb-6">My Dashboard</h2>
          <nav className="space-y-2">
            {navItems.map((item) => {
              const isActive = pathname === item.href
              const Icon = item.icon
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors
                    ${
                      isActive
                        ? 'bg-blue-50 text-blue-600 border border-blue-200'
                        : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
                    }`}
                >
                  <Icon className="w-5 h-5" />
                  <span>{item.name}</span>
=======
      {/* Welcome banner */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
          <h1 className="text-xl sm:text-3xl font-bold mb-1 leading-tight">
            Welcome back, {user.full_name}! 👋
          </h1>
          {memberSince && <p className="text-blue-100 text-sm">Member since {memberSince}</p>}
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* Stats: 2 cols on mobile, 4 on desktop */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {stats.map((stat) => (
            <div
              key={stat.name}
              className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex items-center gap-3"
            >
              <div
                className={`${stat.color} w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0`}
              >
                {stat.icon}
              </div>
              <div className="min-w-0">
                <p className="text-xs text-gray-500 leading-tight truncate">{stat.name}</p>
                <p className="text-xl font-bold text-gray-900">{stat.value}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Top matches and get started */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
          {/* Top job matches */}
          <section
            className={`bg-white rounded-xl border border-gray-100 shadow-sm ${
              showChecklist ? 'lg:col-span-2' : 'lg:col-span-3'
            }`}
          >
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between gap-3">
              <h2 className="text-base font-semibold text-gray-900">Your top job matches</h2>
              <Link
                href="/dashboard/jobs"
                className="text-sm font-medium text-blue-600 hover:text-blue-700 flex items-center gap-0.5"
              >
                View all <ChevronRight className="w-4 h-4" />
              </Link>
            </div>

            {matchesLoading ? (
              <div className="p-5 space-y-3">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="h-14 rounded-lg bg-gray-100 animate-pulse" />
                ))}
              </div>
            ) : matches.length > 0 ? (
              <ul className="divide-y divide-gray-100">
                {matches.map((job) => (
                  <li key={job.id}>
                    <Link
                      href="/dashboard/jobs"
                      className="flex items-center justify-between gap-3 px-5 py-3.5 hover:bg-gray-50 transition-colors"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-gray-900 truncate">{job.title}</p>
                        <p className="text-xs text-gray-500 truncate">{job.company}</p>
                        <p className="text-xs text-gray-400 mt-0.5 flex items-center gap-1 truncate">
                          <MapPin className="w-3 h-3 shrink-0" />
                          {job.location}
                          {job.remoteType ? ` · ${job.remoteType}` : ''}
                        </p>
                      </div>
                      <span
                        className={`shrink-0 px-2 py-0.5 rounded-full text-xs font-medium border ${getMatchScoreColor(
                          job.matchScore
                        )}`}
                      >
                        {job.matchScore}% match
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="p-6 text-center">
                <p className="text-sm text-gray-600">
                  {matchesError
                    ? "We couldn't load your matches right now. Try again in a moment."
                    : 'No matches yet. Add your skills and job preferences to start getting recommendations.'}
                </p>
                {!matchesError && (
                  <Link
                    href="/profile"
                    className="mt-3 inline-block text-sm font-medium text-blue-600 hover:text-blue-700"
                  >
                    Complete your profile
                  </Link>
                )}
              </div>
            )}
          </section>

          {/* Get started checklist, hidden once everything is done */}
          {showChecklist && (
            <section className="bg-white rounded-xl border border-gray-100 shadow-sm">
              <div className="px-5 py-4 border-b border-gray-100">
                <div className="flex items-center justify-between">
                  <h2 className="text-base font-semibold text-gray-900">Get started</h2>
                  <span className="text-xs text-gray-500">
                    {doneCount} of {checklist.length} done
                  </span>
                </div>
                <div className="mt-2 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-blue-600 to-purple-600 rounded-full transition-all"
                    style={{ width: `${(doneCount / checklist.length) * 100}%` }}
                  />
                </div>
              </div>
              <ul className="divide-y divide-gray-100">
                {checklist.map((item) => (
                  <li key={item.label}>
                    <Link
                      href={item.href}
                      className="flex items-center gap-3 px-5 py-3 hover:bg-gray-50 transition-colors"
                    >
                      {item.done ? (
                        <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0" />
                      ) : (
                        <Circle className="w-5 h-5 text-gray-300 shrink-0" />
                      )}
                      <span
                        className={`text-sm ${
                          item.done ? 'text-gray-400 line-through' : 'text-gray-700 font-medium'
                        }`}
                      >
                        {item.label}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>

        {/* Quick Actions: 1 col mobile, 2 col sm, 4 col lg */}
        <div>
          <h2 className="text-base font-semibold text-gray-900 mb-3">Quick Actions</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            {quickActions.map((action) => {
              const Icon = action.icon
              return (
                <Link
                  key={action.title}
                  href={action.href}
                  className="group bg-white rounded-xl border border-gray-100 shadow-sm p-4
                             hover:shadow-md hover:border-blue-100 transition-all flex items-start gap-3"
                >
                  <div
                    className={`${action.iconBg} w-10 h-10 rounded-lg flex items-center justify-center
                                   flex-shrink-0 group-hover:scale-105 transition-transform`}
                  >
                    <Icon className="w-5 h-5 text-white" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="font-semibold text-gray-900 text-sm mb-0.5">{action.title}</h3>
                    <p className="text-xs text-gray-500 leading-snug">{action.description}</p>
                  </div>
                  <ChevronRight
                    className="w-4 h-4 text-gray-300 flex-shrink-0 mt-0.5
                                           group-hover:text-blue-400 transition-colors"
                  />
>>>>>>> Stashed changes
                </Link>
              )
            })}
          </nav>
        </aside>

<<<<<<< Updated upstream
        {/* Main content */}
        <div className="flex-1">
          <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-sm">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
              <h1 className="text-3xl font-bold mb-2">
                Welcome back, {user.full_name}! 👋
              </h1>
              <p className="text-blue-100">
                Member since {new Date(user.created_at).toLocaleDateString()}
              </p>
            </div>
          </div>

          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              {stats.map((stat) => (
                <div
                  key={stat.name}
                  className="bg-white rounded-lg shadow-sm border p-6 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-center">
                    <div
                      className={`${stat.color} w-12 h-12 rounded-lg flex items-center justify-center`}
                    >
                      {stat.icon}
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-600">
                        {stat.name}
                      </p>
                      <p className="text-2xl font-bold text-gray-900">
                        {stat.value}
                      </p>
                    </div>
                  </div>
=======
        {/* Navigation shortcuts, visible on mobile since the sidebar is gone */}
        <div className="sm:hidden">
          <h2 className="text-base font-semibold text-gray-900 mb-3">More</h2>
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm divide-y divide-gray-100">
            {[
              {
                href: '/dashboard/jobs?tab=applications',
                label: 'My Applications',
                icon: <Target className="w-4 h-4 text-gray-400" />,
              },
              {
                href: '/dashboard/jobs',
                label: 'Job Board',
                icon: <Briefcase className="w-4 h-4 text-gray-400" />,
              },
              {
                href: '/profile',
                label: 'Profile Settings',
                icon: <Settings className="w-4 h-4 text-gray-400" />,
              },
            ].map((item) => (
              <Link
                key={item.label}
                href={item.href}
                className="flex items-center justify-between px-4 py-3.5 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  {item.icon}
                  <span className="text-sm font-medium text-gray-700">{item.label}</span>
>>>>>>> Stashed changes
                </div>
              ))}
            </div>

            {/* ✅ FIXED Quick Actions */}
            <div className="mb-8">
              <h2 className="text-xl font-bold text-gray-900 mb-6">
                Quick Actions
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {quickActions.map((action) => {
                  const Icon = action.icon
                  return (
                    <Link
                      key={action.title}
                      href={action.href}
                      className="group bg-white rounded-lg shadow-sm border p-6 hover:shadow-md transition-all"
                    >
                      <div
                        className={`${action.color} w-12 h-12 rounded-lg flex items-center justify-center text-white mb-4 group-hover:scale-110 transition-transform`}
                      >
                        <Icon className="w-6 h-6" /> {/* ✅ Fixed rendering */}
                      </div>
                      <h3 className="font-semibold text-gray-900 mb-2">
                        {action.title}
                      </h3>
                      <p className="text-sm text-gray-600">{action.description}</p>
                    </Link>
                  )
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
