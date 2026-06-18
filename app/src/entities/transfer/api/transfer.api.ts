import { httpGet, httpPost } from '@/shared/api'
import type { SaveTransferInput, TransferRecord } from '../model/types'

/** GET /transfers?address= — history where the address is sender or receiver. */
export function getTransferHistory(address: string): Promise<TransferRecord[]> {
  return httpGet<TransferRecord[]>(`/transfers?address=${encodeURIComponent(address)}`)
}

/** POST /transfers — persist a transfer after it is confirmed on-chain. */
export function saveTransfer(input: SaveTransferInput): Promise<TransferRecord> {
  return httpPost<TransferRecord>('/transfers', input)
}
