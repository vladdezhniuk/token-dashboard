/**
 * Typed access to the browser-exposed (VITE_) environment.
 * The single place env vars are read — features/widgets import from here.
 */
export const env = {
  reownProjectId: import.meta.env.VITE_REOWN_PROJECT_ID ?? '',
  apiUrl: import.meta.env.VITE_API_URL ?? 'http://localhost:3000',
  tokenAddress: import.meta.env.VITE_TOKEN_ADDRESS,
  chainId: Number(import.meta.env.VITE_CHAIN_ID ?? 31337),
} as const
