import { isAddress } from 'viem'

/** Truncate an address for display: `0x1234…cdef`. */
export function shortenAddress(value?: string, chars = 4): string {
  if (!value) return ''
  if (value.length <= 2 + chars * 2) return value
  return `${value.slice(0, 2 + chars)}…${value.slice(-chars)}`
}

/** True when `value` (trimmed) is a checksum-valid EVM address. */
export function isValidAddress(value: string): boolean {
  return isAddress(value.trim())
}
