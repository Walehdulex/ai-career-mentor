'use client'

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
  Mic
} from 'lucide-react'
import { Header } from './layout/Header'

export default function UserDashboard() {
  const { user } = useAuth()
  const pathname = usePathname()

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

  const getColorClasses = (color: string) => {
    const colors: Record<string, string> = {
      blue: 'bg-blue-50 text-blue-600 group-hover:bg-blue-100',
      purple: 'bg-purple-50 text-purple-600 group-hover:bg-purple-100',
      green: 'bg-green-50 text-green-600 group-hover:bg-green-100',
      orange: 'bg-orange-50 text-orange-600 group-hover:bg-orange-100',
    }
    return colors[color]
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

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
                </Link>
              )
            })}
          </nav>
        </aside>

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
