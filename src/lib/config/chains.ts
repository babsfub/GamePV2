//$lib/config/chains.ts
import { defineChain } from 'viem'
 
export const Monad_Testnet = defineChain({
  id: 10143,
  name: 'Monad Testnet',
  nativeCurrency: {
    decimals: 18,
    name: 'Monad',
    symbol: 'MON',
  },
  rpcUrls: {
    default: {
      http: ['https://testnet-rpc.monad.xyz/'],
    },
  },
  blockExplorers: {
    default: { name: 'Explorer', url: 'http://testnet.monadexplorer.com/' },
  }
  
})

export const Monad_Testnet_contract  = '0x3982445583a4AbDCA7778E26c92F0acC6e98a313' as const
