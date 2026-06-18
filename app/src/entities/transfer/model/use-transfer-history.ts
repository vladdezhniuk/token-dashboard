import { useQuery } from '@tanstack/react-query'
import { getTransferHistory } from '../api/transfer.api'

/** Transfer history for an address (sender or receiver), newest first. */
export function useTransferHistory(address?: string) {
  return useQuery({
    queryKey: ['transfers', address],
    queryFn: () => getTransferHistory(address as string),
    enabled: Boolean(address),
  })
}
