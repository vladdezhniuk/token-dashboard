import { useState } from 'react'
import { useAccount, useConfig, useWriteContract } from 'wagmi'
import { waitForTransactionReceipt } from 'wagmi/actions'
import { useQueryClient } from '@tanstack/react-query'
import { parseUnits, type Address, type Hex } from 'viem'
import { erc20Abi, tokenAddress } from '@/shared/blockchain'
import { saveTransfer } from '@/entities/transfer'

export type TransferStatus = 'idle' | 'signing' | 'confirming' | 'saving' | 'success' | 'error'

interface TransferResult {
  hash: Hex
  saved: boolean
}

/**
 * Full transfer flow: sign `transfer(to, amount)` -> wait for the receipt ->
 * persist to the backend. A failed backend save is non-fatal (the tx already
 * succeeded on-chain), reported via `saved: false`.
 */
export function useTransferTokens(decimals: number) {
  const { address } = useAccount()
  const config = useConfig()
  const { writeContractAsync } = useWriteContract()
  const queryClient = useQueryClient()
  const [status, setStatus] = useState<TransferStatus>('idle')
  const [error, setError] = useState<string>()

  async function submit(to: string, amount: string): Promise<TransferResult | undefined> {
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

      setStatus('saving')
      let saved = true
      try {
        await saveTransfer({ from: address, to, amount, txHash: hash })
        await queryClient.invalidateQueries({ queryKey: ['transfers', address] })
      } catch {
        saved = false
      }

      setStatus('success')
      return { hash, saved }
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
