'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { BookOpenText, Eye, EyeOff, Loader2 } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { registerSchema, type RegisterFormData } from '@/lib/validations'

export default function RegisterForm() {
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [passwordStrength, setPasswordStrength] = useState({ score: 0, text: 'Weak' })
  const router = useRouter()

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    setFocus
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema)
  })

  const password = watch('password', '')

  const checkPasswordStrength = (password: string) => {
    let score = 0
    let feedback = ''

    if (password.length === 0) {
      setPasswordStrength({ score: 0, text: '' })
      return
    }

    // Length check
    if (password.length >= 8) score++
    if (password.length >= 12) score++

    // Character variety checks
    if (/[a-z]/.test(password)) score++
    if (/[A-Z]/.test(password)) score++
    if (/[0-9]/.test(password)) score++
    if (/[^A-Za-z0-9]/.test(password)) score++

    // Update strength indicator
    if (score <= 2) {
      feedback = 'Weak'
    } else if (score <= 4) {
      feedback = 'Fair'
    } else if (score <= 5) {
      feedback = 'Good'
    } else {
      feedback = 'Strong'
    }

    setPasswordStrength({ score, text: feedback })
  }

  const handleRegister = async (formData: RegisterFormData) => {
    setIsLoading(true)
    setError('')
    setSuccess('')

    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      })

      const result = await response.json()
      console.log('Registration response:', result);

      if (result.ok) {
        setSuccess('Account created successfully! Please check your email to verify your account.')
        setTimeout(() => {
          router.push('/login')
        }, 3000)
      } else {
        const errorMessage = result.error || 'Registration failed';
        console.log('Setting error:', errorMessage);
        setError(errorMessage);
        
        if (result.error?.includes('username')) {
          setFocus('username')
        } else if (result.error?.includes('email')) {
          setFocus('email')
        } else {
          setFocus('password')
        }
      }
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const togglePassword = (field: 'password' | 'confirmPassword') => {
    if (field === 'password') {
      setShowPassword(!showPassword)
    } else {
      setShowConfirmPassword(!showConfirmPassword)
    }
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#09090B] px-4 py-12 text-[#E5E1E4] sm:px-6">
      <div className="auth-ambient-glow pointer-events-none absolute inset-0">
        <span className="auth-ambient-wash" aria-hidden="true" />
      </div>
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#A855F7]/60 to-transparent" />
      <div className="pointer-events-none absolute -left-24 top-24 h-72 w-72 rounded-full bg-[#A855F7]/10 blur-3xl" />
      <div className="pointer-events-none absolute -right-28 bottom-16 h-80 w-80 rounded-full bg-[#3B82F6]/10 blur-3xl" />

      <section className="relative z-10 w-full max-w-lg rounded-2xl border border-white/10 bg-white/[0.07] p-6 shadow-[0_24px_80px_rgba(0,0,0,0.45),0_0_38px_rgba(168,85,247,0.16)] backdrop-blur-2xl sm:p-8">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-[#A855F7] to-[#3B82F6] shadow-[0_0_28px_rgba(168,85,247,0.45)]">
            <BookOpenText className="h-8 w-8 text-white" aria-hidden="true" />
          </div>
          <p className="font-[family-name:var(--font-space-grotesk)] text-3xl font-bold text-white">
            StoryForge
          </p>
          <p className="mt-2 text-sm text-[#CFC2D6]">
            Collaborative storytelling reimagined
          </p>
          <p className="mt-1 text-sm text-[#988D9F]">
            Join thousands of storytellers worldwide
          </p>
        </div>

        {success && (
          <div className="mb-5 rounded-xl border border-emerald-400/25 bg-emerald-400/10 px-4 py-3 text-sm text-emerald-100">
            {success}
          </div>
        )}
        {error && (
          <div className="mb-5 rounded-xl border border-red-400/25 bg-red-500/10 px-4 py-3 text-sm text-red-100">
            {error}
          </div>
        )}

        <form className="space-y-5" onSubmit={handleSubmit(handleRegister)}>
          <div className="min-h-[92px] space-y-2">
            <Label htmlFor="username" className="text-sm font-medium text-[#E5E1E4]">
              Username <span className="text-[#FFB0CD]">*</span>
            </Label>
            <Input
              type="text"
              id="username"
              aria-invalid={!!errors.username}
              className="h-12 rounded-xl border-white/10 bg-[#131315]/70 px-4 text-white placeholder:text-white/35 focus-visible:border-[#A855F7] focus-visible:ring-0 focus-visible:shadow-[inset_0_0_0_1px_rgba(168,85,247,0.7),0_0_18px_rgba(168,85,247,0.18)]"
              placeholder="storyteller123"
              {...register('username')}
            />
            {errors.username && (
              <p className="text-xs text-red-200">
                {errors.username.message}
              </p>
            )}
          </div>

          <div className="min-h-[92px] space-y-2">
            <Label htmlFor="email" className="text-sm font-medium text-[#E5E1E4]">
              Email Address <span className="text-[#FFB0CD]">*</span>
            </Label>
            <Input
              type="email"
              id="email"
              aria-invalid={!!errors.email}
              className="h-12 rounded-xl border-white/10 bg-[#131315]/70 px-4 text-white placeholder:text-white/35 focus-visible:border-[#A855F7] focus-visible:ring-0 focus-visible:shadow-[inset_0_0_0_1px_rgba(168,85,247,0.7),0_0_18px_rgba(168,85,247,0.18)]"
              placeholder="john@example.com"
              {...register('email')}
            />
            {errors.email && (
              <p className="text-xs text-red-200">
                {errors.email.message}
              </p>
            )}
          </div>

          <div className="min-h-[92px] space-y-2">
            <Label htmlFor="password" className="text-sm font-medium text-[#E5E1E4]">
              Password <span className="text-[#FFB0CD]">*</span>
            </Label>
            <div className="relative">
              <Input
                type={showPassword ? 'text' : 'password'}
                id="password"
                aria-invalid={!!errors.password}
                className="h-12 rounded-xl border-white/10 bg-[#131315]/70 px-4 pr-12 text-white placeholder:text-white/35 focus-visible:border-[#A855F7] focus-visible:ring-0 focus-visible:shadow-[inset_0_0_0_1px_rgba(168,85,247,0.7),0_0_18px_rgba(168,85,247,0.18)]"
                placeholder="Create a strong password"
                {...register('password', {
                  onChange: (e: React.ChangeEvent<HTMLInputElement>) => checkPasswordStrength(e.target.value)
                })}
              />
              <button
                type="button"
                className="absolute right-2 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-lg text-[#CFC2D6] transition hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#A855F7]/60"
                onClick={() => togglePassword('password')}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {password && (
              <div className="space-y-2">
                <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
                  <div
                    className={`h-full rounded-full transition-all ${
                      passwordStrength.score <= 2 ? 'w-1/4 bg-red-400' :
                      passwordStrength.score <= 4 ? 'w-1/2 bg-amber-300' :
                      passwordStrength.score <= 5 ? 'w-3/4 bg-emerald-300' : 'w-full bg-emerald-400'
                    }`}
                  />
                </div>
                <p className="text-xs text-[#988D9F]">
                  Password strength: {passwordStrength.text}
                </p>
              </div>
            )}
            {errors.password && (
              <p className="text-xs text-red-200">
                {errors.password.message}
              </p>
            )}
          </div>

          <div className="min-h-[92px] space-y-2">
            <Label htmlFor="confirmPassword" className="text-sm font-medium text-[#E5E1E4]">
              Confirm Password <span className="text-[#FFB0CD]">*</span>
            </Label>
            <div className="relative">
              <Input
                type={showConfirmPassword ? 'text' : 'password'}
                id="confirmPassword"
                aria-invalid={!!errors.confirmPassword}
                className="h-12 rounded-xl border-white/10 bg-[#131315]/70 px-4 pr-12 text-white placeholder:text-white/35 focus-visible:border-[#A855F7] focus-visible:ring-0 focus-visible:shadow-[inset_0_0_0_1px_rgba(168,85,247,0.7),0_0_18px_rgba(168,85,247,0.18)]"
                placeholder="Confirm your password"
                {...register('confirmPassword')}
              />
              <button
                type="button"
                className="absolute right-2 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-lg text-[#CFC2D6] transition hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#A855F7]/60"
                onClick={() => togglePassword('confirmPassword')}
                aria-label={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
              >
                {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {errors.confirmPassword && (
              <p className="text-xs text-red-200">
                {errors.confirmPassword.message}
              </p>
            )}
          </div>

          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <input
                type="checkbox"
                id="terms"
                className="mt-1 h-4 w-4 rounded border-white/20 bg-[#131315] accent-[#A855F7] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#A855F7]/60"
                {...register('terms')}
              />
              <Label htmlFor="terms" className="block text-sm font-normal leading-6 text-[#CFC2D6]">
                I agree to StoryForge&apos;s <a href="#" target="_blank" className="font-medium text-[#DDB7FF] hover:text-white">Terms of Service</a> and <a href="#" target="_blank" className="font-medium text-[#DDB7FF] hover:text-white">Privacy Policy</a> <span className="text-[#FFB0CD]">*</span>
              </Label>
            </div>
            {errors.terms && (
              <p className="text-xs text-red-200">
                {errors.terms.message}
              </p>
            )}

            <div className="flex items-start gap-3">
              <input
                type="checkbox"
                id="newsletter"
                className="mt-1 h-4 w-4 rounded border-white/20 bg-[#131315] accent-[#A855F7] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#A855F7]/60"
                {...register('newsletter')}
              />
              <Label htmlFor="newsletter" className="block text-sm font-normal leading-6 text-[#CFC2D6]">
                I&apos;d like to receive updates about new features and storytelling tips (optional)
              </Label>
            </div>
          </div>

          <Button
            type="submit"
            className="h-12 w-full rounded-xl bg-gradient-to-r from-[#A855F7] to-[#3B82F6] font-semibold text-white shadow-[0_0_24px_rgba(168,85,247,0.35)] transition hover:from-[#B76DFF] hover:to-[#60A5FA] hover:shadow-[0_0_32px_rgba(59,130,246,0.35)]"
            disabled={isLoading}
          >
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isLoading ? 'Creating Account...' : 'Create My StoryForge Account'}
          </Button>
        </form>

        <div className="mt-8 border-t border-white/10 pt-6 text-center text-sm text-[#CFC2D6]">
          <p>
            Already have an account?{' '}
            <Link href="/login" className="font-semibold text-[#DDB7FF] transition hover:text-white">
              Sign in here
            </Link>
          </p>
        </div>
      </section>
    </main>
  )
}
