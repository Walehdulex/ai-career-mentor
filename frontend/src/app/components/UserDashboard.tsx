'use client'

import { useAuth } from '../contexts/AuthContext'
import Link from 'next/link'
import {
  Briefcase,
  FileText,
  MessageCircle,
  Settings,
  Target,
  Mic,
  TrendingUp,
  ChevronRight,
} from 'lucide-react'
import { Header, MobileBottomNav } from './layout/Header'

export default function UserDashboard() {
  const { user } = useAuth()

  if (!user) return null

  const stats = [
    {
      name: 'Resume Analyses',
      value: user.resume_analyses_count || 0,
      icon: <FileText className="w-5 h-5" />,
      color: 'bg-blue-50 text-blue-600',
    },
    {
      name: 'Cover Letters',
      value: user.cover_letters_count || 0,
      icon: <FileText className="w-5 h-5" />,
      color: 'bg-green-50 text-green-600',
    },
    {
      name: 'Optimizations',
      value: user.optimizations_count || 0,
      icon: <Target className="w-5 h-5" />,
      color: 'bg-purple-50 text-purple-600',
    },
    {
      name: 'Chat Messages',
      value: user.chat_messages_count || 0,
      icon: <MessageCircle className="w-5 h-5" />,
      color: 'bg-orange-50 text-orange-600',
    },
  ]

  const quickActions = [
    {
      title: 'Analyze Resume',
      description: 'Upload and get AI-powered feedback on your resume',
      href: '/resume',
      icon: FileText,
      iconBg: 'bg-blue-600',
    },
    {
      title: 'Career Chat',
      description: 'Get personalized career advice from our AI mentor',
      href: '/chat',
      icon: MessageCircle,
      iconBg: 'bg-green-600',
    },
    {
      title: 'Mock Interview',
      description: 'Practice interviews with AI feedback and scoring',
      href: '/interview',
      icon: Mic,
      iconBg: 'bg-purple-600',
    },
    {
      title: 'Job Matching',
      description: 'Find jobs that match your skills and preferences',
      href: '/dashboard/jobs',
      icon: Briefcase,
      iconBg: 'bg-orange-500',
    },
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      {/* Welcome banner */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
          <h1 className="text-xl sm:text-3xl font-bold mb-1 leading-tight">
            Welcome back, {user.full_name}! 👋
          </h1>
          <p className="text-blue-100 text-sm">
            Member since {new Date(user.created_at).toLocaleDateString()}
          </p>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 space-y-6">

        {/* Stats — 2 cols on mobile, 4 on desktop */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {stats.map((stat) => (
            <div key={stat.name}
              className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex items-center gap-3">
              <div className={`${stat.color} w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0`}>
                {stat.icon}
              </div>
              <div className="min-w-0">
                <p className="text-xs text-gray-500 leading-tight truncate">{stat.name}</p>
                <p className="text-xl font-bold text-gray-900">{stat.value}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Quick Actions — 1 col mobile, 2 col sm, 4 col lg */}
        <div>
          <h2 className="text-base font-semibold text-gray-900 mb-3">Quick Actions</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            {quickActions.map((action) => {
              const Icon = action.icon
              return (
                <Link key={action.title} href={action.href}
                  className="group bg-white rounded-xl border border-gray-100 shadow-sm p-4
                             hover:shadow-md hover:border-blue-100 transition-all flex items-start gap-3">
                  <div className={`${action.iconBg} w-10 h-10 rounded-lg flex items-center justify-center
                                   flex-shrink-0 group-hover:scale-105 transition-transform`}>
                    <Icon className="w-5 h-5 text-white" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="font-semibold text-gray-900 text-sm mb-0.5">{action.title}</h3>
                    <p className="text-xs text-gray-500 leading-snug">{action.description}</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-300 flex-shrink-0 mt-0.5
                                           group-hover:text-blue-400 transition-colors" />
                </Link>
              )
            })}
          </div>
        </div>

        {/* Navigation shortcuts — visible on mobile since sidebar is gone */}
        <div className="sm:hidden">
          <h2 className="text-base font-semibold text-gray-900 mb-3">More</h2>
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm divide-y divide-gray-100">
            {[
              { href: '/api/applications', label: 'My Applications', icon: <Target className="w-4 h-4 text-gray-400" /> },
              { href: '/dashboard/jobs',         label: 'Job Board',        icon: <Briefcase className="w-4 h-4 text-gray-400" /> },
              { href: '/profile',      label: 'Profile Settings', icon: <Settings className="w-4 h-4 text-gray-400" /> },
            ].map(item => (
              <Link key={item.href} href={item.href}
                className="flex items-center justify-between px-4 py-3.5 hover:bg-gray-50 transition-colors">
                <div className="flex items-center gap-3">
                  {item.icon}
                  <span className="text-sm font-medium text-gray-700">{item.label}</span>
                </div>
                <ChevronRight className="w-4 h-4 text-gray-300" />
              </Link>
            ))}
          </div>
        </div>

      </div>

      <MobileBottomNav />
    </div>
  )
}