import { useState } from 'react'
import { useAccount, useConfig, useWriteContract } from 'wagmi'
import { waitForTransactionReceipt } from 'wagmi/actions'
import { useQueryClient } from '@tanstack/react-query'
import { parseUnits, type Address, type Hex } from 'viem'
import { erc20Abi, tokenAddress } from '@/shared/blockchain'

export type TransferStatus = 'idle' | 'signing' | 'confirming' | 'success' | 'error'

/**
 * Transfer flow: sign `transfer(to, amount)` -> wait for the receipt -> refetch
 * history. There is no POST endpoint: the backend ingests confirmed transfers from
 * the chain, so the client only invalidates the history query. Returns the tx hash.
 */
export function useTransferTokens(decimals: number) {
  const { address } = useAccount()
  const config = useConfig()
  const { writeContractAsync } = useWriteContract()
  const queryClient = useQueryClient()
  const [status, setStatus] = useState<TransferStatus>('idle')
  const [error, setError] = useState<string>()

  async function submit(to: string, amount: string): Promise<Hex | undefined> {
    if (!tokenAddress || !address) return undefined
    setError(undefined)
    try {
      setStatus('signing')
      const value = parseUnits(amount, decimals)
      const hash = await writeContractAsync({
        address: tokenAddress,
        abi: erc20Abi,
        functionName: 'transfer',
        args: [to as Address, value],
      })

      setStatus('confirming')
      await waitForTransactionReceipt(config, { hash })
      await queryClient.invalidateQueries({ queryKey: ['transfers', address] })

      setStatus('success')
      return hash
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Transaction failed')
      setStatus('error')
      return undefined
    }
  }

  function reset() {
    setStatus('idle')
    setError(undefined)
  }

  return { submit, reset, status, error }
}
