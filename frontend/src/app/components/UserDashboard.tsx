'use client'

import { useAuth } from '../contexts/AuthContext'
import Link from 'next/link'

export default function UserDashboard() {
  const { user, logout } = useAuth()

  if (!user) return null

  const stats = [
    {
      name: 'Resume Analyses',
      value: user.resume_analyses_count || 0,
      icon: '📄',
      color: 'bg-blue-50 text-blue-600'
    },
    {
      name: 'Cover Letters',
      value: user.cover_letters_count || 0,
      icon: '📝',
      color: 'bg-green-50 text-green-600'
    },
    {
      name: 'Optimizations',
      value: user.optimizations_count || 0,
      icon: '🎯',
      color: 'bg-purple-50 text-purple-600'
    },
    {
      name: 'Chat Messages',
      value: user.chat_messages_count || 0,
      icon: '💬',
      color: 'bg-orange-50 text-orange-600'
    }
  ]

  const quickActions = [
    {
      title: 'Analyze Resume',
      description: 'Upload and get AI-powered feedback on your resume',
      href: '/resume',
      icon: '📄',
      color: 'bg-blue-500 hover:bg-blue-600'
    },
    {
      title: 'Career Chat',
      description: 'Get personalized career advice from our AI mentor',
      href: '/chat',
      icon: '💬',
      color: 'bg-green-500 hover:bg-green-600'
    },
    {
      title: 'Mock Interview',
      description: 'Practice interviews with AI feedback',
      href: '/interview',
      icon: '🎤',
      color: 'bg-purple-500 hover:bg-purple-600'
    },
    {
      title: 'Job Matching',
      description: 'Find jobs that match your skills and preferences',
      href: '/jobs',
      icon: '🎯',
      color: 'bg-orange-500 hover:bg-orange-600'
    }
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Welcome back, {user.full_name}!
              </h1>
              <p className="text-gray-600">
                Role: {user.role.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())} | 
                Member since {new Date(user.created_at).toLocaleDateString()}
              </p>
            </div>
            <div className="flex items-center space-x-4">
              <Link
                href="/profile"
                className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
              >
                Edit Profile
              </Link>
              <button
                onClick={logout}
                className="bg-red-100 hover:bg-red-200 text-red-700 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {stats.map((stat) => (
            <div key={stat.name} className="bg-white rounded-lg shadow-sm border p-6">
              <div className="flex items-center">
                <div className={`${stat.color} w-12 h-12 rounded-lg flex items-center justify-center text-2xl`}>
                  {stat.icon}
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">{stat.name}</p>
                  <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Quick Actions */}
        <div className="mb-8">
          <h2 className="text-xl font-bold text-gray-900 mb-6">Quick Actions</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {quickActions.map((action) => (
              <Link
                key={action.title}
                href={action.href}
                className="group bg-white rounded-lg shadow-sm border p-6 hover:shadow-md transition-shadow"
              >
                <div className={`${action.color} w-12 h-12 rounded-lg flex items-center justify-center text-2xl text-white mb-4 group-hover:scale-105 transition-transform`}>
                  {action.icon}
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">{action.title}</h3>
                <p className="text-sm text-gray-600">{action.description}</p>
              </Link>
            ))}
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Recent Activity</h2>
          <div className="space-y-4">
            <div className="flex items-center p-4 bg-gray-50 rounded-lg">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <span className="text-blue-600 text-lg">📄</span>
              </div>
              <div className="ml-4 flex-1">
                <p className="font-medium text-gray-900">Resume analysis completed</p>
                <p className="text-sm text-gray-600">2 hours ago</p>
              </div>
            </div>
            
            <div className="flex items-center p-4 bg-gray-50 rounded-lg">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <span className="text-green-600 text-lg">💬</span>
              </div>
              <div className="ml-4 flex-1">
                <p className="font-medium text-gray-900">Career chat session</p>
                <p className="text-sm text-gray-600">1 day ago</p>
              </div>
            </div>

            <div className="flex items-center p-4 bg-gray-50 rounded-lg">
              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                <span className="text-purple-600 text-lg">🎯</span>
              </div>
              <div className="ml-4 flex-1">
                <p className="font-medium text-gray-900">Resume optimized for Google position</p>
                <p className="text-sm text-gray-600">3 days ago</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}