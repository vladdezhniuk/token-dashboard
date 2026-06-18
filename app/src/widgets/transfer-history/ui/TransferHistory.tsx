import { useAccount } from 'wagmi'
import { AsyncState, Card, CardHeader, EmptyState, IconButton } from '@/shared/ui'
import { useTransferHistory } from '@/entities/transfer'
import { TransferTable } from './transfer-table'

export function TransferHistory() {
  const { address, isConnected } = useAccount()
  const { data, isLoading, isError, isFetching, refetch } = useTransferHistory(address)

  return (
    <Card>
      <CardHeader
        icon="history"
        title="Transfer history"
        action={
          <IconButton
            icon="refresh"
            title="Refresh"
            onClick={() => void refetch()}
            disabled={!isConnected || isFetching}
          />
        }
      />

      {!isConnected ? (
        <EmptyState icon="link_off">Connect your wallet to see history.</EmptyState>
      ) : (
        <AsyncState
          loading={isLoading}
          error={isError}
          empty={!data || data.length === 0}
          errorState={
            <EmptyState icon="cloud_off">
              Couldn&apos;t load history — is the backend running on <span className="font-mono">:3000</span>?
            </EmptyState>
          }
          emptyState={<EmptyState icon="inbox">No transfers yet.</EmptyState>}
        >
          <TransferTable rows={data ?? []} />
        </AsyncState>
      )}
    </Card>
  )
}
