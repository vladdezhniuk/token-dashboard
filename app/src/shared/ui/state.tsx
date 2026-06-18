import type { ReactNode } from 'react'
import { Icon } from './icon'
import { Spinner } from './spinner'

/** Centered, full-height placeholder container (former `.empty` layout helper). */
const stateContainer =
  'flex flex-1 flex-col items-center justify-center gap-2 py-8 px-4 text-on-surface-variant text-center'

/** Icon + message placeholder for empty / disconnected / not-configured states. */
export function EmptyState({
  icon,
  children,
  action,
}: {
  icon: string
  children: ReactNode
  action?: ReactNode
}) {
  return (
    <div className={stateContainer}>
      <Icon name={icon} className="text-[40px] opacity-60" />
      <p className="text-body-medium m-0">{children}</p>
      {action}
    </div>
  )
}

/**
 * Renders the right branch of an async read in a fixed order:
 * loading -> spinner, else `error` -> `errorState`, else `empty` -> `emptyState`,
 * else `children` (the success content).
 */
export function AsyncState({
  loading,
  error,
  empty,
  errorState,
  emptyState,
  children,
}: {
  loading: boolean
  error?: boolean
  empty?: boolean
  errorState: ReactNode
  emptyState: ReactNode
  children: ReactNode
}) {
  if (loading) {
    return (
      <div className={stateContainer}>
        <Spinner />
      </div>
    )
  }
  if (error) return <>{errorState}</>
  if (empty) return <>{emptyState}</>
  return <>{children}</>
}
