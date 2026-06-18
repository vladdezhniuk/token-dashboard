import { useEffect, useRef } from 'react'
import { useAccount, useSwitchChain } from 'wagmi'
import { env } from '@/shared/config'
import { networks } from './appkit'

const targetConfigured = networks.some((n) => n.id === env.chainId)

/**
 * Automatically switches the connected wallet to the app's target chain
 * (VITE_CHAIN_ID — Sepolia 11155111 in this project; falls back to 31337 Hardhat if unset):
 *   - right after a fresh connect, and
 *   - on initial page load if a wallet is already connected (wagmi reconnects).
 * Prompts MetaMask to add the chain if it isn't there yet. It tries once per
 * wrong chain, so rejecting the prompt won't spam the user. Renders nothing.
 */
export function EnsureChain() {
  const { isConnected, chainId } = useAccount()
  const { switchChain } = useSwitchChain()
  const attemptedFor = useRef<number | null>(null)

  useEffect(() => {
    if (!targetConfigured) return
    if (!isConnected || chainId === undefined || chainId === env.chainId) {
      attemptedFor.current = null
      return
    }
    if (attemptedFor.current === chainId) return
    attemptedFor.current = chainId
    switchChain({ chainId: env.chainId as Parameters<typeof switchChain>[0]['chainId'] })
  }, [isConnected, chainId, switchChain])

  return null
}
