import mongoose from 'mongoose'

const globalWithMongoose = globalThis

let cached = globalWithMongoose.mongoose
if (!cached) cached = globalWithMongoose.mongoose = { conn: null, promise: null }

export async function connectDB() {
  if (!process.env.MONGO_URI) {
    throw new Error('Missing environment variable: MONGO_URI')
  }

  if (cached.conn) return cached.conn

  if (!cached.promise) {
    cached.promise = mongoose.connect(process.env.MONGO_URI, {
      bufferCommands: false,
    })
  }

  cached.conn = await cached.promise
  return cached.conn
}
