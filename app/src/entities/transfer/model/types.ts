/** A persisted transfer record as returned by `GET /transfers` (backend column names). */
export interface TransferRecord {
  id: string
  address_from: string
  address_to: string
  amount: string
  tx_hash: string
  created_at: string
}

/** Filter for the history query — by sender (`sent`) or recipient (`received`). */
export type TransferDirection = 'sent' | 'received'
