import ChatPage from "./chat/page";
import Link from 'next/link'

export default function Home() {
  
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-6xl mx-auto px-4 py-6 sm:py-8">
          {/* Top Bar with Auth Buttons */}
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
                AI Tech Career Mentor
              </h1>
              <p className="text-sm sm:text-base text-gray-600">
                Your AI-powered career companion for tech professionals
              </p>
            </div>
            
            {/* Auth Buttons */}
            <div className="flex gap-3">
              <Link href="/login" className="flex-1 sm:flex-none">
                <button className="w-full px-4 sm:px-6 py-2 text-sm sm:text-base text-blue-600 font-medium border-2 border-blue-600 rounded-lg hover:bg-blue-50 transition-colors whitespace-nowrap">
                  Login
                </button>
              </Link>
              <Link href="/register" className="flex-1 sm:flex-none">
                <button className="w-full px-4 sm:px-6 py-2 text-sm sm:text-base bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors whitespace-nowrap">
                  Sign Up
                </button>
              </Link>
            </div>
          </div>
          
          {/* Navigation Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
            <Link href="/chat" className="group">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-5 sm:p-6 hover:bg-blue-100 transition-colors h-full">
                <div className="flex items-center mb-3">
                  <div className="w-10 h-10 shrink-0 bg-blue-500 rounded-lg flex items-center justify-center mr-3">
                    <span className="text-white text-xl">💬</span>
                  </div>
                  <h2 className="text-lg sm:text-xl font-semibold text-gray-900">Career Chat</h2>
                </div>
                <p className="text-sm sm:text-base text-gray-600">
                  Get personalized career advice, skill recommendations, and interview tips from your AI mentor.
                </p>
                <div className="mt-4 text-blue-600 group-hover:text-blue-700 font-medium text-sm sm:text-base">
                  Start chatting →
                </div>
              </div>
            </Link>
            
            <Link href="/resume" className="group">
              <div className="bg-green-50 border border-green-200 rounded-lg p-5 sm:p-6 hover:bg-green-100 transition-colors h-full">
                <div className="flex items-center mb-3">
                  <div className="w-10 h-10 shrink-0 bg-green-500 rounded-lg flex items-center justify-center mr-3">
                    <span className="text-white text-xl">📄</span>
                  </div>
                  <h2 className="text-lg sm:text-xl font-semibold text-gray-900">Resume Analysis</h2>
                </div>
                <p className="text-sm sm:text-base text-gray-600">
                  Upload your resume for AI-powered feedback, ATS optimization, and improvement suggestions.
                </p>
                <div className="mt-4 text-green-600 group-hover:text-green-700 font-medium text-sm sm:text-base">
                  Analyze resume →
                </div>
              </div>
            </Link>
          </div>
        </div>
      </div>
      
      {/* Features */}
      <div className="max-w-6xl mx-auto px-4 py-10 sm:py-12">
        <h2 className="text-xl sm:text-2xl font-bold text-center text-gray-900 mb-8 px-2">
          Features Accessible only by registered Users
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6">
          <div className="bg-white rounded-lg p-5 sm:p-6 shadow-sm border">
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
              <span className="text-purple-600 text-2xl">🎯</span>
            </div>
            <h3 className="font-semibold mb-2 text-black">Job Matching</h3>
            <p className="text-gray-600 text-sm">AI-powered job recommendations based on your skills and experience.</p>
          </div>
          
          <div className="bg-white rounded-lg p-5 sm:p-6 shadow-sm border">
            <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center mb-4">
              <span className="text-orange-600 text-2xl">🎤</span>
            </div>
            <h3 className="font-semibold mb-2 text-black">Mock Interviews</h3>
            <p className="text-gray-600 text-sm">Practice interviews with AI feedback on your responses.</p>
          </div>
          
          <div className="bg-white rounded-lg p-5 sm:p-6 shadow-sm border">
            <div className="w-12 h-12 bg-pink-100 rounded-lg flex items-center justify-center mb-4">
              <span className="text-pink-600 text-2xl">📈</span>
            </div>
            <h3 className="font-semibold mb-2 text-black">Skills Tracking</h3>
            <p className="text-gray-600 text-sm">Track your learning progress and skill development over time.</p>
          </div>
        </div>  
      </div>
    </div>
  )
}