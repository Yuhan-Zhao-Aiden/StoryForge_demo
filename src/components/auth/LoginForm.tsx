'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Loader2 } from 'lucide-react'

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

  const onSubmit = async (data: LoginFormData) => {
    setIsLoading(true)
    setError('')
    setSuccess('')

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      })

      const result = await response.json()

      if (result.ok) {
        setSuccess('Welcome back! Redirecting to your home...')
        setTimeout(() => {
          router.push('/')
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
    } catch (err) {
      setError('Network error. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const togglePassword = () => {
    setShowPassword(!showPassword)
  }

  return (
    <div className="auth-container">
      {/* Animated background */}
      <div className="bg-animation">
        <div className="floating-node"></div>
        <div className="floating-node"></div>
        <div className="floating-node"></div>
        <div className="floating-node"></div>
        <div className="connection-line line-1"></div>
        <div className="connection-line line-2"></div>
      </div>

      {/* Main login container */}
      <div className="auth-card">
        {/* Logo and branding */}
        <div className="logo-section">
          <div className="logo">
            <div className="logo-icon">📖</div>
          </div>
          <h1 className="brand-name">StoryForge</h1>
          <p className="brand-tagline">Collaborative storytelling reimagined</p>
        </div>

        {/* Success/Error messages */}
        {success && (
          <div className="message success">
            {success}
          </div>
        )}
        {error && (
          <div className="message error">
            {error}
          </div>
        )}

        {/* Login form */}
        <form className="auth-form" onSubmit={handleSubmit(onSubmit)}>
          <div className="form-group">
            <label className="form-label" htmlFor="email">
              Email Address
            </label>
            <input
              type="email"
              id="email"
              className={`form-input ${errors.email ? 'error' : ''}`}
              placeholder="Enter your email"
              {...register('email')}
            />
            {errors.email && (
              <div className="error-message" style={{ display: 'block' }}>
                {errors.email.message}
              </div>
            )}
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="password">
              Password
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type={showPassword ? 'text' : 'password'}
                id="password"
                className={`form-input ${errors.password ? 'error' : ''}`}
                placeholder="Enter your password"
                {...register('password')}
              />
              <button
                type="button"
                className="password-toggle"
                onClick={togglePassword}
              >
                {showPassword ? '🙈' : '👁️'}
              </button>
            </div>
            {errors.password && (
              <div className="error-message" style={{ display: 'block' }}>
                {errors.password.message}
              </div>
            )}
          </div>

          <div className="form-options">
            <div className="remember-me">
              <input type="checkbox" id="remember" className="checkbox" />
              <label htmlFor="remember">Remember me</label>
            </div>
            <Link href="/forgot-password" className="forgot-password">
              Forgot password?
            </Link>
          </div>

          <button
            type="submit"
            className="auth-btn"
            disabled={isLoading}
          >
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isLoading ? 'Signing in...' : 'Sign In to StoryForge'}
          </button>
        </form>

        {/* Sign up section */}
        <div className="link-section">
          <p>New to StoryForge? <Link href="/create-account" className="link-section a">Create an account</Link></p>
        </div>
      </div>
    </div>
  )
}
