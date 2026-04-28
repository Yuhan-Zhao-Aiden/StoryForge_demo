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
import { loginSchema, type LoginFormData } from '@/lib/validations'

export default function LoginForm() {
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const router = useRouter()

  const {
    register,
    handleSubmit,
    formState: { errors },
    setFocus
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema)
  })

  const handleLogin = async (formData: LoginFormData) => {
    setIsLoading(true)
    setError('')
    setSuccess('')

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      })

      const result = await response.json()

      if (result.ok) {
        setSuccess('Welcome back! Redirecting to your home...')
        setTimeout(() => {
          router.push('/dashboard')
        }, 2000)
      } else {
        setError(result.error || 'Invalid credentials. Please try again.')
        // Focus first invalid field
        if (result.error?.includes('email')) {
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

  const togglePassword = () => {
    setShowPassword(!showPassword)
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#09090B] px-4 py-12 text-[#E5E1E4] sm:px-6">
      <div className="auth-ambient-glow pointer-events-none absolute inset-0">
        <span className="auth-ambient-wash" aria-hidden="true" />
      </div>
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#A855F7]/60 to-transparent" />
      <div className="pointer-events-none absolute -left-24 top-24 h-72 w-72 rounded-full bg-[#A855F7]/10 blur-3xl" />
      <div className="pointer-events-none absolute -right-28 bottom-16 h-80 w-80 rounded-full bg-[#3B82F6]/10 blur-3xl" />

      <section className="relative z-10 w-full max-w-md rounded-2xl border border-white/10 bg-white/[0.07] p-6 shadow-[0_24px_80px_rgba(0,0,0,0.45),0_0_38px_rgba(168,85,247,0.16)] backdrop-blur-2xl sm:p-8">
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

        <form className="space-y-5" onSubmit={handleSubmit(handleLogin)}>
          <div className="min-h-[92px] space-y-2">
            <Label htmlFor="email" className="text-sm font-medium text-[#E5E1E4]">
              Email Address
            </Label>
            <Input
              type="email"
              id="email"
              aria-invalid={!!errors.email}
              className="h-12 rounded-xl border-white/10 bg-[#131315]/70 px-4 text-white placeholder:text-white/35 focus-visible:border-[#A855F7] focus-visible:ring-0 focus-visible:shadow-[inset_0_0_0_1px_rgba(168,85,247,0.7),0_0_18px_rgba(168,85,247,0.18)]"
              placeholder="Enter your email"
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
              Password
            </Label>
            <div className="relative">
              <Input
                type={showPassword ? 'text' : 'password'}
                id="password"
                aria-invalid={!!errors.password}
                className="h-12 rounded-xl border-white/10 bg-[#131315]/70 px-4 pr-12 text-white placeholder:text-white/35 focus-visible:border-[#A855F7] focus-visible:ring-0 focus-visible:shadow-[inset_0_0_0_1px_rgba(168,85,247,0.7),0_0_18px_rgba(168,85,247,0.18)]"
                placeholder="Enter your password"
                {...register('password')}
              />
              <button
                type="button"
                className="absolute right-2 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-lg text-[#CFC2D6] transition hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#A855F7]/60"
                onClick={togglePassword}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {errors.password && (
              <p className="text-xs text-red-200">
                {errors.password.message}
              </p>
            )}
          </div>

          <div className="flex flex-col gap-3 text-sm sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2 text-[#CFC2D6]">
              <input
                type="checkbox"
                id="remember"
                className="h-4 w-4 rounded border-white/20 bg-[#131315] accent-[#A855F7] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#A855F7]/60"
              />
              <Label htmlFor="remember" className="text-sm font-normal text-[#CFC2D6]">
                Remember me
              </Label>
            </div>
            <Link href="/forgot-password" className="font-medium text-[#ADB6FF] transition hover:text-white">
              Forgot password?
            </Link>
          </div>

          <Button
            type="submit"
            className="h-12 w-full rounded-xl bg-gradient-to-r from-[#A855F7] to-[#3B82F6] font-semibold text-white shadow-[0_0_24px_rgba(168,85,247,0.35)] transition hover:from-[#B76DFF] hover:to-[#60A5FA] hover:shadow-[0_0_32px_rgba(59,130,246,0.35)]"
            disabled={isLoading}
          >
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isLoading ? 'Signing in...' : 'Sign In to StoryForge'}
          </Button>
        </form>

        <div className="mt-8 border-t border-white/10 pt-6 text-center text-sm text-[#CFC2D6]">
          <p>
            New to StoryForge?{' '}
            <Link href="/create-account" className="font-semibold text-[#DDB7FF] transition hover:text-white">
              Create an account
            </Link>
          </p>
        </div>
      </section>
    </main>
  )
}
