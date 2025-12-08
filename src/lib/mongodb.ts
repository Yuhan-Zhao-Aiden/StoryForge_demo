import { MongoClient, Db, MongoClientOptions } from "mongodb";

declare global {
  var _mongoClientPromise: Promise<MongoClient> | undefined;
}

const uri = process.env.DATABASE_URL!;

if (!uri) {
  throw new Error("DATABASE_URL is not defined in .env");
}

// Serverless-optimized MongoDB connection options
const options: MongoClientOptions = {
  maxPoolSize: 10, // Limit connection pool for serverless
  minPoolSize: 2,  // Keep some connections warm
  maxIdleTimeMS: 60000, // Close idle connections after 60s
  serverSelectionTimeoutMS: 10000, // Fail fast (10s instead of 30s)
  socketTimeoutMS: 45000, // Socket timeout
  connectTimeoutMS: 10000, // Connection timeout
  retryWrites: true,
  retryReads: true,
};

let client: MongoClient;
let clientPromise: Promise<MongoClient>;

if (process.env.NODE_ENV === 'development') {
  // In development, reuse connection across hot reloads
  if (!global._mongoClientPromise) {
    client = new MongoClient(uri, options);
    global._mongoClientPromise = client.connect();
  }
  clientPromise = global._mongoClientPromise;
} else {
  // In production, reuse the same client instance across invocations
  if (!global._mongoClientPromise) {
    client = new MongoClient(uri, options);
    global._mongoClientPromise = client.connect();
  }
  clientPromise = global._mongoClientPromise;
}

export async function getDb(): Promise<Db> {
  try {
    const dbClient = await clientPromise;
    return dbClient.db('storyforge');
  } catch (error) {
    console.error('MongoDB connection error:', error);
    // Reset the connection promise so next request can retry
    global._mongoClientPromise = undefined;
    throw error;
  }
}