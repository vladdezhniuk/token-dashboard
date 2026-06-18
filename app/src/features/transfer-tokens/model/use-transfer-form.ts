import { useForm } from 'react-hook-form'
import { useAccount } from 'wagmi'
import { isPositiveAmount, isValidAddress } from '@/shared/lib'
import { useToken } from '@/entities/token'
import { toast } from '@/shared/ui'
import { useTransferTokens } from './use-transfer-tokens'
import { transferStatusLabel } from '../lib/status-label'

interface TransferFields {
  to: string
  amount: string
}

/**
 * Drives the transfer form with react-hook-form: field registration + validation,
 * and the submit flow — validate -> transfer mutation -> toast -> reset & refetch
 * the balance. Keeps the widget pure presentation; `onSubmit` is the handler to wire
 * onto the `<form>`.
 */
export function useTransferForm() {
  const { isConnected } = useAccount()
  const { configured, decimals, symbol, refetch } = useToken()
  const { transfer, phase, isPending } = useTransferTokens(decimals)

  const { register, handleSubmit, reset, formState } = useForm<TransferFields>({
    defaultValues: { to: '', amount: '' },
    mode: 'onTouched',
  })

  const onSubmit = handleSubmit(async ({ to, amount }) => {
    try {
      await transfer({ to: to.trim(), amount: amount.trim() })
      toast.success('Transfer sent')
      reset()
      refetch()
    } catch {
      // Failures surface via the global mutation error toast; just don't reset on error.
    }
  })

  return {
    toField: register('to', { validate: (v) => isValidAddress(v) || 'Enter a valid 0x address' }),
    amountField: register('amount', { validate: (v) => isPositiveAmount(v) || 'Amount must be greater than 0' }),
    errors: formState.errors,
    onSubmit,
    busy: isPending,
    disabled: !isConnected || !configured || isPending,
    label: transferStatusLabel(phase),
    symbol,
    isConnected,
  }
}
