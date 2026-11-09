import { z } from 'zod'

// Every setting comes from environment variables, so the same code runs
// locally (values from server/.env) and on Vercel (values from the project
// settings). .env.example lists the names; real values never go into git.

const ConfigSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3000),
  MONGODB_URI: z
    .string({ error: 'MONGODB_URI is missing. Copy server/.env.example to server/.env and add your Atlas connection string.' })
    .min(1, 'MONGODB_URI is empty. Add your Atlas connection string to server/.env.')
    .refine((value) => value.startsWith('mongodb://') || value.startsWith('mongodb+srv://'), {
      message: 'MONGODB_URI must start with mongodb:// or mongodb+srv://',
    }),
  MONGODB_DB_NAME: z.string().min(1).default('moves_dev'),
})

export type Config = z.infer<typeof ConfigSchema>

export class ConfigError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ConfigError'
  }
}

let cached: Config | undefined

/** Reads and validates the environment once, on first use. */
export function getConfig(): Config {
  if (cached) return cached
  const result = ConfigSchema.safeParse(process.env)
  if (!result.success) {
    const details = result.error.issues.map((issue) => issue.message).join('; ')
    throw new ConfigError(`Invalid server configuration: ${details}`)
  }
  cached = result.data
  return cached
}

/** Only for tests: forget the cached config after changing process.env. */
export function resetConfigForTests(): void {
  cached = undefined
}
