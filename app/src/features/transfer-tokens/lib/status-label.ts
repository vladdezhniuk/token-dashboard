import type { TransferPhase } from '../model/use-transfer-tokens'

const TRANSFER_PHASE_LABELS: Record<TransferPhase, string> = {
  signing: 'Confirm in wallet…',
  confirming: 'Confirming…',
}

/** Button label for the current transfer phase; defaults to the idle CTA. */
export function transferStatusLabel(phase?: TransferPhase): string {
  return phase ? TRANSFER_PHASE_LABELS[phase] : 'Send tokens'
}
