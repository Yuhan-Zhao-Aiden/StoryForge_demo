'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Loader2 } from 'lucide-react'

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

      if (result.ok) {
        setSuccess('Account created successfully! Please check your email to verify your account.')
        // Reset form
        setTimeout(() => {
          router.push('/login')
        }, 3000)
      } else {
        setError(result.error || 'Registration failed')
        // Focus first invalid field
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
    <div className="auth-container">
      {/* Animated background */}
      <div className="bg-animation">
        <div className="floating-node"></div>
        <div className="floating-node square"></div>
        <div className="floating-node triangle"></div>
        <div className="floating-node"></div>
        <div className="floating-node square"></div>
        <div className="floating-node"></div>
        <div className="connection-line line-1"></div>
        <div className="connection-line line-2"></div>
        <div className="connection-line line-3"></div>
      </div>

      {/* Main signup container */}
      <div className="auth-card">
        {/* Logo and branding */}
        <div className="logo-section">
          <div className="logo">
            <div className="logo-icon">📖</div>
          </div>
          <h1 className="brand-name">StoryForge</h1>
          <p className="brand-tagline">Collaborative storytelling reimagined</p>
          <p className="auth-subtitle">Join thousands of storytellers worldwide</p>
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

        {/* Signup form */}
        <form className="auth-form" onSubmit={handleSubmit(handleRegister)}>
          <div className="form-group">
            <label className="form-label" htmlFor="username">
              Username <span className="required">*</span>
            </label>
            <input
              type="text"
              id="username"
              className={`form-input ${errors.username ? 'error' : ''}`}
              placeholder="storyteller123"
              {...register('username')}
            />
            {errors.username && (
              <div className="error-message" style={{ display: 'block' }}>
                {errors.username.message}
              </div>
            )}
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="email">
              Email Address <span className="required">*</span>
            </label>
            <input
              type="email"
              id="email"
              className={`form-input ${errors.email ? 'error' : ''}`}
              placeholder="john@example.com"
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
              Password <span className="required">*</span>
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type={showPassword ? 'text' : 'password'}
                id="password"
                className={`form-input ${errors.password ? 'error' : ''}`}
                placeholder="Create a strong password"
                {...register('password', {
                  onChange: (e: React.ChangeEvent<HTMLInputElement>) => checkPasswordStrength(e.target.value)
                })}
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => togglePassword('password')}
              >
                {showPassword ? '🙈' : '👁️'}
              </button>
            </div>
            {password && (
              <div className="password-strength" style={{ display: 'block' }}>
                <div className="strength-bar">
                  <div className={`strength-fill ${
                    passwordStrength.score <= 2 ? 'strength-weak' :
                    passwordStrength.score <= 4 ? 'strength-fair' :
                    passwordStrength.score <= 5 ? 'strength-good' : 'strength-strong'
                  }`}></div>
                </div>
                <div className="strength-text">
                  Password strength: {passwordStrength.text}
                </div>
              </div>
            )}
            {errors.password && (
              <div className="error-message" style={{ display: 'block' }}>
                {errors.password.message}
              </div>
            )}
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="confirmPassword">
              Confirm Password <span className="required">*</span>
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                id="confirmPassword"
                className={`form-input ${errors.confirmPassword ? 'error' : ''}`}
                placeholder="Confirm your password"
                {...register('confirmPassword')}
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => togglePassword('confirmPassword')}
              >
                {showConfirmPassword ? '🙈' : '👁️'}
              </button>
            </div>
            {errors.confirmPassword && (
              <div className="error-message" style={{ display: 'block' }}>
                {errors.confirmPassword.message}
              </div>
            )}
          </div>

          {/* Terms and conditions */}
          <div className="terms-section">
            <div className="checkbox-group">
              <input
                type="checkbox"
                id="terms"
                className="checkbox"
                {...register('terms')}
              />
              <label htmlFor="terms" className="checkbox-label">
                I agree to StoryForge&apos;s <a href="#" target="_blank">Terms of Service</a> and <a href="#" target="_blank">Privacy Policy</a> <span className="required">*</span>
              </label>
            </div>
            {errors.terms && (
              <div className="error-message" style={{ display: 'block' }}>
                {errors.terms.message}
              </div>
            )}

            <div className="checkbox-group">
              <input
                type="checkbox"
                id="newsletter"
                className="checkbox"
                {...register('newsletter')}
              />
              <label htmlFor="newsletter" className="checkbox-label">
                I&apos;d like to receive updates about new features and storytelling tips (optional)
              </label>
            </div>
          </div>

          <button
            type="submit"
            className="auth-btn"
            disabled={isLoading}
          >
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isLoading ? 'Creating Account...' : 'Create My StoryForge Account'}
          </button>
        </form>

        {/* Login section */}
        <div className="link-section">
          <p>Already have an account? <Link href="/login" className="link-section a">Sign in here</Link></p>
        </div>
      </div>
    </div>
  )
}
