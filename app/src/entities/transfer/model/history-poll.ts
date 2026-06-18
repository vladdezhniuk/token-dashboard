import { useSyncExternalStore } from 'react'

const POLL_WINDOW_MS = 10_000

let pollUntil = 0
const listeners = new Set<() => void>()

/**
 * Open a ~10s window during which the history query refetches on an interval —
 * giving the backend indexer time to persist a just-confirmed on-chain transfer.
 */
export function pingHistoryPoll() {
  pollUntil = Date.now() + POLL_WINDOW_MS
  listeners.forEach((notify) => notify())
}

function subscribe(notify: () => void) {
  listeners.add(notify)
  return () => listeners.delete(notify)
}

/** Deadline (epoch ms) until which the history query should keep polling. */
export function useHistoryPollUntil() {
  return useSyncExternalStore(subscribe, () => pollUntil)
}
