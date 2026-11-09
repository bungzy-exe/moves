import express from 'express'
import { errorHandler, notFound } from './http-errors.js'
import { healthRouter } from './routes/health.js'

// The whole backend is this one Express app.
//
// Locally, src/dev-server.ts imports it and calls app.listen(3000).
// On Vercel, this file is the entrypoint: Vercel turns the default export
// into one Vercel Function, so nothing here may call listen(), start timers
// or keep state in memory between requests (sessions, caches and rate-limit
// counters belong in MongoDB).
//
// All routes live under /api. The Vite dev proxy and a Vercel rewrite both
// pass the full path through, so the prefix is part of the route.

const app = express()

app.disable('x-powered-by')
app.set('trust proxy', 1) // Behind the Vite proxy locally and Vercel's edge when deployed.
app.use(express.json({ limit: '100kb' }))

const api = express.Router()
api.use('/health', healthRouter)
// Milestone 3 adds: api.use('/auth', authRouter), api.use('/journeys', journeysRouter), ...

app.use('/api', api)
app.use(notFound)
app.use(errorHandler)

export default app
