import { Button, Card, CardHeader, Spinner, TextField } from '@/shared/ui'
import { useTransferForm } from '@/features/transfer-tokens'

export function TransferForm() {
  const { toField, amountField, errors, onSubmit, busy, disabled, label, symbol, isConnected } = useTransferForm()

  return (
    <Card>
      <CardHeader icon="send" title={`Transfer ${symbol}`} />

      <form className="flex flex-col gap-1" onSubmit={onSubmit} noValidate>
        <TextField
          label="Recipient address"
          placeholder="0x…"
          {...toField}
          error={Boolean(errors.to)}
          help={errors.to?.message}
          spellCheck={false}
          autoComplete="off"
        />
        <TextField
          label={`Amount (${symbol})`}
          placeholder="0.0"
          inputMode="decimal"
          {...amountField}
          error={Boolean(errors.amount)}
          help={errors.amount?.message}
        />
        <Button full type="submit" icon={busy ? undefined : 'send'} disabled={disabled}>
          {busy ? <Spinner /> : null}
          {label}
        </Button>
        {!isConnected ? (
          <span className="text-body-medium text-on-surface-variant mt-2">Connect a wallet to transfer.</span>
        ) : null}
      </form>
    </Card>
  )
}
