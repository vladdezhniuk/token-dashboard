import type { TransferStatus } from '../model/use-transfer-tokens'

const TRANSFER_STATUS_LABELS: Partial<Record<TransferStatus, string>> = {
  signing: 'Confirm in wallet…',
  confirming: 'Confirming…',
}

/** Button label for the current transfer status; defaults to the idle CTA. */
export function transferStatusLabel(status: TransferStatus): string {
  return TRANSFER_STATUS_LABELS[status] ?? 'Send tokens'
}

/** True while a transfer is in flight (signing / confirming). */
export function isTransferBusy(status: TransferStatus): boolean {
  return status === 'signing' || status === 'confirming'
}
