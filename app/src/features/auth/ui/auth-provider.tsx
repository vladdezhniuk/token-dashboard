import { useCallback, useEffect, useRef, useState } from 'react'
import type { PropsWithChildren } from 'react'
import { useAccount, useSignMessage } from 'wagmi'
import { useQueryClient } from '@tanstack/react-query'
import { getNonce, getSession, signIn as signInRequest } from '../api/auth.api'
import { AuthContext, type AuthStatus } from '../model/auth-context'

/**
 * Holds the wallet-signature session. On connect it first tries to RESTORE an
 * existing httpOnly cookie session via `GET /auth/me` (no wallet prompt) — so a
 * page reload with a live cookie does not re-trigger nonce + signature. Only when
 * there is no valid session for the connected wallet does it run the sign-in
 * (SIWE) flow: `GET /auth/nonce` -> sign -> `POST /auth/sign-in` (sets the cookie).
 * Both the restore and the sign-in are attempted once per address, so a rejected
 * signature won't loop (the "Sign in" button stays for a manual retry). The
 * session is valid only for the address it was issued for, so it falls away when
 * the wallet changes.
 */
export function AuthProvider({ children }: PropsWithChildren) {
  const { address } = useAccount()
  const { signMessageAsync } = useSignMessage()
  const queryClient = useQueryClient()
  const [authedAddress, setAuthedAddress] = useState<string>()
  const [status, setStatus] = useState<AuthStatus>('idle')
  const [error, setError] = useState<string>()

  // Reset the transient sign-in state when the wallet changes (React's "adjust
  // state during render" pattern). A freshly-connected wallet starts in 'checking'
  // so the UI shows a loader, not the sign-in prompt, until the session probe
  // below resolves. The session validity itself is derived, not stored as a flag.
  const [prevAddress, setPrevAddress] = useState(address)
  if (address !== prevAddress) {
    setPrevAddress(address)
    setStatus(address ? 'checking' : 'idle')
    setError(undefined)
  }

  const isAuthenticated = authedAddress !== undefined && authedAddress === address?.toLowerCase()

  const signIn = useCallback(async () => {
    if (!address) return
    setError(undefined)
    try {
      setStatus('signing')
      const nonce = await getNonce()
      const signature = await signMessageAsync({ message: nonce })

      setStatus('verifying')
      await signInRequest(address, signature)

      setAuthedAddress(address.toLowerCase())
      setStatus('idle')
      await queryClient.invalidateQueries({ queryKey: ['transfers'] })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Sign-in failed')
      setStatus('error')
    }
  }, [address, signMessageAsync, queryClient])

  // Once per connected address: try to restore an existing cookie session, and
  // only fall back to the signature flow when there is none for THIS wallet. The
  // ref guard keeps it to a single attempt (no loop after a rejection/error).
  const handledFor = useRef<string | undefined>(undefined)
  useEffect(() => {
    if (!address) {
      handledFor.current = undefined
      return
    }
    if (handledFor.current === address) return
    handledFor.current = address

    let cancelled = false
    void (async () => {
      setStatus('checking')
      const sessionAddress = await getSession().catch(() => null)
      if (cancelled) return
      if (sessionAddress === address.toLowerCase()) {
        setAuthedAddress(address.toLowerCase())
        setStatus('idle')
        return
      }
      // No valid session for this wallet -> prompt the signature (sets its own status).
      await signIn()
    })()

    return () => {
      cancelled = true
    }
  }, [address, signIn])

  return (
    <AuthContext.Provider value={{ isAuthenticated, status, error, signIn }}>
      {children}
    </AuthContext.Provider>
  )
}
