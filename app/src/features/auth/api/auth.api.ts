import { HttpError, httpGet, httpGetText, httpPost } from '@/shared/api'

/** GET /auth/nonce — the message the wallet must sign (returned as plain text). */
export function getNonce(): Promise<string> {
  return httpGetText('/auth/nonce')
}

/**
 * POST /auth/sign-in — the backend verifies the signature and sets an httpOnly
 * `access_token` cookie. The address is lower-cased to match how the backend
 * stores/looks up the user.
 */
export function signIn(address: string, signature: string): Promise<void> {
  return httpPost<void>('/auth/sign-in', { address: address.toLowerCase(), signature })
}


export async function getSession(): Promise<string | null> {
  try {
    const { address } = await httpGet<{ address?: string }>('/auth/me')
    return address ? address.toLowerCase() : null
  } catch (e) {
    if (e instanceof HttpError && e.status === 401) return null
    throw e
  }
}
