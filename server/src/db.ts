import mongoose from 'mongoose'
import { getConfig } from './config.js'

// One Mongoose connection per process (locally) or per function instance
// (on Vercel), created on first use and then reused. This keeps the number
// of connections to the Atlas M0 cluster low.
//
// The promise is kept on globalThis so that a hot reload in development, or
// several imports of this module, never open a second connection.

type Cache = { promise: Promise<typeof mongoose> | null }

const globalCache = globalThis as typeof globalThis & { __movesMongo?: Cache }
const cache: Cache = (globalCache.__movesMongo ??= { promise: null })

export class DatabaseUnavailableError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options)
    this.name = 'DatabaseUnavailableError'
  }
}

export async function connectToDatabase(): Promise<typeof mongoose> {
  if (!cache.promise) {
    const { MONGODB_URI, MONGODB_DB_NAME } = getConfig()
    cache.promise = mongoose
      .connect(MONGODB_URI, {
        dbName: MONGODB_DB_NAME,
        maxPoolSize: 5,
        serverSelectionTimeoutMS: 8000,
        // Fail fast instead of queueing queries while disconnected.
        bufferCommands: false,
      })
      .catch((error: unknown) => {
        // Allow the next request to try again instead of caching the failure.
        cache.promise = null
        throw new DatabaseUnavailableError(describeConnectionError(error), { cause: error })
      })
  }
  return cache.promise
}

export async function disconnectFromDatabase(): Promise<void> {
  if (cache.promise) {
    cache.promise = null
    await mongoose.disconnect()
  }
}

/** Turns driver errors into a short hint without leaking the connection string. */
function describeConnectionError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error)
  if (/whitelist|IP.*access|not allowed to access/i.test(message)) {
    return 'MongoDB Atlas refused the connection. Add your current IP address to the Atlas IP access list.'
  }
  if (/authentication failed|bad auth/i.test(message)) {
    return 'MongoDB rejected the username or password in MONGODB_URI.'
  }
  if (/ENOTFOUND|querySrv|ECONNREFUSED|Server selection timed out|timed out/i.test(message)) {
    return 'MongoDB could not be reached. Check MONGODB_URI, your network and the Atlas IP access list.'
  }
  return 'Could not connect to MongoDB. See the backend log for details.'
}
