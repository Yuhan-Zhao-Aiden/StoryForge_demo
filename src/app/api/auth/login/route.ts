import { NextRequest, NextResponse } from 'next/server'
import { login, createToken } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, password } = body

    // Validate required fields
    if (!email || !password) {
      return NextResponse.json(
        { ok: false, error: 'Email and password are required' },
        { status: 400 }
      )
    }

    // Login user
    const result = await login(email, password)

    if (!result.ok) {
      return NextResponse.json(
        { ok: false, error: result.error },
        { status: 401 }
      )
    }

    // Create JWT token
    const token = createToken(result.user!)

    // Set HTTP-only cookie
    const response = NextResponse.json(
      { ok: true, user: result.user },
      { status: 200 }
    )

    response.cookies.set('auth-token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60, // 7 days
      path: '/',
    })

    return response
  } catch (error) {
    console.error('Login API error:', error)
    return NextResponse.json(
      { ok: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}