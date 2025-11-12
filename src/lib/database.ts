import { MongoClient, Db } from 'mongodb'

let mongoClient: MongoClient
let database: Db

export async function connectDB(): Promise<Db> {
  if (!mongoClient || !database) {
    const connectionString = process.env.DATABASE_URL
    
    if (!connectionString) {
      throw new Error('DATABASE_URL environment variable is not set')
    }
    
    mongoClient = new MongoClient(connectionString)
    await mongoClient.connect()
    database = mongoClient.db('storyforge')
  }
  return database
}

export async function closeDB(): Promise<void> {
  if (mongoClient) {
    await mongoClient.close()
    mongoClient = null as unknown as MongoClient
    database = null as unknown as Db
  }
}