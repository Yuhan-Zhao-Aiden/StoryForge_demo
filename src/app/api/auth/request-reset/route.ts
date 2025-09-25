// src/app/api/auth/request-reset/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/database'
import { sendEmail } from '@/lib/email'

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json()
    if (!email) return NextResponse.json({ ok: false, error: 'Email is required' }, { status: 400 })

    const db = await connectDB()
    const user = await db.collection('users').findOne({ email })
    if (!user) return NextResponse.json({ ok: false, error: 'No user found with that email' }, { status: 404 })

    const code = Math.floor(100000 + Math.random() * 900000).toString() // 6-digit code
    const expires = new Date(Date.now() + 10 * 60 * 1000) // 10 min expiry

    await db.collection('users').updateOne(
      { email },
      { $set: { resetCode: code, resetCodeExpires: expires } }
    )

    // Send reset code via email
    await sendEmail(
      email,
      'StoryForge Password Reset',
      `Your password reset code is: ${code}`,
      `<p>Your password reset code is: <strong>${code}</strong></p>`
    )

    return NextResponse.json({ ok: true })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ ok: false, error: message }, { status: 500 })
  }
}
