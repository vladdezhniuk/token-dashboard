import { erc20Abi, isAddress, type Address } from 'viem'
import { env } from '@/shared/config'

export { erc20Abi }

/** Deployed DevToken address from VITE_TOKEN_ADDRESS, or undefined if not set/invalid. */
export const tokenAddress: Address | undefined =
  env.tokenAddress && isAddress(env.tokenAddress) ? env.tokenAddress : undefined
