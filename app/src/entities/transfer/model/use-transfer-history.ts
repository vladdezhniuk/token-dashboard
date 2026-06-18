import { useQuery } from '@tanstack/react-query'
import { getTransferHistory } from '../api/transfer.api'
import type { TransferDirection } from './types'

/**
 * Transfer history for an address (newest first), optionally filtered by direction.
 * `enabled` lets callers hold the (auth-gated) request until a session exists.
 */
export function useTransferHistory(address?: string, enabled = true, type?: TransferDirection) {
  return useQuery({
    queryKey: ['transfers', address, type ?? 'all'],
    queryFn: () => getTransferHistory(address as string, type),
    enabled: Boolean(address) && enabled,
  })
}
