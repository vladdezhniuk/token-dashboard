import { useAccount, useReadContract } from 'wagmi'
import { erc20Abi, tokenAddress } from '@/shared/blockchain'

/** Reads DevToken metadata (name/symbol/decimals) and the connected wallet's balance. */
export function useToken() {
  const { address } = useAccount()
  const configured = Boolean(tokenAddress)

  const name = useReadContract({
    address: tokenAddress,
    abi: erc20Abi,
    functionName: 'name',
    query: { enabled: configured },
  })
  const symbol = useReadContract({
    address: tokenAddress,
    abi: erc20Abi,
    functionName: 'symbol',
    query: { enabled: configured },
  })
  const decimals = useReadContract({
    address: tokenAddress,
    abi: erc20Abi,
    functionName: 'decimals',
    query: { enabled: configured },
  })
  const balance = useReadContract({
    address: tokenAddress,
    abi: erc20Abi,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    query: { enabled: Boolean(tokenAddress && address) },
  })

  return {
    configured,
    name: name.data,
    symbol: symbol.data ?? 'DVT',
    decimals: decimals.data ?? 18,
    balance: balance.data,
    isLoading: name.isLoading || symbol.isLoading || decimals.isLoading || balance.isLoading,
    refetch: () => {
      void balance.refetch()
    },
  }
}
