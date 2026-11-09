import { loadEnvFile } from 'node:process'
import { existsSync } from 'node:fs'
import { defineConfig } from 'vitest/config'

// Reuse the connection string from server/.env, but always run tests against
// a separate database so they never touch development data.
if (existsSync('.env')) loadEnvFile('.env')
process.env.NODE_ENV = 'test'
process.env.MONGODB_DB_NAME = 'moves_test'

export default defineConfig({
  test: {
    environment: 'node',
    testTimeout: 15000,
    hookTimeout: 15000,
  },
})
