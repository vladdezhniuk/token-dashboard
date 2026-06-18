import { useCallback, useEffect, useRef, useState } from 'react'
import type { PropsWithChildren } from 'react'
import { useAccount, useSignMessage } from 'wagmi'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { getNonce, getSession, signIn as signInRequest } from '../api/auth.api'
import { AuthContext, type AuthStatus } from '../model/auth-context'

/**
 * Holds the wallet-signature session on top of TanStack Query.
 *
 * - `['session', wallet]` query restores an existing httpOnly cookie session via
 *   `GET /auth/me` (no wallet prompt), so a reload with a live cookie does not
 *   re-trigger nonce + signature. Keyed by wallet, so switching accounts re-probes.
 * - The sign-in mutation runs the SIWE flow `GET /auth/nonce -> sign -> POST
 *   /auth/sign-in` (sets the cookie), then primes the session cache.
 * - When the probe finds no session for the connected wallet, sign-in is triggered
 *   once (the `promptedFor` ref + the async probe gate keep it StrictMode-safe, so a
 *   wallet only ever sees one signature prompt).
 */
export function AuthProvider({ children }: PropsWithChildren) {
  const { address } = useAccount()
  const lower = address?.toLowerCase()
  const { signMessageAsync } = useSignMessage()
  const queryClient = useQueryClient()
  const [signPhase, setSignPhase] = useState<'signing' | 'verifying'>()

  // Probe for an existing cookie session. staleTime: Infinity — the cookie does not
  // change under us; we prime this cache by hand after a successful sign-in instead.
  const session = useQuery({
    queryKey: ['session', lower],
    queryFn: () => getSession(),
    enabled: Boolean(lower),
    staleTime: Infinity,
    retry: false,
  })

  const signInMutation = useMutation({
    mutationFn: async (): Promise<string> => {
      if (!address) throw new Error('No wallet connected')
      setSignPhase('signing')
      const nonce = await getNonce()
      const signature = await signMessageAsync({ message: nonce })

      setSignPhase('verifying')
      await signInRequest(address, signature)
      return address.toLowerCase()
    },
    onSuccess: (authedAddress) => {
      queryClient.setQueryData(['session', lower], authedAddress)
      void queryClient.invalidateQueries({ queryKey: ['transfers'] })
    },
    onSettled: () => setSignPhase(undefined),
  })

  const { mutateAsync: runSignIn } = signInMutation
  const signIn = useCallback(async () => {
    // Errors surface via `status`/`error`; swallow the rejection so callers can
    // safely `void signIn()`.
    await runSignIn().catch(() => undefined)
  }, [runSignIn])

  // Auto sign-in once per wallet: when the probe resolves to "no session for THIS
  // wallet", prompt the signature. The ref fires it once; because it only runs after
  // the async probe settles (past the StrictMode mount/unmount/mount), it stays
  // StrictMode-safe.
  const promptedFor = useRef<string | undefined>(undefined)
  useEffect(() => {
    if (!lower) {
      promptedFor.current = undefined
      return
    }
    if (session.isLoading || session.data === lower) return
    if (promptedFor.current === lower || signInMutation.isPending) return
    promptedFor.current = lower
    void signIn()
  }, [lower, session.isLoading, session.data, signInMutation.isPending, signIn])

  const isAuthenticated = Boolean(lower) && session.data === lower

  // Order matters: an authenticated session wins over a stale error left from a
  // previous wallet, and an in-flight re-probe (isLoading) shows the loader rather
  // than that stale error.
  const status: AuthStatus = isAuthenticated
    ? 'idle'
    : signInMutation.isPending
      ? (signPhase ?? 'signing')
      : session.isLoading
        ? 'checking'
        : signInMutation.isError
          ? 'error'
          : 'idle'

  const error = signInMutation.error instanceof Error ? signInMutation.error.message : undefined

  return (
    <AuthContext.Provider value={{ isAuthenticated, status, error, signIn }}>{children}</AuthContext.Provider>
  )
}
