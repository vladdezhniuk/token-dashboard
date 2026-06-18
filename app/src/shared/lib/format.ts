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
