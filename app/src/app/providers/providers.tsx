import type { PropsWithChildren } from 'react'
import { WagmiProvider } from 'wagmi'
import { QueryClientProvider } from '@tanstack/react-query'
import { ToastProvider } from '@/shared/ui'
import { wagmiConfig } from './appkit'
import { queryClient } from './query-client'
import { EnsureChain } from './ensure-chain'

/** App-wide provider tree: wagmi (wallet/chain state) + TanStack Query + toasts. */
export function Providers({ children }: PropsWithChildren) {
  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <ToastProvider>
          <EnsureChain />
          {children}
        </ToastProvider>
      </QueryClientProvider>
    </WagmiProvider>
  )
}
