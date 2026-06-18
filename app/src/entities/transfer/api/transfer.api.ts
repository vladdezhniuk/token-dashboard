import { httpGet } from '@/shared/api'
import type { TransferDirection, TransferRecord } from '../model/types'

/**
 * GET /transfers?address=&type= — history for an address. Without `type` it
 * returns transfers where the address is sender OR recipient; `sent`/`received`
 * narrow it to one side.
 */
export function getTransferHistory(address: string, type?: TransferDirection): Promise<TransferRecord[]> {
  const query = new URLSearchParams({ address })
  if (type) query.set('type', type)
  return httpGet<TransferRecord[]>(`/transfers?${query.toString()}`)
}
