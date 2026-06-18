import { useState } from 'react'
import { useAccount } from 'wagmi'
import { AsyncState, Button, Card, CardHeader, EmptyState, IconButton, SegmentedControl, Spinner } from '@/shared/ui'
import { useTransferHistory, type TransferDirection } from '@/entities/transfer'
import { useAuth } from '@/features/auth'
import { TransferTable } from './transfer-table'

type HistoryFilter = 'all' | TransferDirection

const FILTERS: readonly { value: HistoryFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'sent', label: 'Sent' },
  { value: 'received', label: 'Received' },
]

export function TransferHistory() {
  const { address, isConnected } = useAccount()
  const { isAuthenticated, status: authStatus, signIn } = useAuth()
  const [filter, setFilter] = useState<HistoryFilter>('all')
  const { data, isLoading, isError, isFetching, refetch } = useTransferHistory(
    address,
    isAuthenticated,
    filter === 'all' ? undefined : filter,
  )
  const authBusy = authStatus === 'signing' || authStatus === 'verifying'

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
            disabled={!isConnected || !isAuthenticated || isFetching}
          />
        }
      />

      {!isConnected ? (
        <EmptyState icon="link_off">Connect your wallet to see history.</EmptyState>
      ) : authStatus === 'checking' ? (
        <div className="flex flex-1 items-center justify-center py-8">
          <Spinner />
        </div>
      ) : !isAuthenticated ? (
        <EmptyState
          icon="lock"
          action={
            <Button
              variant="tonal"
              icon={authBusy ? undefined : 'login'}
              onClick={() => void signIn()}
              disabled={authBusy}
            >
              {authBusy ? <Spinner /> : null}
              {authStatus === 'signing' ? 'Sign message…' : authStatus === 'verifying' ? 'Verifying…' : 'Sign in'}
            </Button>
          }
        >
          Sign in with your wallet to view transfer history.
        </EmptyState>
      ) : (
        <div className="flex flex-col gap-4">
          <SegmentedControl<HistoryFilter> options={FILTERS} value={filter} onChange={setFilter} />
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
        </div>
      )}
    </Card>
  )
}
