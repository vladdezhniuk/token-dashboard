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
 * The session is valid only for the address it was issued for, so it falls away
 * when the wallet changes.
 */
export function AuthProvider({ children }: PropsWithChildren) {
  const { address } = useAccount()
  const lower = address?.toLowerCase()
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

  const isAuthenticated = authedAddress !== undefined && authedAddress === lower

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

  // Keep the latest signIn reachable WITHOUT listing it as an effect dependency.
  // If the restore effect depended on signIn, a change in its identity (wagmi
  // re-creating signMessageAsync) — or StrictMode's mount/unmount/mount — would
  // re-run the effect mid-probe and strand it on 'checking'.
  const signInRef = useRef(signIn)
  useEffect(() => {
    signInRef.current = signIn
  })

  // Once per connected address: restore an existing cookie session (no wallet
  // prompt); only when there is none for THIS wallet, prompt the signature. The
  // `active` flag drops state writes from a run whose address has since changed,
  // and makes the flow StrictMode-safe (only the surviving run resolves status).
  useEffect(() => {
    if (!lower) return
    let active = true
    void (async () => {
      setStatus('checking')
      const sessionAddress = await getSession().catch(() => null)
      if (!active) return
      if (sessionAddress === lower) {
        setAuthedAddress(lower)
        setStatus('idle')
        return
      }
      // No valid session for this wallet -> sign in (sets its own status).
      await signInRef.current()
    })()
    return () => {
      active = false
    }
  }, [lower])

  return (
    <AuthContext.Provider value={{ isAuthenticated, status, error, signIn }}>
      {children}
    </AuthContext.Provider>
  )
}
