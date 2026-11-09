import { Router } from 'express'
import mongoose from 'mongoose'
import { getConfig } from '../config.js'
import { connectToDatabase } from '../db.js'

// Health checks for the Milestone 2 acceptance criterion:
// "The app on localhost shows an answer from the backend, which reads and
// writes a test document in Atlas."

export const healthRouter = Router()

/** Backend only: no database involved. */
healthRouter.get('/', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'moves-api',
    environment: process.env.NODE_ENV ?? 'development',
    time: new Date().toISOString(),
  })
})

const CHECK_COLLECTION = 'connection_checks'

/**
 * Database round trip: writes one small document, reads it back, then removes
 * it. POST because it writes. Nothing personal is stored.
 */
healthRouter.post('/db', async (_req, res) => {
  const started = performance.now()
  await connectToDatabase()

  const db = mongoose.connection.db
  if (!db) throw new Error('Mongoose connected without a database handle')

  const collection = db.collection(CHECK_COLLECTION)
  const { insertedId } = await collection.insertOne({ createdAt: new Date(), source: 'health-check' })
  const found = await collection.findOne({ _id: insertedId })
  await collection.deleteOne({ _id: insertedId })

  res.json({
    status: 'ok',
    database: getConfig().MONGODB_DB_NAME,
    wroteId: insertedId.toHexString(),
    readBack: found !== null,
    roundTripMs: Math.round(performance.now() - started),
  })
})
