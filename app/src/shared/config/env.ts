/**
 * Typed access to the browser-exposed (VITE_) environment.
 * The single place env vars are read — features/widgets import from here.
 */
export const env = {
  reownProjectId: import.meta.env.VITE_REOWN_PROJECT_ID ?? '',
  // Dev: empty base -> relative URLs that hit the Vite proxy (same-origin, no CORS;
  // see vite.config.ts). Prod: set VITE_API_URL to the backend's absolute URL.
  apiUrl: import.meta.env.DEV ? '' : (import.meta.env.VITE_API_URL ?? ''),
  tokenAddress: import.meta.env.VITE_TOKEN_ADDRESS,
  chainId: Number(import.meta.env.VITE_CHAIN_ID ?? 31337),
} as const
