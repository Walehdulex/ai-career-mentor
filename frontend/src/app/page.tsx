import ChatPage from "./chat/page";
import Link from 'next/link'

export default function Home() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-6xl mx-auto px-4 py-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            AI Tech Career Mentor
          </h1>
          <p className="text-gray-600 mb-6">
            Your AI-powered career companion for tech professionals
          </p>
          
          {/* Navigation Cards */}
          <div className="grid md:grid-cols-2 gap-6">
            <Link href="/chat" className="group">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 hover:bg-blue-100 transition-colors">
                <div className="flex items-center mb-3">
                  <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center mr-3">
                    <span className="text-white text-xl">💬</span>
                  </div>
                  <h2 className="text-xl font-semibold text-gray-900">Career Chat</h2>
                </div>
                <p className="text-gray-600">
                  Get personalized career advice, skill recommendations, and interview tips from your AI mentor.
                </p>
                <div className="mt-4 text-blue-600 group-hover:text-blue-700 font-medium">
                  Start chatting →
                </div>
              </div>
            </Link>
            
            <Link href="/resume" className="group">
              <div className="bg-green-50 border border-green-200 rounded-lg p-6 hover:bg-green-100 transition-colors">
                <div className="flex items-center mb-3">
                  <div className="w-10 h-10 bg-green-500 rounded-lg flex items-center justify-center mr-3">
                    <span className="text-white text-xl">📄</span>
                  </div>
                  <h2 className="text-xl font-semibold text-gray-900">Resume Analysis</h2>
                </div>
                <p className="text-gray-600">
                  Upload your resume for AI-powered feedback, ATS optimization, and improvement suggestions.
                </p>
                <div className="mt-4 text-green-600 group-hover:text-green-700 font-medium">
                  Analyze resume →
                </div>
              </div>
            </Link>
          </div>
        </div>
      </div>
      
      {/* Features */}
      <div className="max-w-6xl mx-auto px-4 py-12">
        <h2 className="text-2xl font-bold text-center text-gray-900 mb-8">
          Features Coming Soon
        </h2>
        <div className="grid md:grid-cols-3 gap-6">
          <div className="bg-white rounded-lg p-6 shadow-sm border">
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
              <span className="text-purple-600 text-2xl">🎯</span>
            </div>
            <h3 className="font-semibold mb-2">Job Matching</h3>
            <p className="text-gray-600 text-sm">AI-powered job recommendations based on your skills and experience.</p>
          </div>
          
          <div className="bg-white rounded-lg p-6 shadow-sm border">
            <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center mb-4">
              <span className="text-orange-600 text-2xl">🎤</span>
            </div>
            <h3 className="font-semibold mb-2">Mock Interviews</h3>
            <p className="text-gray-600 text-sm">Practice interviews with AI feedback on your responses.</p>
          </div>
          
          <div className="bg-white rounded-lg p-6 shadow-sm border">
            <div className="w-12 h-12 bg-pink-100 rounded-lg flex items-center justify-center mb-4">
              <span className="text-pink-600 text-2xl">📈</span>
            </div>
            <h3 className="font-semibold mb-2">Skills Tracking</h3>
            <p className="text-gray-600 text-sm">Track your learning progress and skill development over time.</p>
          </div>
        </div>
      </div>
    </div>
  )
}