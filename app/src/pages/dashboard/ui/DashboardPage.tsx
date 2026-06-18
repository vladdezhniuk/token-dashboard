import { Icon } from '@/shared/ui'
import { WalletPanel } from '@/widgets/wallet-panel'
import { TokenPanel } from '@/widgets/token-panel'
import { TransferForm } from '@/widgets/transfer-form'
import { TransferHistory } from '@/widgets/transfer-history'

export function DashboardPage() {
  return (
    <>
      <header className="flex items-center gap-3 h-16 px-6 sticky top-0 z-10 bg-surface-container border-b border-outline-variant">
        <span className="flex items-center justify-center w-10 h-10 rounded-md bg-primary-container text-on-primary-container">
          <Icon name="toll" />
        </span>
        <div className="text-title-large">Token Dashboard</div>
      </header>

      <div className="max-w-[1080px] mx-auto p-6">
        <div className="grid grid-cols-2 gap-4 items-stretch max-[760px]:grid-cols-1">
          <WalletPanel />
          <TokenPanel />
          <div className="col-span-full">
            <TransferForm />
          </div>
          <div className="col-span-full">
            <TransferHistory />
          </div>
        </div>
      </div>
    </>
  )
}
