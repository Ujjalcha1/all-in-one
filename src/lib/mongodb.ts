import { MongoClient } from "mongodb";

const uri = process.env.MONGODB_URI;
const options = {};

let clientPromise: Promise<MongoClient> | null = null;

export function getMongoClientPromise(): Promise<MongoClient> {
  if (clientPromise) {
    return clientPromise;
  }

  if (!uri) {
    throw new Error("Please define the MONGODB_URI environment variable on Vercel");
  }

  const client = new MongoClient(uri, options);

  if (process.env.NODE_ENV === "development") {
    // In development mode, use a global variable so that the value
    // is preserved across module reloads caused by HMR (Hot Module Replacement).
    const globalWithMongo = global as typeof globalThis & {
      _mongoClientPromise?: Promise<MongoClient>;
    };

    if (!globalWithMongo._mongoClientPromise) {
      console.log("Connecting to MongoDB (Dev) using:", uri.replace(/:([^@]+)@/, ":****@"));
      globalWithMongo._mongoClientPromise = client.connect().then((c) => {
        console.log("MongoDB connected successfully");
        return c;
      });
    }
    clientPromise = globalWithMongo._mongoClientPromise;
  } else {
    // In production mode, it's best to not use a global variable.
    console.log("Connecting to MongoDB using:", uri.replace(/:([^@]+)@/, ":****@"));
    clientPromise = client.connect().then((c) => {
      console.log("MongoDB connected successfully");
      return c;
    });
  }

  return clientPromise;
}

// Export a dummy promise as default to satisfy standard imports without triggering top-level rejections
const dummyPromise = Promise.resolve(null as any);
export default dummyPromise;

export async function getDb() {
  const conn = await getMongoClientPromise();
  return conn.db();
}
