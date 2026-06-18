import { useState } from 'react'
import { useAccount, useConfig, useWriteContract } from 'wagmi'
import { waitForTransactionReceipt } from 'wagmi/actions'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { parseUnits, type Address, type Hex } from 'viem'
import { erc20Abi, tokenAddress } from '@/shared/blockchain'
import { pingHistoryPoll } from '@/entities/transfer'

/** The two wallet-facing phases of a transfer in flight (drives the button label). */
export type TransferPhase = 'signing' | 'confirming'

interface TransferInput {
  to: string
  amount: string
}

/**
 * Transfer flow as a TanStack mutation: sign `transfer(to, amount)` -> wait for the
 * receipt -> invalidate history. There is no POST endpoint — the backend ingests
 * confirmed transfers from the chain, so the client only refetches the history query.
 * `phase` exposes signing vs confirming; `transfer` (mutateAsync) resolves to the tx
 * hash or throws.
 */
export function useTransferTokens(decimals: number) {
  const { address } = useAccount()
  const config = useConfig()
  const { writeContractAsync } = useWriteContract()
  const queryClient = useQueryClient()
  const [phase, setPhase] = useState<TransferPhase>()

  const mutation = useMutation({
    mutationFn: async ({ to, amount }: TransferInput): Promise<Hex> => {
      if (!tokenAddress || !address) throw new Error('Wallet not connected')

      setPhase('signing')
      const value = parseUnits(amount, decimals)
      const hash = await writeContractAsync({
        address: tokenAddress,
        abi: erc20Abi,
        functionName: 'transfer',
        args: [to as Address, value],
      })

      setPhase('confirming')
      await waitForTransactionReceipt(config, { hash })
      return hash
    },
    onSuccess: () => {
      pingHistoryPoll()
      return queryClient.invalidateQueries({ queryKey: ['transfers', address] })
    },
    onSettled: () => setPhase(undefined),
  })

  return {
    transfer: mutation.mutateAsync,
    phase,
    isPending: mutation.isPending,
    error: mutation.error,
  }
}
