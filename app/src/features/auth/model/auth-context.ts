import { createContext, useContext } from 'react'

export type AuthStatus = 'idle' | 'checking' | 'signing' | 'verifying' | 'error'

export interface AuthApi {
  /** Whether a wallet-signature session has been established this session. */
  isAuthenticated: boolean
  status: AuthStatus
  error?: string
  /** Run the sign-in (SIWE) flow: fetch nonce -> sign -> verify -> set cookie. */
  signIn: () => Promise<void>
}

export const AuthContext = createContext<AuthApi | null>(null)

/** Access the auth session API. Must be called within an `<AuthProvider>`. */
export function useAuth(): AuthApi {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within <AuthProvider>')
  return ctx
}
