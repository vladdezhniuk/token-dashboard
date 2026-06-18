import type { PropsWithChildren } from 'react'
import { WagmiProvider } from 'wagmi'
import { QueryClientProvider } from '@tanstack/react-query'
import { ToastProvider } from '@/shared/ui'
import { AuthProvider } from '@/features/auth'
import { wagmiConfig } from './appkit'
import { queryClient } from './query-client'
import { EnsureChain } from './ensure-chain'

/** App-wide provider tree: wagmi (wallet/chain state) + TanStack Query + auth + toasts. */
export function Providers({ children }: PropsWithChildren) {
  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <ToastProvider>
            <EnsureChain />
            {children}
          </ToastProvider>
        </AuthProvider>
      </QueryClientProvider>
    </WagmiProvider>
  )
}
