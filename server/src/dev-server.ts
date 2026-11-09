import app from './app.js'
import { ConfigError, getConfig, type Config } from './config.js'
import { connectToDatabase, disconnectFromDatabase } from './db.js'

// Local start file only. Vercel does not use it: it imports src/app.ts.

let config: Config
try {
  config = getConfig()
} catch (error) {
  if (error instanceof ConfigError) {
    console.error(`\n${error.message}\nSee README.md, "First-time setup".\n`)
    process.exit(1)
  }
  throw error
}

const server = app.listen(config.PORT, () => {
  console.log(`Moves API listening on http://localhost:${config.PORT} (${config.NODE_ENV})`)
})

// Connect early so a wrong MONGODB_URI shows up in the terminal right away.
// The app still starts if this fails; /api/health/db will report the problem.
connectToDatabase()
  .then(() => console.log(`Connected to MongoDB, database "${config.MONGODB_DB_NAME}"`))
  .catch((error: Error) => console.error(`MongoDB: ${error.message}`))

async function shutdown(signal: string) {
  console.log(`${signal} received, shutting down`)
  server.close()
  await disconnectFromDatabase()
  process.exit(0)
}

process.on('SIGINT', () => void shutdown('SIGINT'))
process.on('SIGTERM', () => void shutdown('SIGTERM'))
