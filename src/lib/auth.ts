import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { ObjectId } from 'mongodb'
import { cookies } from 'next/headers'
import { connectDB } from './database'

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-key'

export interface User {
  id: string
  username: string
  email: string
}

export interface AuthResult {
  ok: boolean
  user?: User
  error?: string
}

export async function register(username: string, email: string, password: string, newsletter: boolean = false): Promise<AuthResult> {
  try {
    const db = await connectDB()
    const users = db.collection('users')

    // Check if user already exists
    const existingUser = await users.findOne({
      $or: [
        { email },
        { username }
      ]
    })

    if (existingUser) {
      if (existingUser.email === email) {
        return { ok: false, error: 'Email already in use' }
      }
      if (existingUser.username === username) {
        return { ok: false, error: 'Username already taken' }
      }
    }

    // Hash the password
    const passwordHash = await bcrypt.hash(password, 12)

    // Create new user
    const result = await users.insertOne({
      username,
      email,
      password: passwordHash,
      newsletter,
      emailVerified: false,
      createdAt: new Date(),
      updatedAt: new Date()
    })

    return {
      ok: true,
      user: {
        id: result.insertedId.toString(),
        username,
        email
      }
    }
  } catch (error) {
    console.error('Registration error:', error)
    return { ok: false, error: 'Registration failed' }
  }
}

export async function login(email: string, password: string): Promise<AuthResult> {
  try {
    const db = await connectDB()
    const users = db.collection('users')

    // Find user by email
    const user = await users.findOne({ email })

    if (!user) {
      return { ok: false, error: 'Invalid credentials' }
    }

    // Check password
    const isValidPassword = await bcrypt.compare(password, user.password)

    if (!isValidPassword) {
      return { ok: false, error: 'Invalid credentials' }
    }

    return {
      ok: true,
      user: {
        id: user._id.toString(),
        username: user.username,
        email: user.email
      }
    }
  } catch (error) {
    console.error('Login error:', error)
    return { ok: false, error: 'Login failed' }
  }
}

export function createToken(user: User): string {
  return jwt.sign(
    { userId: user.id, email: user.email },
    JWT_SECRET,
    { expiresIn: '7d' }
  )
}

export function verifyToken(token: string): { userId: string; email: string } | null {
  try {
    return jwt.verify(token, JWT_SECRET) as { userId: string; email: string }
  } catch {
    return null
  }
}

export async function getCurrentUser(): Promise<User | null> {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get('auth-token')?.value

    if (!token) {
      return null
    }

    const payload = verifyToken(token)
    if (!payload) {
      return null
    }

    const db = await connectDB()
    const users = db.collection('users')

    const user = await users.findOne(
      { _id: new ObjectId(payload.userId) },
      { projection: { _id: 1, username: 1, email: 1 } }
    )

    if (!user) {
      return null
    }

    return {
      id: user._id.toString(),
      username: user.username,
      email: user.email
    }
  } catch (error) {
    console.error('Get current user error:', error)
    return null
  }
}