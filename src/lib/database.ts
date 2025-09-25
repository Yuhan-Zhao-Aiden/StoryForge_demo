import { MongoClient, Db } from 'mongodb'

let client: MongoClient
let db: Db

export async function connectDB(): Promise<Db> {
  if (!client) {
    const MONGODB_URI = process.env.DATABASE_URL
    
    if (!MONGODB_URI) {
      throw new Error('DATABASE_URL environment variable is not set')
    }
    
    client = new MongoClient(MONGODB_URI)
    await client.connect()
    db = client.db('storyforge')
  }
  return db
}

export async function closeDB(): Promise<void> {
  if (client) {
    await client.close()
    client = null as any
    db = null as any
  }
}

