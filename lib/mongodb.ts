/**
 * MongoDB connection singleton (serverless / hot-reload safe).
 *
 * Next.js dev reloads and serverless invocations would otherwise open a new
 * connection on every request. We cache the connection on `globalThis` so it's
 * reused. We do NOT throw at import time if MONGODB_URI is missing — only when a
 * connection is actually attempted — so `next build` / typecheck still works.
 */

import mongoose from "mongoose";

interface MongooseCache {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
}

declare global {
  // eslint-disable-next-line no-var
  var _mongooseCache: MongooseCache | undefined;
}

const cached: MongooseCache =
  global._mongooseCache ?? (global._mongooseCache = { conn: null, promise: null });

export async function connectToDatabase(): Promise<typeof mongoose> {
  if (cached.conn) return cached.conn;

  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error("MONGODB_URI is not set. Add it to .env.local (see .env.local.example).");
  }

  if (!cached.promise) {
    cached.promise = mongoose.connect(uri, {
      bufferCommands: false,
      maxPoolSize: 10,
      dbName: process.env.MONGODB_DB || "billeasy",
    });
  }

  try {
    cached.conn = await cached.promise;
  } catch (err) {
    cached.promise = null; // allow retry on next call
    throw err;
  }

  return cached.conn;
}
