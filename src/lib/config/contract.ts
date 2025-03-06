// src/lib/config/contract.ts
import { createPublicClient, createWalletClient, http, custom, webSocket, fallback, type Log } from 'viem'
import { polygon } from 'viem/chains'
import { retroGamingABI } from '$lib/contracts/abi.js'
import { Monad_Testnet } from './chains.js'
// Types pour les événements
interface CustomLog extends Log {
  args?: {
    status?: boolean;
    newOwner?: `0x${string}`;
    maxWinners?: number;
    platformFeePercent?: number;
    winnerPercentages?: readonly number[];
  };
}

declare global {
  interface Window {
    ethereum?: any;
  }
}

// Adresse du contrat déployé
export const RETRO_GAMING_ADDRESS = '0x2C71529b419dfa2f38DFE9360334326843e61419' as const

// Configuration du contrat
export const CONTRACT_CONFIG = {
  roundDuration: 172800n, // 48h en secondes
  minStake: '0.01',     // ETH
  platformFee: 30n,     // %
  verifierFee: 10n,     // %
  maxScorePerGame: 100n,
  saltKey: 0x0n,
  active: true,
  rewardDistribution: {
    maxWinners: 3,
    platformFeePercent: 10,
    defaultPercentages: {
      snake: [50, 30, 20],
      tetris: [50, 30, 20]
    }
  }
} as const

const transports = [
  webSocket('wss://polygon.drpc.org', {
    reconnect: { attempts: 5, delay: 1000 },
    keepAlive: true,
  }),
  http('https://polygon.meowrpc.com')
]

export const publicClient = createPublicClient({
  chain: polygon,
  transport: fallback(transports),
  batch: { multicall: true }
})

// Événements du contrat
export const contractEvents = {
  watchVerifierStatus(address: `0x${string}`, onStatusChange: (status: boolean) => void) {
    return publicClient.watchContractEvent({
      address: RETRO_GAMING_ADDRESS,
      abi: retroGamingABI,
      eventName: 'VerifierUpdated',
      args: { verifier: address } as const,
      onLogs: (logs: CustomLog[]) => {
        const customLogs = logs as CustomLog[];
        if (customLogs[0] && customLogs[0].args) {
          if (logs[0].args && logs[0].args.status !== undefined) {
            onStatusChange(logs[0].args.status as boolean);
          }
        }
      }
    });
  },

  watchOwnershipChange(address: `0x${string}`, onOwnerChange: (isOwner: boolean) => void) {
    return publicClient.watchContractEvent({
      address: RETRO_GAMING_ADDRESS,
      abi: retroGamingABI,
      eventName: 'OwnershipTransferred',
      onLogs: (logs: CustomLog[]) => {
        const newOwner = logs[0]?.args?.newOwner
        if (newOwner) {
          onOwnerChange(newOwner === address)
        }
      }
    })
  },

  watchRewardDistributionUpdate(onUpdate: (data: {
    maxWinners: number;
    platformFeePercent: number;
    winnerPercentages: number[];
  }) => void) {
    return publicClient.watchContractEvent({
      address: RETRO_GAMING_ADDRESS,
      abi: retroGamingABI,
      eventName: 'RewardDistributionUpdated',
      onLogs: (logs: CustomLog[]) => {
        const args = logs[0]?.args
        if (args?.maxWinners !== undefined && 
            args?.platformFeePercent !== undefined && 
            args?.winnerPercentages) {
          onUpdate({
            maxWinners: args.maxWinners,
            platformFeePercent: args.platformFeePercent,
            winnerPercentages: args.winnerPercentages.slice()
          })
        }
      }
    });
  }
}

// Fonction pour obtenir un wallet client
export async function getWalletClient() {
  if (!window?.ethereum) {
    throw new Error('No ethereum provider found')
  }
  
  return createWalletClient({
    chain: polygon,
    transport: custom(window.ethereum)
  })
}