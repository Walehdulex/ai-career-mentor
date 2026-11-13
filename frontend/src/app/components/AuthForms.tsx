'use client'

import { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { AlertCircle, Loader2, Eye, EyeOff, FileText, MessageCircle, Mic, Briefcase } from 'lucide-react'

interface AuthFormsProps {
  initialMode?: 'login' | 'register'
  onSuccess?: () => void
  onSwitchToRegister?: () => void
  onSwitchToLogin?: () => void
}

const labelClass = 'block text-sm font-medium text-gray-700 mb-1.5'
const inputClass =
  'block w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-900 placeholder-gray-400 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent'

const perks = [
  { icon: FileText, text: 'Get AI feedback on your resume' },
  { icon: MessageCircle, text: 'Ask your AI mentor career questions' },
  { icon: Mic, text: 'Practice interviews with scoring' },
  { icon: Briefcase, text: 'Find jobs that match your skills' },
]

export default function AuthForms({ initialMode = 'login', onSuccess }: AuthFormsProps) {
  const [mode, setMode] = useState<'login' | 'register'>(initialMode)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [showPassword, setShowPassword] = useState(false)

  // Form data
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  const { login, register } = useAuth()
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)

    try {
      if (mode === 'login') {
        const result = await login(username, password)
        if (result.success) {
          if (onSuccess) {
            onSuccess()
          } else {
            router.push('/dashboard')
          }
        } else {
          setError(result.error || 'Login failed')
        }
      } else {
        if (password !== confirmPassword) {
          setError('Passwords do not match')
          setIsLoading(false)
          return
        }

        if (password.length < 6) {
          setError('Password must be at least 6 characters')
          setIsLoading(false)
          return
        }

        const result = await register(username, email, password, fullName)
        if (result.success) {
          if (onSuccess) {
            onSuccess()
          } else {
            router.push('/dashboard')
          }
        } else {
          setError(result.error || 'Registration failed')
        }
      }
    } catch (err) {
      setError('An unexpected error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  const resetForm = () => {
    setUsername('')
    setEmail('')
    setPassword('')
    setFullName('')
    setConfirmPassword('')
    setError('')
    setShowPassword(false)
  }

  const switchMode = () => {
    setMode(mode === 'login' ? 'register' : 'login')
    resetForm()
  }

  const passwordType = showPassword ? 'text' : 'password'

  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-gray-50">
      {/* Brand panel, same gradient as the dashboard banner (desktop only) */}
      <div className="hidden lg:flex flex-col justify-between bg-gradient-to-br from-blue-600 to-purple-600 text-white p-12">
        <Link href="/" className="flex items-center gap-2.5 w-fit">
          <div className="w-9 h-9 rounded-lg bg-white/20 border border-white/30 text-sm font-bold flex items-center justify-center">
            AI
          </div>
          <span className="font-semibold text-lg">Career Mentor</span>
        </Link>

        <div>
          <h1 className="text-4xl font-bold leading-tight max-w-md">
            Your AI career mentor for tech professionals
          </h1>
          <ul className="mt-8 space-y-4">
            {perks.map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-center gap-3 text-blue-50">
                <div className="w-9 h-9 rounded-lg bg-white/15 flex items-center justify-center shrink-0">
                  <Icon className="w-4 h-4" />
                </div>
                {text}
              </li>
            ))}
          </ul>
        </div>

        <p className="text-sm text-blue-100">careermentorlab.com</p>
      </div>

      {/* Form */}
      <div className="flex items-center justify-center px-4 sm:px-8 py-10">
        <div className="w-full max-w-md">
          {/* Logo for mobile, where the brand panel is hidden */}
          <Link href="/" className="lg:hidden flex items-center justify-center gap-2.5 mb-8">
            <div className="w-9 h-9 rounded-lg bg-blue-600 text-white text-sm font-bold flex items-center justify-center">
              AI
            </div>
            <span className="font-semibold text-gray-900 text-lg">Career Mentor</span>
          </Link>

          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 sm:p-8">
            <h2 className="text-2xl font-bold text-gray-900">
              {mode === 'login' ? 'Sign in to your account' : 'Create your account'}
            </h2>
            <p className="mt-1.5 text-sm text-gray-600">
              {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
              <button
                type="button"
                onClick={switchMode}
                className="font-medium text-blue-600 hover:text-blue-700 focus:outline-none focus-visible:underline"
              >
                {mode === 'login' ? 'Sign up' : 'Sign in'}
              </button>
            </p>

            <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
              {mode === 'register' && (
                <div>
                  <label htmlFor="fullName" className={labelClass}>Full name</label>
                  <input
                    id="fullName"
                    name="fullName"
                    type="text"
                    required
                    autoComplete="name"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className={inputClass}
                    placeholder="Your full name"
                  />
                </div>
              )}

              <div>
                <label htmlFor="username" className={labelClass}>Username</label>
                <input
                  id="username"
                  name="username"
                  type="text"
                  required
                  autoComplete="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className={inputClass}
                  placeholder="Your username"
                />
              </div>

              {mode === 'register' && (
                <div>
                  <label htmlFor="email" className={labelClass}>Email</label>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    required
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className={inputClass}
                    placeholder="you@example.com"
                  />
                </div>
              )}

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                    Password
                  </label>
                  {mode === 'login' && (
                    <Link
                      href="/forgot-password"
                      className="text-xs font-medium text-blue-600 hover:text-blue-700 transition-colors"
                    >
                      Forgot password?
                    </Link>
                  )}
                </div>
                <div className="relative">
                  <input
                    id="password"
                    name="password"
                    type={passwordType}
                    required
                    autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className={`${inputClass} pr-10`}
                    placeholder={mode === 'login' ? 'Your password' : 'At least 6 characters'}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    className="absolute inset-y-0 right-0 px-3 text-gray-400 hover:text-gray-600 focus:outline-none focus-visible:text-blue-600"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {mode === 'register' && (
                <div>
                  <label htmlFor="confirmPassword" className={labelClass}>Confirm password</label>
                  <input
                    id="confirmPassword"
                    name="confirmPassword"
                    type={passwordType}
                    required
                    autoComplete="new-password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className={inputClass}
                    placeholder="Repeat your password"
                  />
                </div>
              )}

              {error && (
                <div
                  role="alert"
                  className="flex items-start gap-2 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700"
                >
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <p>{error}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={isLoading}
                className="w-full flex justify-center items-center gap-2 py-3 px-4 text-sm font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    {mode === 'login' ? 'Signing in...' : 'Creating account...'}
                  </>
                ) : mode === 'login' ? (
                  'Sign in'
                ) : (
                  'Create account'
                )}
              </button>

            </form>
          </div>

          <p className="mt-6 text-center text-sm text-gray-500">
            <Link href="/" className="hover:text-gray-700">Back to home</Link>
          </p>
        </div>
      </div>
    </div>
  )
}

export function LoginForm(props: Omit<AuthFormsProps, 'initialMode'>) {
  return <AuthForms {...props} initialMode="login" />
}

export function RegisterForm(props: Omit<AuthFormsProps, 'initialMode'>) {
  return <AuthForms {...props} initialMode="register" />
}