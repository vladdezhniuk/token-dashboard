import { Button, Card, CardHeader, Spinner, TextField } from '@/shared/ui'
import { useTransferForm } from '@/features/transfer-tokens'

export function TransferForm() {
  const { to, amount, setTo, setAmount, toError, amountError, busy, disabled, label, symbol, isConnected, onSend } =
    useTransferForm()

  return (
    <Card>
      <CardHeader icon="send" title={`Transfer ${symbol}`} />

      <div className="flex flex-col gap-1">
        <TextField
          label="Recipient address"
          placeholder="0x…"
          value={to}
          onChange={(e) => setTo(e.target.value)}
          error={Boolean(toError)}
          help={toError}
          spellCheck={false}
          autoComplete="off"
        />
        <TextField
          label={`Amount (${symbol})`}
          placeholder="0.0"
          inputMode="decimal"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          error={Boolean(amountError)}
          help={amountError}
        />
        <Button full icon={busy ? undefined : 'send'} onClick={onSend} disabled={disabled}>
          {busy ? <Spinner /> : null}
          {label}
        </Button>
        {!isConnected ? (
          <span className="text-body-medium text-on-surface-variant mt-2">Connect a wallet to transfer.</span>
        ) : null}
      </div>
    </Card>
  )
}
