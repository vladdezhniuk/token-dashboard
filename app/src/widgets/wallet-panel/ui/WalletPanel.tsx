import { useAccount, useBalance, useDisconnect } from 'wagmi'
import { useAppKit } from '@reown/appkit/react'
import { Button, Card, CardHeader, Chip, EmptyState, IconButton, Spinner, Stat, useToast } from '@/shared/ui'
import { formatTokenAmount, shortenAddress } from '@/shared/lib'

export function WalletPanel() {
  const { open } = useAppKit()
  const { address, isConnected, chain } = useAccount()
  const { disconnect } = useDisconnect()
  const { data: balance, isLoading } = useBalance({ address })
  const toast = useToast()

  const copy = () => {
    if (!address) return
    void navigator.clipboard.writeText(address)
    toast.show('Address copied', 'success')
  }

  return (
    <Card>
      <CardHeader icon="account_balance_wallet" title="Wallet" />

      {!isConnected ? (
        <EmptyState
          icon="link_off"
          action={
            <Button icon="account_balance_wallet" onClick={() => open()}>
              Connect wallet
            </Button>
          }
        >
          No wallet connected
        </EmptyState>
      ) : (
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between gap-3">
            <Chip icon="badge">
              <span className="font-mono">{shortenAddress(address, 5)}</span>
            </Chip>
            <div className="flex items-center gap-1">
              <IconButton icon="content_copy" title="Copy address" onClick={copy} />
              <IconButton icon="logout" title="Disconnect" onClick={() => disconnect()} />
            </div>
          </div>

          <Stat label="ETH BALANCE">
            {isLoading ? (
              <Spinner />
            ) : balance ? (
              `${formatTokenAmount(balance.value, balance.decimals)} ${balance.symbol}`
            ) : (
              '—'
            )}
          </Stat>

          <div className="flex items-center justify-between gap-3">
            <span className="text-body-medium text-on-surface-variant">Network</span>
            <Chip icon="lan">{chain ? chain.name : 'Unsupported'}</Chip>
          </div>
        </div>
      )}
    </Card>
  )
}
