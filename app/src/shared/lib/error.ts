/** True when the user deliberately rejected a wallet request (not a real failure). */
function isUserRejection(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false
  const e = error as { name?: string; code?: number; message?: string; cause?: unknown }
  if (e.name === 'UserRejectedRequestError' || e.code === 4001) return true
  if (typeof e.message === 'string' && /user rejected|user denied|rejected the request/i.test(e.message)) return true
  return e.cause ? isUserRejection(e.cause) : false
}

/**
 * Short, user-facing message for an error — or `null` when it should be swallowed
 * (the user intentionally rejected a wallet prompt). viem errors expose a concise
 * `shortMessage`; anything noisy collapses to a generic line.
 */
export function friendlyError(error: unknown): string | null {
  if (isUserRejection(error)) return null
  if (error instanceof Error) {
    const message = (error as { shortMessage?: string }).shortMessage ?? error.message
    return message.length > 100 ? 'Something went wrong' : message
  }
  return 'Something went wrong'
}
