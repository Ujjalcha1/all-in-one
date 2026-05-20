import { MongoClient } from "mongodb";

const uri = process.env.MONGODB_URI;
const options = {};

if (!uri) {
  throw new Error("Please define the MONGODB_URI environment variable inside .env.local");
}

let client: MongoClient;
let clientPromise: Promise<MongoClient>;
if (process.env.NODE_ENV === "development") {
  // In development mode, use a global variable so that the value
  // is preserved across module reloads caused by HMR (Hot Module Replacement).
  const globalWithMongo = global as typeof globalThis & {
    _mongoClientPromise?: Promise<MongoClient>;
  };

  if (!globalWithMongo._mongoClientPromise) {
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
  client = new MongoClient(uri, options);
  console.log("Connecting to MongoDB using:", uri.replace(/:([^@]+)@/, ":****@"));
  clientPromise = client.connect().then((c) => {
    console.log("MongoDB connected successfully");
    return c;
  });
}

export default clientPromise;

export async function getDb() {
  const conn = await clientPromise;
  return conn.db();
}
