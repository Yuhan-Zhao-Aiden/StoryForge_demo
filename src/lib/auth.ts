import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { MongoClient, ObjectId } from 'mongodb'
import { cookies } from 'next/headers'

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-key'
const MONGODB_URI = process.env.DATABASE_URL || 'mongodb+srv://shared-user-storyforge:9ymFqwzqvSpyG4HH@cluster0.f2gdjg2.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0'

let client: MongoClient
let db: any

async function connectDB() {
  if (!client) {
    client = new MongoClient(MONGODB_URI)
    await client.connect()
    db = client.db('storyforge')
  }
  return db
}

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
    const database = await connectDB()
    const users = database.collection('users')

    // Check if user already exists by email or username
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

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12)

    // Create user
    const result = await users.insertOne({
      username,
      email,
      password: hashedPassword,
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
    const database = await connectDB()
    const users = database.collection('users')

    // Find user by email
    const user = await users.findOne({ email })

    if (!user) {
      return { ok: false, error: 'Invalid credentials' }
    }

    // Verify password
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
    const cookieStore = cookies()
    const token = cookieStore.get('auth-token')?.value

    if (!token) {
      return null
    }

    const payload = verifyToken(token)
    if (!payload) {
      return null
    }

    const database = await connectDB()
    const users = database.collection('users')
    
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
