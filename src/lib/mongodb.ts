import { MongoClient } from "mongodb";

const uri = process.env.MONGODB_URI;
const options = {};


let client: MongoClient;
let clientPromise: Promise<MongoClient>;

if (process.env.NODE_ENV === "development") {
  // In development mode, use a global variable so that the value
  // is preserved across module reloads caused by HMR (Hot Module Replacement).
  const globalWithMongo = global as typeof globalThis & {
    _mongoClientPromise?: Promise<MongoClient>;
  };

  if (!globalWithMongo._mongoClientPromise) {
    if (!uri) {
      throw new Error("Please define the MONGODB_URI environment variable inside .env.local");
    }
    client = new MongoClient(uri, options);
    console.log("Connecting to MongoDB (Dev) using:", uri.replace(/:([^@]+)@/, ":****@"));
    globalWithMongo._mongoClientPromise = client.connect().then((c) => {
      console.log("MongoDB connected successfully");
      return c;
    });
  }
  clientPromise = globalWithMongo._mongoClientPromise;
} else {
  // In production mode, it's best to not use a global variable.
  if (uri) {
    client = new MongoClient(uri, options);
    console.log("Connecting to MongoDB using:", uri.replace(/:([^@]+)@/, ":****@"));
    clientPromise = client.connect().then((c) => {
      console.log("MongoDB connected successfully");
      return c;
    });
  } else {
    // Provide a rejected promise fallback so Next.js build compilation doesn't crash top-level imports
    clientPromise = Promise.reject(
      new Error("Please define the MONGODB_URI environment variable on Vercel")
    );
  }
}

export default clientPromise;

export async function getDb() {
  if (!uri) {
    throw new Error("Please define the MONGODB_URI environment variable on Vercel");
  }
  const conn = await clientPromise;
  return conn.db();
}
