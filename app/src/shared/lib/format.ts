import { formatUnits } from 'viem'

/**
 * Fixed-decimal token amount — always `fractionDigits` fraction digits.
 * Used for the native ETH balance (e.g. `1.2300 ETH`).
 */
export function formatTokenAmount(value: bigint, decimals: number, fractionDigits = 4): string {
  return Number(formatUnits(value, decimals)).toFixed(fractionDigits)
}

/**
 * Locale-formatted token balance — grouping separators, trailing zeros trimmed,
 * capped at `maximumFractionDigits`. Used for the ERC-20 token balance.
 */
export function formatTokenBalance(value: bigint, decimals: number, maximumFractionDigits = 4): string {
  return Number(formatUnits(value, decimals)).toLocaleString(undefined, { maximumFractionDigits })
}

/**
 * Formats a transfer `amount` stored as raw base units (an integer string) for the
 * history table. Falls back to the raw value if it isn't a clean integer (defensive
 * against legacy/mixed rows).
 */
export function formatTransferAmount(raw: string, decimals: number): string {
  try {
    return formatTokenBalance(BigInt(raw), decimals)
  } catch {
    return raw
  }
}
