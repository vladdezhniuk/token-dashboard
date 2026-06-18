import { env } from '@/shared/config'

/** Thrown when the backend responds with a non-2xx status. */
export class HttpError extends Error {
  readonly status: number

  constructor(status: number) {
    super(`Request failed (${status})`)
    this.name = 'HttpError'
    this.status = status
  }
}

/**
 * Base request: hits `${VITE_API_URL}${path}` and always sends credentials so the
 * httpOnly session cookie flows both ways. Returns the raw response text.
 */
async function request(path: string, init?: RequestInit): Promise<string> {
  const res = await fetch(`${env.apiUrl}${path}`, { credentials: 'include', ...init })
  if (!res.ok) throw new HttpError(res.status)
  return res.text()
}

/** GET, parsed as JSON. Throws {@link HttpError} on failure. */
export async function httpGet<T>(path: string): Promise<T> {
  return JSON.parse(await request(path)) as T
}

/** GET raw text (e.g. the auth nonce, which is sent as plain text, not JSON). */
export function httpGetText(path: string): Promise<string> {
  return request(path)
}

/** POST `body` as JSON. Returns parsed JSON, or `undefined` for an empty response. */
export async function httpPost<T>(path: string, body?: unknown): Promise<T> {
  const text = await request(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
  return (text ? JSON.parse(text) : undefined) as T
}
