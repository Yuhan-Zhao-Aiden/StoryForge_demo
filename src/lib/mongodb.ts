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

function createClientPromise(): Promise<MongoClient> {
  const newClient = new MongoClient(uri, options);
  return newClient.connect();
}

export async function getDb(): Promise<Db> {
  if (!global._mongoClientPromise) {
    global._mongoClientPromise = createClientPromise();
  }
  try {
    const dbClient = await global._mongoClientPromise;
    return dbClient.db('storyforge');
  } catch (error) {
    console.error('MongoDB connection error:', error);
    global._mongoClientPromise = undefined;
    throw error;
  }
}