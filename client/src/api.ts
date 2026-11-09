// Small helper for calling the Moves backend.
// All requests use relative /api paths: locally the Vite dev server forwards
// them to Express, and in a deployment they go to the same domain.

export class ApiError extends Error {
  readonly status: number

  constructor(status: number, message: string) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

export async function apiRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  let response: Response
  try {
    response = await fetch(`/api${path}`, {
      credentials: 'same-origin',
      ...init,
      headers: {
        Accept: 'application/json',
        ...(init.body ? { 'Content-Type': 'application/json' } : {}),
        ...init.headers,
      },
    })
  } catch {
    throw new ApiError(0, 'The backend could not be reached. Is it running on port 3000?')
  }

  const text = await response.text()
  let body: unknown = null
  if (text) {
    try {
      body = JSON.parse(text)
    } catch {
      // The Vite proxy answers with plain text when the backend is down.
      throw new ApiError(response.status, 'The backend did not answer with JSON. Is it running on port 3000?')
    }
  }

  if (!response.ok) {
    // 502/504 with no JSON body: the Vite proxy could not reach Express.
    if ((response.status === 502 || response.status === 504) && body === null) {
      throw new ApiError(response.status, 'The backend could not be reached. Is it running on port 3000?')
    }
    const message =
      body && typeof body === 'object' && 'error' in body && typeof body.error === 'object' && body.error && 'message' in body.error
        ? String(body.error.message)
        : `Request failed with status ${response.status}`
    throw new ApiError(response.status, message)
  }

  return body as T
}

export interface HealthResponse {
  status: 'ok'
  service: string
  environment: string
  time: string
}

export interface DbCheckResponse {
  status: 'ok'
  database: string
  wroteId: string
  readBack: boolean
  roundTripMs: number
}
