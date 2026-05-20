import mongoose from "mongoose";

const uri = process.env.MONGODB_URI;

// Caching connection globally for development HMR
let cached = (global as any).mongoose;

if (!cached) {
  cached = (global as any).mongoose = { conn: null, promise: null };
}

export async function connectToDatabase() {
  if (cached.conn) {
    return cached.conn;
  }

  if (!uri) {
    throw new Error("Please define the MONGODB_URI environment variable on Vercel");
  }

  if (!cached.promise) {
    const opts = {
      bufferCommands: false,
    };

    console.log("Connecting to MongoDB via Mongoose using:", uri.replace(/:([^@]+)@/, ":****@"));
    cached.promise = mongoose.connect(uri, opts).then((m) => {
      console.log("MongoDB connected successfully via Mongoose");
      return m;
    });
  }

  try {
    cached.conn = await cached.promise;
  } catch (e) {
    cached.promise = null;
    throw e;
  }

  return cached.conn;
}
