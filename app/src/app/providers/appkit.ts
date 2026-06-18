import { createAppKit } from '@reown/appkit/react'
import { WagmiAdapter } from '@reown/appkit-adapter-wagmi'
import { hardhat, sepolia, type AppKitNetwork } from '@reown/appkit/networks'
import { env } from '@/shared/config'

if (!env.reownProjectId) {
  console.warn(
    '[AppKit] VITE_REOWN_PROJECT_ID is not set. Create one at https://cloud.reown.com — ' +
      'WalletConnect / QR connections stay disabled until it is provided ' +
      '(injected wallets like MetaMask still work).',
  )
}

/** Networks the dashboard supports: local Hardhat (31337) + Sepolia testnet. */
export const networks: [AppKitNetwork, ...AppKitNetwork[]] = [hardhat, sepolia]

const wagmiAdapter = new WagmiAdapter({
  networks,
  projectId: env.reownProjectId,
  ssr: false,
})

/** wagmi config built by the adapter — consumed by <WagmiProvider>. */
export const wagmiConfig = wagmiAdapter.wagmiConfig

// Initialise Reown AppKit once, at module load (registers the modal web components).
createAppKit({
  adapters: [wagmiAdapter],
  networks,
  projectId: env.reownProjectId,
  metadata: {
    name: 'Token Dashboard',
    description: 'Connect a wallet and transfer DevToken (DVT).',
    url: window.location.origin,
    icons: ['https://avatars.githubusercontent.com/u/179229932'],
  },
  features: { analytics: false },
})
