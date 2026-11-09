import request from 'supertest'
import { afterAll, describe, expect, it } from 'vitest'
import app from '../src/app.js'
import { disconnectFromDatabase } from '../src/db.js'

// The database test needs a real MongoDB. It uses MONGODB_URI from
// server/.env (loaded in vitest.config.ts), with the database name forced to
// "moves_test" so it never touches development data. Without a URI it is
// skipped, and the other tests still run.
const hasDatabase = Boolean(process.env.MONGODB_URI)

afterAll(async () => {
  await disconnectFromDatabase()
})

describe('GET /api/health', () => {
  it('answers with JSON without needing the database', async () => {
    const res = await request(app).get('/api/health')
    expect(res.status).toBe(200)
    expect(res.body).toMatchObject({ status: 'ok', service: 'moves-api' })
  })
})

describe('error handling', () => {
  it('answers unknown routes with a JSON 404', async () => {
    const res = await request(app).get('/api/does-not-exist')
    expect(res.status).toBe(404)
    expect(res.body.error.code).toBe('not_found')
  })

  it('answers malformed JSON with a JSON 400', async () => {
    const res = await request(app).post('/api/health/db').set('Content-Type', 'application/json').send('{"broken"')
    expect(res.status).toBe(400)
    expect(res.body.error.code).toBe('invalid_json')
  })
})

describe.skipIf(!hasDatabase)('POST /api/health/db', () => {
  it('writes, reads back and removes a test document', async () => {
    const res = await request(app).post('/api/health/db')
    expect(res.status).toBe(200)
    expect(res.body).toMatchObject({ status: 'ok', database: 'moves_test', readBack: true })
    expect(res.body.wroteId).toMatch(/^[a-f0-9]{24}$/)
  })
})
