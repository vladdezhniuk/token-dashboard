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

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${env.apiUrl}${path}`, init)
  if (!res.ok) throw new HttpError(res.status)
  return (await res.json()) as T
}

/** GET `${VITE_API_URL}${path}`, parsed as JSON. Throws {@link HttpError} on failure. */
export function httpGet<T>(path: string): Promise<T> {
  return request<T>(path)
}

/** POST `body` as JSON to `${VITE_API_URL}${path}`. Throws {@link HttpError} on failure. */
export function httpPost<T>(path: string, body: unknown): Promise<T> {
  return request<T>(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}
