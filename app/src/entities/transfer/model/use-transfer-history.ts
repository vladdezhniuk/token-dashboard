import { useQuery } from '@tanstack/react-query'
import { getTransferHistory } from '../api/transfer.api'
import { useHistoryPollUntil } from './history-poll'
import type { TransferDirection } from './types'

/**
 * Transfer history for an address (newest first), optionally filtered by direction.
 * `enabled` lets callers hold the (auth-gated) request until a session exists.
 * After a transfer it polls every 2s for a short window so the indexer can catch up.
 */
export function useTransferHistory(address?: string, enabled = true, type?: TransferDirection) {
  const pollUntil = useHistoryPollUntil()
  return useQuery({
    queryKey: ['transfers', address, type ?? 'all'],
    queryFn: () => getTransferHistory(address as string, type),
    enabled: Boolean(address) && enabled,
    refetchInterval: () => (Date.now() < pollUntil ? 2000 : false),
  })
}
