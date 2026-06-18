/** A persisted transfer record as returned by the backend history endpoint. */
export interface TransferRecord {
  id: number
  from: string
  to: string
  amount: string
  txHash: string
  createdAt: string
}

/** Payload sent to persist a transfer after it is confirmed on-chain. */
export interface SaveTransferInput {
  from: string
  to: string
  amount: string
  txHash: string
}
