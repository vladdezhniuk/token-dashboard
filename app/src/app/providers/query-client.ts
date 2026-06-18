import { QueryClient } from '@tanstack/react-query'

/** Single TanStack Query client for server + on-chain read caching. */
export const queryClient = new QueryClient()
