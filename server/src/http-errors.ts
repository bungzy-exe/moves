import type { ErrorRequestHandler, RequestHandler } from 'express'
import { ConfigError } from './config.js'
import { DatabaseUnavailableError } from './db.js'

// Every error is answered with JSON in one shape:
//   { "error": { "code": "...", "message": "..." } }
// Vercel's Express notes warn that unhandled errors can leave the function in
// an undefined state, so nothing is allowed to fall through to Express's
// default HTML error page.

export class HttpError extends Error {
  readonly status: number
  readonly code: string

  constructor(status: number, code: string, message: string) {
    super(message)
    this.name = 'HttpError'
    this.status = status
    this.code = code
  }
}

const MONGO_CONNECTIVITY_ERRORS = new Set([
  'MongoServerSelectionError',
  'MongoNetworkError',
  'MongoNetworkTimeoutError',
  'MongoNotConnectedError',
  'MongoTopologyClosedError',
])

function isMongoConnectivityError(err: unknown): err is Error {
  return err instanceof Error && MONGO_CONNECTIVITY_ERRORS.has(err.name)
}

export const notFound: RequestHandler = (req, res) => {
  res.status(404).json({ error: { code: 'not_found', message: `No route for ${req.method} ${req.path}` } })
}

export const errorHandler: ErrorRequestHandler = (err, _req, res, next) => {
  if (res.headersSent) {
    next(err)
    return
  }

  if (err instanceof HttpError) {
    res.status(err.status).json({ error: { code: err.code, message: err.message } })
    return
  }

  if (err instanceof DatabaseUnavailableError) {
    console.error('[db]', err.message, err.cause)
    res.status(503).json({ error: { code: 'database_unavailable', message: err.message } })
    return
  }

  // The connection was fine earlier but the database went away mid-session.
  if (isMongoConnectivityError(err)) {
    console.error('[db]', err)
    res.status(503).json({
      error: { code: 'database_unavailable', message: 'MongoDB is not reachable right now. Try again in a moment.' },
    })
    return
  }

  if (err instanceof ConfigError) {
    console.error('[config]', err.message)
    res.status(500).json({ error: { code: 'server_misconfigured', message: err.message } })
    return
  }

  // Malformed JSON bodies from express.json().
  if (err && typeof err === 'object' && 'type' in err && err.type === 'entity.parse.failed') {
    res.status(400).json({ error: { code: 'invalid_json', message: 'The request body is not valid JSON.' } })
    return
  }

  console.error('[unhandled]', err)
  res.status(500).json({ error: { code: 'internal_error', message: 'Something went wrong on the server.' } })
}
