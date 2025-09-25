'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import * as z from 'zod'

// Email & Code schemas
const emailSchema = z.object({
  email: z.string().min(1, 'Email is required').email('Please enter a valid email'),
})
const codeSchema = z.object({
  code: z.string().length(6, 'Code must be 6 digits'),
})

// Password schema with confirm
const passwordSchema = z
  .object({
    password: z.string().min(8, 'Password must be at least 8 characters'),
    confirmPassword: z.string().min(8, 'Confirm password is required'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  })

type EmailFormData = z.infer<typeof emailSchema>
type CodeFormData = z.infer<typeof codeSchema>
type PasswordFormData = z.infer<typeof passwordSchema>

export default function ForgotPasswordForm() {
  const [step, setStep] = useState<'email' | 'code' | 'reset'>('email')
  const [isLoading, setIsLoading] = useState(false)
  const [asyncError, setAsyncError] = useState('')
  const [success, setSuccess] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [passwordStrength, setPasswordStrength] = useState({ score: 0, text: '' })

  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')

  const router = useRouter()

  // Forms
  const { register: registerEmail, handleSubmit: handleSubmitEmail, formState: { errors: emailErrors } } =
    useForm<EmailFormData>({ resolver: zodResolver(emailSchema) })

  const { register: registerCode, handleSubmit: handleSubmitCode, formState: { errors: codeErrors } } =
    useForm<CodeFormData>({ resolver: zodResolver(codeSchema) })

  const { register, handleSubmit, watch, formState: { errors: passwordErrors } } =
    useForm<PasswordFormData>({ resolver: zodResolver(passwordSchema), mode: 'onChange' })

  const password = watch('password', '')

  // Password strength calculation
  useEffect(() => {
    if (!password) {
      setPasswordStrength({ score: 0, text: '' })
      return
    }
    let score = 0
    if (password.length >= 8) score++
    if (password.length >= 12) score++
    if (/[a-z]/.test(password)) score++
    if (/[A-Z]/.test(password)) score++
    if (/[0-9]/.test(password)) score++
    if (/[^A-Za-z0-9]/.test(password)) score++
    const text = score <= 2 ? 'Weak' : score <= 4 ? 'Fair' : score <= 5 ? 'Good' : 'Strong'
    setPasswordStrength({ score, text })
  }, [password])

  // Step handlers
  const submitEmail = async (data: EmailFormData) => {
    setIsLoading(true)
    setAsyncError('')
    setSuccess('')
    try {
      const res = await fetch('/api/auth/request-reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: data.email }),
      })
      const result = await res.json()
      if (result.ok) {
        setEmail(data.email)
        setSuccess(`Verification code sent to ${data.email}`)
        setStep('code')
      } else {
        setAsyncError(result.error)
      }
    } catch {
      setAsyncError('Something went wrong. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const submitCode = async (data: CodeFormData) => {
    setAsyncError('')
    setSuccess('')
    setCode(data.code)
    setStep('reset')
  }

  const submitPassword = async (data: PasswordFormData) => {
    setIsLoading(true)
    setAsyncError('')
    setSuccess('')
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          code,
          newPassword: data.password,
        }),
      })
      const result = await res.json()
      if (result.ok) {
        setSuccess('Password successfully reset! Redirecting to login...')
        setTimeout(() => router.push('/login'), 2000)
      } else {
        setAsyncError(result.error)
      }
    } catch {
      setAsyncError('Something went wrong. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const togglePassword = (field: 'password' | 'confirmPassword') => {
    if (field === 'password') setShowPassword(!showPassword)
    else setShowConfirmPassword(!showConfirmPassword)
  }

  const stepOrder: ('email' | 'code' | 'reset')[] = ['email', 'code', 'reset']
  const stepLabels = ['Email', 'Verification', 'Reset Password']

  return (
    <div className="auth-container flex items-center justify-center min-h-screen bg-gray-50">
      <div className="auth-card w-full max-w-md p-8 bg-white rounded-2xl shadow-lg relative">
        {/* Logo */}
        <div className="logo-section text-center mb-6">
          <div className="logo text-4xl mb-2">📖</div>
          <h1 className="brand-name text-2xl font-bold mb-1">StoryForge</h1>
          <p className="brand-tagline text-gray-500 text-sm">Collaborative storytelling reimagined</p>
        </div>

        {/* Step Indicator */}
        <div className="flex justify-between mb-6">
          {stepLabels.map((label, idx) => {
            const currentStepIndex = stepOrder.indexOf(step)
            const completed = idx <= currentStepIndex
            return (
              <div key={idx} className="flex-1 text-center relative">
                <div
                  className={`mx-auto w-8 h-8 rounded-full flex items-center justify-center transition-colors duration-300 ${
                    completed ? 'bg-indigo-500 text-white' : 'bg-gray-200 text-gray-500'
                  }`}
                >
                  {idx + 1}
                </div>
                <div className="text-xs mt-1 text-gray-800">{label}</div>
                {idx < stepLabels.length - 1 && (
                  <div
                    className={`absolute top-3 left-1/2 w-full h-1 transition-colors duration-300 ${
                      idx < currentStepIndex ? 'bg-indigo-500' : 'bg-gray-200'
                    }`}
                    style={{ zIndex: -1 }}
                  ></div>
                )}
              </div>
            )
          })}
        </div>

        {/* Messages */}
        {success && <div className="text-green-600 mb-3">{success}</div>}
        {asyncError && <div className="text-red-600 mb-3">{asyncError}</div>}

        {/* Forms */}
        {step === 'email' && (
          <form onSubmit={handleSubmitEmail(submitEmail)} className="space-y-4">
            <input
              type="email"
              {...registerEmail('email')}
              placeholder="Email address"
              className={`w-full p-3 border rounded-lg text-gray-800 ${emailErrors.email ? 'border-red-500' : 'border-gray-300'}`}
            />
            {emailErrors.email && <div className="text-red-500 text-sm">{emailErrors.email.message}</div>}
            <button
              type="submit"
              className="w-full bg-indigo-500 hover:bg-indigo-600 text-white p-3 rounded-lg flex items-center justify-center"
              disabled={isLoading}
            >
              {isLoading && <Loader2 className="mr-2 h-5 w-5 animate-spin" />}
              {isLoading ? 'Sending...' : 'Send Verification Code'}
            </button>
          </form>
        )}

        {step === 'code' && (
          <form onSubmit={handleSubmitCode(submitCode)} className="space-y-4">
            <input
              type="text"
              {...registerCode('code')}
              placeholder="6-digit code"
              className={`w-full p-3 border rounded-lg text-gray-800 ${codeErrors.code || asyncError ? 'border-red-500' : 'border-gray-300'}`}
            />
            {codeErrors.code && <div className="text-red-500 text-sm">{codeErrors.code.message}</div>}
            <button
              type="submit"
              className="w-full bg-indigo-500 hover:bg-indigo-600 text-white p-3 rounded-lg flex items-center justify-center"
              disabled={isLoading}
            >
              {isLoading && <Loader2 className="mr-2 h-5 w-5 animate-spin" />}
              {isLoading ? 'Verifying...' : 'Verify Code'}
            </button>
          </form>
        )}

        {step === 'reset' && (
          <form onSubmit={handleSubmit(submitPassword)} className="space-y-4">
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                {...register('password')}
                placeholder="New password"
                className={`w-full p-3 border rounded-lg text-gray-800 ${passwordErrors.password ? 'border-red-500' : 'border-gray-300'}`}
              />
              <button type="button" className="absolute right-3 top-3" onClick={() => togglePassword('password')}>
                {showPassword ? '🙈' : '👁️'}
              </button>
              {passwordErrors.password && <div className="text-red-500 text-sm mt-1">{passwordErrors.password.message}</div>}
            </div>

            {/* Password Strength Bar */}
            {password && (
              <div className="space-y-1">
                <div className="w-full h-2 bg-gray-200 rounded-full">
                  <div
                    className="h-2 rounded-full transition-all"
                    style={{
                      width: `${(passwordStrength.score / 6) * 100}%`,
                      backgroundColor:
                        passwordStrength.score <= 2 ? '#f56565' :
                        passwordStrength.score <= 4 ? '#ecc94b' :
                        passwordStrength.score <= 5 ? '#48bb78' : '#3182ce'
                    }}
                  ></div>
                </div>
                <div className="text-sm text-gray-600">Strength: {passwordStrength.text}</div>
              </div>
            )}

            <div className="relative">
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                {...register('confirmPassword')}
                placeholder="Confirm password"
                className={`w-full p-3 border rounded-lg text-gray-800 ${passwordErrors.confirmPassword ? 'border-red-500' : 'border-gray-300'}`}
              />
              <button type="button" className="absolute right-3 top-3" onClick={() => togglePassword('confirmPassword')}>
                {showConfirmPassword ? '🙈' : '👁️'}
              </button>
              {passwordErrors.confirmPassword && (
                <div className="text-red-500 text-sm mt-1">{passwordErrors.confirmPassword.message}</div>
              )}
            </div>

            <button
              type="submit"
              className="w-full bg-indigo-500 hover:bg-indigo-600 text-white p-3 rounded-lg flex items-center justify-center"
              disabled={isLoading}
            >
              {isLoading && <Loader2 className="mr-2 h-5 w-5 animate-spin" />}
              {isLoading ? 'Resetting...' : 'Reset Password'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
