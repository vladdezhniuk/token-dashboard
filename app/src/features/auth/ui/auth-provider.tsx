import { useCallback, useEffect, useRef, useState } from 'react'
import type { PropsWithChildren } from 'react'
import { useAccount, useSignMessage } from 'wagmi'
import { useQueryClient } from '@tanstack/react-query'
import { getNonce, signIn as signInRequest } from '../api/auth.api'
import { AuthContext, type AuthStatus } from '../model/auth-context'

/**
 * Holds the wallet-signature session and runs the sign-in (SIWE) flow:
 * `GET /auth/nonce` -> sign the nonce with the wallet -> `POST /auth/sign-in`
 * (the backend sets an httpOnly cookie). Sign-in is started automatically right
 * after a wallet connects; it is attempted once per address, so rejecting the
 * signature won't re-prompt in a loop (the "Sign in" button stays for a retry).
 * The session is valid only for the address that signed in, so it falls away
 * automatically when the wallet changes.
 */
export function AuthProvider({ children }: PropsWithChildren) {
  const { address } = useAccount()
  const { signMessageAsync } = useSignMessage()
  const queryClient = useQueryClient()
  const [authedAddress, setAuthedAddress] = useState<string>()
  const [status, setStatus] = useState<AuthStatus>('idle')
  const [error, setError] = useState<string>()

  // Reset the transient sign-in state when the wallet changes (React's "adjust
  // state during render" pattern — avoids a setState-in-effect). The session
  // validity itself is derived below, not stored as a flag.
  const [prevAddress, setPrevAddress] = useState(address)
  if (address !== prevAddress) {
    setPrevAddress(address)
    setStatus('idle')
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

  // Auto-start sign-in once per connected address. The ref guard keeps it to a
  // single attempt (no loop after a rejected signature or a backend error).
  const autoAttemptedFor = useRef<string | undefined>(undefined)
  useEffect(() => {
    if (!address) {
      autoAttemptedFor.current = undefined
      return
    }
    if (isAuthenticated || status !== 'idle' || autoAttemptedFor.current === address) return
    autoAttemptedFor.current = address
    void signIn()
  }, [address, isAuthenticated, status, signIn])

  return (
    <AuthContext.Provider value={{ isAuthenticated, status, error, signIn }}>
      {children}
    </AuthContext.Provider>
  )
}
