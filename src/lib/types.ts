
//$lib/types.ts

export type PageData = {

    isAdmin: boolean;
  
  
  };

import type { Address } from 'viem'

export interface WalletState {
  address: Address | null
  isConnecting: boolean
  isVerifier: boolean
  isAdmin: boolean
  error: Error | null
}

export interface WalletStore {
  
  subscribe: (run: (value: WalletState) => void) => () => void
  setAddress: (address: Address) => void
  setConnecting: (isConnecting: boolean) => void
  setVerifier: (isVerifier: boolean) => void
  setAdmin: (isAdmin: boolean) => void
  setError: (error: Error) => void
  reset: () => void
}
  