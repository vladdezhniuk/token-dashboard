import { useAccount } from 'wagmi'
import { Card, CardHeader, Chip, EmptyState, Spinner, Stat } from '@/shared/ui'
import { formatTokenBalance } from '@/shared/lib'
import { useToken } from '@/entities/token'

export function TokenPanel() {
  const { isConnected } = useAccount()
  const { configured, name, symbol, decimals, balance, isLoading } = useToken()

  return (
    <Card>
      <CardHeader icon="paid" title="Token" />

      {!configured ? (
        <EmptyState icon="help">
          Set <span className="font-mono">VITE_TOKEN_ADDRESS</span> in <span className="font-mono">app/.env</span>{' '}
          after deploying DevToken.
        </EmptyState>
      ) : (
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between gap-3">
            <Stat
              label={name ?? 'DevToken'}
              labelClassName="text-title-medium"
              valueClassName="text-body-medium text-on-surface-variant"
            >
              ERC-20 token
            </Stat>
            <Chip icon="toll">{symbol}</Chip>
          </div>

          <Stat label="YOUR BALANCE">
            {!isConnected ? (
              '—'
            ) : isLoading ? (
              <Spinner />
            ) : balance !== undefined ? (
              `${formatTokenBalance(balance, decimals)} ${symbol}`
            ) : (
              `0 ${symbol}`
            )}
          </Stat>

          {!isConnected ? (
            <span className="text-body-medium text-on-surface-variant">
              Connect your wallet to see your balance.
            </span>
          ) : null}
        </div>
      )}
    </Card>
  )
}
