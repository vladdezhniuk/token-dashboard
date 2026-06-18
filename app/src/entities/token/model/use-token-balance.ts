import { useAccount, useReadContract } from 'wagmi'
import { erc20Abi, tokenAddress } from '@/shared/blockchain'

const BALANCE_POLL_MS = 12_000 // ~Sepolia block time

/** Connected wallet's DevToken balance, polled so on-chain changes show up on their own. */
export function useTokenBalance() {
  const { address } = useAccount()
  return useReadContract({
    address: tokenAddress,
    abi: erc20Abi,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    query: {
      enabled: Boolean(tokenAddress && address),
      refetchInterval: BALANCE_POLL_MS,
    },
  })
}
