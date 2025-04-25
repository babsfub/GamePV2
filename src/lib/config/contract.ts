// src/lib/config/contract.ts
import { createPublicClient, createWalletClient, http, custom, webSocket, fallback, type Log, parseEther } from 'viem'
import { polygon } from 'viem/chains'
import { retroGamingABI } from '$lib/contracts/abi.js'

// Types pour les événements
interface CustomLog extends Log {
  args?: {
    status?: boolean;
    newOwner?: `0x${string}`;
    maxWinners?: number;
    platformFeePercent?: number;
    winnerPercentages?: readonly number[];
    game?: string;
    roundId?: bigint;
    platformFee?: bigint;
    winners?: any[];
  };
}

declare global {
  interface Window {
    ethereum?: any;
  }
}

// Adresse du contrat déployé sur Polygon uniquement
export const RETRO_GAMING_ADDRESS = '0xaB33896468A18CDb1Ba9cF87Aeb31c3c3255f625' as `0x${string}`;

// Configuration du contrat
export const CONTRACT_CONFIG = {
  // Paramètres de base
  roundDuration: 172800n,                 // 48h en secondes
  minStake: parseEther('0.01'),           // 0.01 ETH (converti en bigint)
  platformFee: 30,                        // 30% (en number, pas en bigint)
  verifierFee: 10,                        // 10% (en number, pas en bigint)
  maxScorePerGame: 100n,                  // 100 scores max par round
  saltKey: ('0x' + '0'.repeat(64)) as `0x${string}`, // Clé salt au format correct
  active: true,                           // Jeu actif par défaut
  
  // Nouveaux paramètres requis
  maxScoresPerPlayer: 5,                  // 5 scores par joueur max
  currentRound: 0n,                       // Round de départ
  lastRoundStartTime: 0n,                 // Heure de début du dernier round
  allowUnverifiedScores: false,           // Scores vérifiés requis par défaut
  minDistributionDelay: 86400n,           // 24h de délai avant distribution
  
  // Configuration de la distribution des récompenses
  rewardDistribution: {
    maxWinners: 3,
    platformFeePercent: 10,
    winnerPercentages: [50, 30, 20] as readonly number[],  // Format corrigé
    defaultPercentages: {                 // Format historique conservé pour compatibilité
      snake: [50, 30, 20],
      tetris: [50, 30, 20],
      minesweeper: [50, 30, 20]          // Ajout du nouveau jeu
    }
  }
} as const;

// Configuration des transports réseau optimisés pour Polygon
const polygonTransports = [
  http('https://polygon-rpc.com', {
    timeout: 10_000,
  }),
  http('https://polygon.drpc.org', {
    timeout: 15_000,
  }),
  webSocket('wss://polygon-rpc.publicnode.com', {
    reconnect: { attempts: 5, delay: 1000 },
    keepAlive: true,
  }),
];

// Client pour les interactions en lecture
export const publicClient = createPublicClient({
  chain: polygon,
  transport: fallback(polygonTransports),
  batch: { multicall: true }
});

// Fonction pour vérifier si le contrat est correctement déployé
export async function verifyContractDeployment() {
  try {
    // Vérifier si le bytecode existe à cette adresse (s'il y a un contrat)
    const bytecode = await publicClient.getBytecode({
      address: RETRO_GAMING_ADDRESS,
    });

    if (!bytecode || bytecode === '0x') {
      console.error('Aucun contrat trouvé à l\'adresse', RETRO_GAMING_ADDRESS);
      return false;
    }

    // Essayer d'appeler une méthode simple comme paused() qui devrait toujours exister
    try {
      const isPaused = await publicClient.readContract({
        address: RETRO_GAMING_ADDRESS,
        abi: retroGamingABI,
        functionName: 'paused'
      });
      console.log('Contrat vérifié, état de pause:', isPaused);
      return true;
    } catch (functionError) {
      console.error('Le contrat existe mais la fonction paused() a échoué:', functionError);
      return false;
    }
  } catch (error) {
    console.error('Erreur lors de la vérification du contrat:', error);
    return false;
  }
}

// Événements du contrat
export const contractEvents = {
  watchVerifierStatus(address: `0x${string}`, onStatusChange: (status: boolean) => void) {
    return publicClient.watchContractEvent({
      address: RETRO_GAMING_ADDRESS,
      abi: retroGamingABI,
      eventName: 'VerifierUpdated',
      args: { verifier: address } as const,
      onLogs: (logs) => {
        const customLogs = logs as unknown as CustomLog[];
        if (customLogs[0] && customLogs[0].args) {
          if (customLogs[0].args.status !== undefined) {
            onStatusChange(customLogs[0].args.status as boolean);
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
        const newOwner = logs[0]?.args?.newOwner;
        if (newOwner) {
          onOwnerChange(newOwner === address);
        }
      }
    });
  },

  watchRewardDistributionUpdate(onUpdate: (data: {
    maxWinners: number;
    platformFeePercent: number;
    winnerPercentages: number[];
  }) => void) {
    return publicClient.watchContractEvent({
      address: RETRO_GAMING_ADDRESS,
      abi: retroGamingABI,
      eventName: 'RewardDistributionUpdated', // Nom correct de l'événement
      onLogs: (logs) => {
        const customLogs = logs as unknown as CustomLog[];
        const args = customLogs[0]?.args;
        if (args?.maxWinners !== undefined && 
            args?.platformFeePercent !== undefined && 
            args?.winnerPercentages) {
          onUpdate({
            maxWinners: args.maxWinners,
            platformFeePercent: args.platformFeePercent,
            winnerPercentages: Array.isArray(args.winnerPercentages) 
              ? args.winnerPercentages.slice() 
              : []
          });
        }
      }
    });
  },

  watchRewardsDistributed(onRewardsDistributed: (data: {
    game: string;
    roundId: bigint;
    winners: any[];
    platformFee: bigint;
  }) => void) {
    return publicClient.watchContractEvent({
      address: RETRO_GAMING_ADDRESS,
      abi: retroGamingABI,
      eventName: 'RewardsDistributed',
      onLogs: (logs) => {
        const customLogs = logs as unknown as CustomLog[];
        const args = customLogs[0]?.args;
        if (args?.game && args?.roundId && args?.winners && args?.platformFee) {
          onRewardsDistributed({
            game: args.game,
            roundId: args.roundId,
            winners: args.winners,
            platformFee: args.platformFee
          });
        }
      }
    });
  }
};

// Fonction pour obtenir un wallet client
export async function getWalletClient() {
  if (!window?.ethereum) {
    throw new Error('No ethereum provider found');
  }
  
  return createWalletClient({
    chain: polygon,
    transport: custom(window.ethereum)
  });
}

// Initialisation - Vérifier la connexion au contrat au démarrage
if (typeof window !== 'undefined') {
  // Exécuter uniquement côté client
  window.addEventListener('load', async () => {
    try {
      const isDeployed = await verifyContractDeployment();
      if (isDeployed) {
        console.log('Contrat vérifié et disponible sur Polygon');
        
        try {
          // Essayer de récupérer le propriétaire
          const owner = await publicClient.readContract({
            address: RETRO_GAMING_ADDRESS,
            abi: retroGamingABI,
            functionName: 'owner'
          });
          console.log('Propriétaire du contrat:', owner);
        } catch (ownerError) {
          console.warn('Impossible de récupérer le propriétaire:', ownerError);
        }
      } else {
        console.error('Contrat non disponible sur Polygon');
      }
    } catch (error) {
      console.error('Erreur lors de la vérification du contrat:', error);
    }
  });
}