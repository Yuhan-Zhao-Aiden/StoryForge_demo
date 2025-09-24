import { NextRequest, NextResponse } from 'next/server'
import { register, createToken } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    console.log('Registration API called')
    const body = await request.json()
    console.log('Request body:', body)
    const { username, email, password, newsletter } = body

    // Validate required fields
    if (!username || !email || !password) {
      console.log('Missing required fields:', { username, email, password })
      return NextResponse.json(
        { ok: false, error: 'Username, email, and password are required' },
        { status: 400 }
      )
    }

    // Register user
    const result = await register(username, email, password, newsletter || false)

    if (!result.ok) {
      return NextResponse.json(
        { ok: false, error: result.error },
        { status: result.error === 'Email already in use' || result.error === 'Username already taken' ? 409 : 400 }
      )
    }

    // Create JWT token
    const token = createToken(result.user!)

    // Set HTTP-only cookie
    const response = NextResponse.json(
      { ok: true, user: result.user },
      { status: 201 }
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
    console.error('Registration API error:', error)
    return NextResponse.json(
      { ok: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
