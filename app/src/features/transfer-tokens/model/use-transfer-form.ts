import { useState } from 'react'
import { useAccount } from 'wagmi'
import { isPositiveAmount, isValidAddress } from '@/shared/lib'
import { useToken } from '@/entities/token'
import { useToast } from '@/shared/ui'
import { useTransferTokens } from './use-transfer-tokens'
import { isTransferBusy, transferStatusLabel } from '../lib/status-label'

export interface UseTransferFormResult {
  to: string
  amount: string
  setTo: (value: string) => void
  setAmount: (value: string) => void
  toError?: string
  amountError?: string
  busy: boolean
  disabled: boolean
  label: string
  symbol: string
  isConnected: boolean
  onSend: () => Promise<void>
}

/**
 * Drives the transfer form: field state, live validation (gated on `touched`),
 * and the submit flow — validate -> transfer -> toast -> reset & refetch.
 * Keeps the widget pure presentation.
 */
export function useTransferForm(): UseTransferFormResult {
  const { isConnected } = useAccount()
  const { configured, decimals, symbol, refetch } = useToken()
  const { submit, status, error } = useTransferTokens(decimals)
  const toast = useToast()

  const [to, setTo] = useState('')
  const [amount, setAmount] = useState('')
  const [touched, setTouched] = useState(false)

  const toError = touched && !isValidAddress(to) ? 'Enter a valid 0x address' : undefined
  const amountError = touched && !isPositiveAmount(amount) ? 'Amount must be greater than 0' : undefined
  const busy = isTransferBusy(status)
  const disabled = !isConnected || !configured || busy
  const label = transferStatusLabel(status)

  const onSend = async () => {
    setTouched(true)
    if (!isValidAddress(to) || !isPositiveAmount(amount)) return
    const res = await submit(to.trim(), amount.trim())
    if (res) {
      toast.show(
        res.saved ? 'Transfer sent & saved to history' : 'Transfer sent (history save failed)',
        res.saved ? 'success' : 'error',
      )
      setTo('')
      setAmount('')
      setTouched(false)
      refetch()
    } else if (error) {
      toast.show(error.length > 80 ? 'Transfer failed' : error, 'error')
    }
  }

  return {
    to,
    amount,
    setTo,
    setAmount,
    toError,
    amountError,
    busy,
    disabled,
    label,
    symbol,
    isConnected,
    onSend,
  }
}
