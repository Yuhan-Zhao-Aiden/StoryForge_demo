// src/app/api/auth/reset-password/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/database'
import { hashPassword } from '@/lib/auth'

export async function POST(req: NextRequest) {
  try {
    const { email, code, newPassword } = await req.json()
    if (!email || !code || !newPassword)
      return NextResponse.json({ ok: false, error: 'All fields are required' }, { status: 400 })

    const db = await connectDB()
    const user = await db.collection('users').findOne({ email })
    if (!user) return NextResponse.json({ ok: false, error: 'No user found' }, { status: 404 })
    if (user.resetCode !== code) return NextResponse.json({ ok: false, error: 'Invalid code' }, { status: 400 })
    if (new Date() > user.resetCodeExpires) return NextResponse.json({ ok: false, error: 'Code expired' }, { status: 400 })

    const hashedPassword = await hashPassword(newPassword)

    await db.collection('users').updateOne(
      { email },
      { $set: { password: hashedPassword }, $unset: { resetCode: '', resetCodeExpires: '' } }
    )

    return NextResponse.json({ ok: true })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ ok: false, error: message }, { status: 500 })
  }
}
