import Link from 'next/link'
import {
  Briefcase,
  FileText,
  MessageCircle,
  Mic,
  TrendingUp,
  ChevronRight,
  CheckCircle2,
} from 'lucide-react'

const tryNow = [
  {
    title: 'Career Chat',
    description: 'Get personalized career advice, skill recommendations, and interview tips from your AI mentor.',
    cta: 'Start chatting',
    href: '/chat',
    icon: MessageCircle,
    iconBg: 'bg-green-600',
  },
  {
    title: 'Resume Analysis',
    description: 'Upload your resume for AI-powered feedback, ATS optimization, and improvement suggestions.',
    cta: 'Analyze my resume',
    href: '/resume',
    icon: FileText,
    iconBg: 'bg-blue-600',
  },
]

const memberFeatures = [
  {
    title: 'Job Matching',
    description: 'Get job recommendations based on your skills and experience.',
    icon: Briefcase,
    iconBg: 'bg-orange-500',
  },
  {
    title: 'Mock Interviews',
    description: 'Practice interviews and get AI feedback and scoring on your answers.',
    icon: Mic,
    iconBg: 'bg-purple-600',
  },
  {
    title: 'Skills Tracking',
    description: 'Track your learning progress and skill development over time.',
    icon: TrendingUp,
    iconBg: 'bg-pink-500',
  },
]

const highlights = [
  'Resume feedback in seconds',
  'Built for tech careers',
  'Interview practice with scoring',
]

export default function Home() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top nav — same logo treatment as the dashboard header */}
      <header className="bg-white border-b border-gray-100">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-600 text-white text-xs font-bold flex items-center justify-center">
              AI
            </div>
            <span className="font-semibold text-gray-900">Career Mentor</span>
          </Link>

          <div className="flex items-center gap-2 sm:gap-3">
            <Link
              href="/login"
              className="px-3 sm:px-4 py-2 text-sm font-medium text-gray-700 rounded-lg hover:bg-gray-100 transition-colors"
            >
              Login
            </Link>
            <Link
              href="/register"
              className="px-3 sm:px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Sign Up
            </Link>
          </div>
        </div>
      </header>

      {/* Hero banner — same gradient as the dashboard welcome banner */}
      <section className="bg-gradient-to-r from-blue-600 to-purple-600 text-white">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-12 sm:py-20">
          <h1 className="text-3xl sm:text-5xl font-bold leading-tight max-w-2xl">
            Your AI career mentor for tech professionals
          </h1>
          <p className="mt-4 text-blue-100 text-base sm:text-lg max-w-xl">
            Improve your resume, practice interviews, and find roles that fit your skills, all in one place.
          </p>

          <div className="mt-8 flex flex-col sm:flex-row gap-3">
            <Link
              href="/register"
              className="inline-flex items-center justify-center px-6 py-3 rounded-lg bg-white text-blue-700 font-semibold hover:bg-blue-50 transition-colors"
            >
              Create your account
            </Link>
            <Link
              href="/chat"
              className="inline-flex items-center justify-center px-6 py-3 rounded-lg border border-white/40 text-white font-semibold hover:bg-white/10 transition-colors"
            >
              Try Career Chat
            </Link>
          </div>

          <ul className="mt-8 flex flex-col sm:flex-row sm:flex-wrap gap-x-6 gap-y-2 text-sm text-blue-100">
            {highlights.map((item) => (
              <li key={item} className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                {item}
              </li>
            ))}
          </ul>
        </div>
      </section>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8 sm:py-12 space-y-10">
        {/* Try without an account */}
        <section>
          <h2 className="text-base font-semibold text-gray-900 mb-3">Try it now</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
            {tryNow.map((item) => {
              const Icon = item.icon
              return (
                <Link
                  key={item.title}
                  href={item.href}
                  className="group bg-white rounded-xl border border-gray-100 shadow-sm p-5 hover:shadow-md hover:border-blue-100 transition-all flex items-start gap-4"
                >
                  <div
                    className={`${item.iconBg} w-11 h-11 rounded-lg flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform`}
                  >
                    <Icon className="w-5 h-5 text-white" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="font-semibold text-gray-900 mb-1">{item.title}</h3>
                    <p className="text-sm text-gray-500 leading-snug">{item.description}</p>
                    <span className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-blue-600 group-hover:text-blue-700">
                      {item.cta}
                      <ChevronRight className="w-4 h-4" />
                    </span>
                  </div>
                </Link>
              )
            })}
          </div>
        </section>

        {/* Member features */}
        <section>
          <div className="mb-3">
            <h2 className="text-base font-semibold text-gray-900">With a free account</h2>
            <p className="text-sm text-gray-500 mt-0.5">
              Sign up to unlock these and keep your progress saved.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
            {memberFeatures.map((feature) => {
              const Icon = feature.icon
              return (
                <div
                  key={feature.title}
                  className="bg-white rounded-xl border border-gray-100 shadow-sm p-5"
                >
                  <div
                    className={`${feature.iconBg} w-10 h-10 rounded-lg flex items-center justify-center mb-3`}
                  >
                    <Icon className="w-5 h-5 text-white" />
                  </div>
                  <h3 className="font-semibold text-gray-900 text-sm mb-1">{feature.title}</h3>
                  <p className="text-xs text-gray-500 leading-snug">{feature.description}</p>
                </div>
              )
            })}
          </div>
        </section>

        {/* Closing call to action */}
        <section className="rounded-2xl bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-8 sm:px-10 sm:py-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-5">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold">Ready for your next role?</h2>
            <p className="text-blue-100 text-sm mt-1">
              Create an account and get your first resume analysis today.
            </p>
          </div>
          <Link
            href="/register"
            className="inline-flex items-center justify-center px-6 py-3 rounded-lg bg-white text-blue-700 font-semibold hover:bg-blue-50 transition-colors shrink-0"
          >
            Sign Up
          </Link>
        </section>
      </main>

      <footer className="border-t border-gray-100 bg-white">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 text-sm text-gray-500 flex flex-col sm:flex-row justify-between gap-2">
          <span>© {new Date().getFullYear()} AI Career Mentor</span>
          <div className="flex gap-4">
            <Link href="/login" className="hover:text-gray-700">Login</Link>
            <Link href="/register" className="hover:text-gray-700">Sign Up</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}