import { MutationCache, QueryClient } from '@tanstack/react-query'
import { toast } from '@/shared/ui'
import { friendlyError } from '@/shared/lib'

/**
 * Single TanStack Query client. Any failed mutation (transfer, sign-in, …) surfaces
 * an error toast here, so feature code doesn't repeat error handling. Read errors are
 * left to their inline states to avoid spamming toasts from polled queries.
 */
export const queryClient = new QueryClient({
  mutationCache: new MutationCache({
    onError: (error) => {
      const message = friendlyError(error)
      if (message) toast.error(message)
    },
  }),
})
