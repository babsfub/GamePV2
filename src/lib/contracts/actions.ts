import type { Address, Hash } from 'viem'
import { publicClient, getWalletClient } from '$lib/config/contract.js'
import { retroGamingABI } from './abi.js'
import { RETRO_GAMING_ADDRESS } from '$lib/config/index.js'
import type { 
  GameConfig, 
  RoundView, 
  Score, 
  Winner, 
  Scores,
  VerifierStats
} from '$lib/types.js'

export const readContract = {
  /**
   * Retourne l'ID du round actuel pour un jeu spécifique
   * 
   * @param game - L'identifiant du jeu (snake, tetris, etc.)
   * @returns L'ID du round actuel
   */
  async getCurrentRoundId(game: string): Promise<bigint> {
    try {
      const gameConfig = await this.getGameConfig(game);
      return gameConfig.currentRound;
    } catch (error) {
      console.error('Error getting current round:', error)
      throw error
    }
  },

  async getGameConfig(game: string): Promise<GameConfig> {
    try {
      const result = await publicClient.readContract({
        address: RETRO_GAMING_ADDRESS,
        abi: retroGamingABI,
        functionName: 'getGameConfig',
        args: [game]
      });
      
      // Adapter le format de retour au format GameConfig utilisé dans l'application
      return {
        roundDuration: result.roundDuration,
        minStake: result.minStake,
        platformFee: result.platformFee,
        verifierFee: result.verifierFee,
        maxScorePerGame: result.maxScorePerGame,
        active: result.active,
        saltKey: result.saltKey,
        currentRound: result.currentRound,
        lastRoundStartTime: result.lastRoundStartTime,
        rewardDistribution: {
          maxWinners: result.maxWinners,
          platformFeePercent: result.platformFeePercent,
          winnerPercentages: result.winnerPercentages
        },
        maxScoresPerPlayer: result.maxScoresPerPlayer,
        allowUnverifiedScores: result.allowUnverifiedScores,
        minDistributionDelay: result.minDistributionDelay
      } as GameConfig;
    } catch (error) {
      console.error('Error getting game config:', error)
      throw error
    }
  },

  async getRoundData(roundId: bigint, game: string): Promise<RoundView> {
    try {
      const result = await publicClient.readContract({
        address: RETRO_GAMING_ADDRESS,
        abi: retroGamingABI,
        functionName: 'getRoundData',
        args: [game, roundId]
      });
      
      return {
        basic: {
          ...result.basic
        },
        scores: result.scores as Score[],
        winners: result.winners as Winner[],
        verifiers: result.verifiers.slice(),
        prizePool: result.prizePool,
        isActive: result.isActive
      };
    } catch (error) {
      console.error('Error getting round data:', error)
      throw error
    }
  },

  async getScoresByRound(roundId: bigint, game: string, verifiedOnly: boolean): Promise<Scores[]> {
    try {
      const result = await publicClient.readContract({
        address: RETRO_GAMING_ADDRESS,
        abi: retroGamingABI,
        functionName: 'getScoresByRound',
        args: [game, roundId, verifiedOnly]
      });
      
      return result as unknown as Scores[];
    } catch (error) {
      console.error('Error getting scores:', error)
      throw error
    }
  },

  async getVerificationData(roundId: bigint, game: string): Promise<VerifierStats> {
    try {
      const result = await publicClient.readContract({
        address: RETRO_GAMING_ADDRESS,
        abi: retroGamingABI,
        functionName: 'getVerificationData',
        args: [game, roundId]
      });
      
      return {
        verifiers: result.verifiers,
        actions: result.actions,
        rewards: result.rewards,
        isActive: 'isActive' in result ? result.isActive : false 
      } as unknown as VerifierStats;
    } catch (error) {
      console.error('Error getting verification data:', error) 
      throw error
    }
  },

  async getPendingWithdrawals(account: Address): Promise<bigint> {
    try {
      const result = await publicClient.readContract({
        address: RETRO_GAMING_ADDRESS,
        abi: retroGamingABI,
        functionName: 'getPendingWithdrawals',
        args: [account]
      });
      
      return result as bigint;
    } catch (error) {
      console.error('Error getting pending withdrawals:', error)
      throw error
    }
  },

  async isVerifier(account: Address): Promise<boolean> {
    try {
      return await publicClient.readContract({
        address: RETRO_GAMING_ADDRESS,
        abi: retroGamingABI,
        functionName: 'isVerifier',
        args: [account]
      });
    } catch (error) {
      console.error('Error checking verifier status:', error)
      throw error
    }
  },

  async isPaused(): Promise<boolean> {
    try {
      return await publicClient.readContract({
        address: RETRO_GAMING_ADDRESS,
        abi: retroGamingABI,
        functionName: 'paused'
      });
    } catch (error) {
      console.error('Error checking pause status:', error)
      throw error
    }
  },
  
  /**
   * Obtient l'interface d'une mise à niveau compatible
   * @returns Version de l'interface de mise à niveau
   */
  async getUpgradeInterfaceVersion(): Promise<string> {
    try {
      return await publicClient.readContract({
        address: RETRO_GAMING_ADDRESS,
        abi: retroGamingABI,
        functionName: 'UPGRADE_INTERFACE_VERSION'
      });
    } catch (error) {
      console.error('Error getting upgrade interface version:', error)
      throw error
    }
  },
  
  /**
   * Obtient l'adresse du propriétaire actuel du contrat
   * @returns Adresse du propriétaire
   */
  async getOwner(): Promise<Address> {
    try {
      return await publicClient.readContract({
        address: RETRO_GAMING_ADDRESS,
        abi: retroGamingABI,
        functionName: 'owner'
      });
    } catch (error) {
      console.error('Error getting owner address:', error)
      throw error
    }
  },
  
  /**
   * Obtient l'UUID proxiable du contrat
   * @returns UUID proxiable
   */
  async getProxiableUUID(): Promise<`0x${string}`> {
    try {
      return await publicClient.readContract({
        address: RETRO_GAMING_ADDRESS,
        abi: retroGamingABI,
        functionName: 'proxiableUUID'
      });
    } catch (error) {
      console.error('Error getting proxiable UUID:', error)
      throw error
    }
  }
}

export const writeContract = {
 
  async submitScore(params: {
    game: string
    score: bigint
    hash: Hash 
    account: Address
    value: bigint
  }): Promise<Hash> {
    try {
      const walletClient = await getWalletClient()
      const { game, score, hash, account, value } = params

      const tx = await walletClient.writeContract({
        address: RETRO_GAMING_ADDRESS,
        abi: retroGamingABI,
        functionName: 'submitScore',
        args: [game, score, hash],
        account,
        value
      });

      await publicClient.waitForTransactionReceipt({ hash: tx });
      return tx;
    } catch (error) {
      console.error('Error submitting score:', error)
      throw error
    }
  },

  async verifyScoresBatch(params: {
    roundId: bigint, 
    game: string,
    scoreIndexes: bigint[],  
    validations: boolean[],
    account: Address
  }): Promise<Hash> {
    try {
      const { roundId, game, scoreIndexes, validations, account } = params;
      const walletClient = await getWalletClient();

      // Convertir les index en BigInt pour assurer la compatibilité
      const scoreIndexesBigInt = scoreIndexes.map(index => BigInt(index));

      // Vérifier que les tableaux ont la même longueur
      if (scoreIndexesBigInt.length !== validations.length) {
        throw new Error('Score indexes and validations arrays must have the same length');
      }

      const hash = await walletClient.writeContract({
        address: RETRO_GAMING_ADDRESS,
        abi: retroGamingABI,
        functionName: 'verifyScoresBatch',
        args: [game, roundId, scoreIndexesBigInt, validations],
        account
      });

      await publicClient.waitForTransactionReceipt({ hash });
      return hash;
    } catch (error) {
      console.error('Error verifying scores batch:', error);
      throw error;
    }
  },

  async distributeRewards(params: {
    roundId: bigint
    game: string
    account: Address
  }): Promise<Hash> {
    try {
      const walletClient = await getWalletClient()
      const { roundId, game, account } = params

      const tx = await walletClient.writeContract({
        address: RETRO_GAMING_ADDRESS,
        abi: retroGamingABI,
        functionName: 'distributeRewards',
        args: [game, roundId],
        account
      });

      await publicClient.waitForTransactionReceipt({ hash: tx });
      return tx;
    } catch (error) {
      console.error('Error distributing rewards:', error)
      throw error 
    }
  },

  async setGameConfig(params: {
    game: string;
    roundDuration: bigint;
    minStake: bigint;
    platformFee: number;
    verifierFee: number;
    active: boolean;
    maxScorePerGame?: bigint;
    maxScoresPerPlayer?: number;
    account: Address;
  }): Promise<Hash> {
    try {
      const walletClient = await getWalletClient();
      const {
        game,
        roundDuration,
        minStake,
        platformFee,
        verifierFee,
        active,
        maxScorePerGame = BigInt(100),
        maxScoresPerPlayer = 5,
        account,
      } = params;
  
      const tx = await walletClient.writeContract({
        address: RETRO_GAMING_ADDRESS,
        abi: retroGamingABI,
        functionName: 'setGameConfig',
        args: [
          game, 
          roundDuration, 
          minStake, 
          platformFee, 
          verifierFee, 
          maxScorePerGame,
          maxScoresPerPlayer,
          active
        ],
        account,
      });
  
      // Attendre la confirmation de la transaction
      await publicClient.waitForTransactionReceipt({ hash: tx });
  
      return tx;
    } catch (error) {
      console.error('Error setting game config:', error);
      throw error;
    }
  },

  /**
   * Configure complètement un jeu avec tous les paramètres en une seule transaction
   */
  async configureGame(params: {
    game: string;
    roundDuration: bigint;
    minStake: bigint;
    platformFee: number;
    verifierFee: number;
    maxScorePerGame: bigint;
    maxScoresPerPlayer: number;
    active: boolean;
    allowUnverifiedScores: boolean;
    minDistributionDelay: bigint;
    saltKey: Hash;
    maxWinners: number;
    platformFeePercent: number;
    winnerPercentages: number[];
    account: Address;
  }): Promise<Hash> {
    try {
      const walletClient = await getWalletClient();
      const {
        game,
        roundDuration,
        minStake,
        platformFee,
        verifierFee,
        maxScorePerGame,
        maxScoresPerPlayer,
        active,
        allowUnverifiedScores,
        minDistributionDelay,
        saltKey,
        maxWinners,
        platformFeePercent,
        winnerPercentages,
        account,
      } = params;
  
      const tx = await walletClient.writeContract({
        address: RETRO_GAMING_ADDRESS,
        abi: retroGamingABI,
        functionName: 'configureGame',
        args: [
          game, 
          roundDuration, 
          minStake, 
          platformFee, 
          verifierFee, 
          maxScorePerGame,
          maxScoresPerPlayer,
          active,
          allowUnverifiedScores,
          minDistributionDelay,
          saltKey,
          maxWinners,
          platformFeePercent,
          winnerPercentages
        ],
        account,
      });
  
      await publicClient.waitForTransactionReceipt({ hash: tx });
  
      return tx;
    } catch (error) {
      console.error('Error configuring game:', error);
      throw error;
    }
  },

  async setRewardDistribution(params: {
    game: string 
    maxWinners: number
    platformFeePercent: number
    winnerPercentages: number[]
    account: Address
  }): Promise<Hash> {
    try {
      const walletClient = await getWalletClient()
      const { game, maxWinners, platformFeePercent, winnerPercentages, account } = params

      const tx = await walletClient.writeContract({
        address: RETRO_GAMING_ADDRESS,
        abi: retroGamingABI,
        functionName: 'setRewardDistribution',
        args: [game, maxWinners, platformFeePercent, winnerPercentages],
        account
      });

      await publicClient.waitForTransactionReceipt({ hash: tx });
      return tx;
    } catch (error) {
      console.error('Error setting reward distribution:', error)
      throw error
    }
  },

  async updateSaltKey(params: {
    game: string
    newSaltKey: Hash
    account: Address  
  }): Promise<Hash> {
    try {
      const walletClient = await getWalletClient()
      const { game, newSaltKey, account } = params

      const tx = await walletClient.writeContract({
        address: RETRO_GAMING_ADDRESS,
        abi: retroGamingABI,
        functionName: 'updateSaltKey',
        args: [game, newSaltKey],
        account
      });

      await publicClient.waitForTransactionReceipt({ hash: tx });
      return tx;
    } catch (error) {
      console.error('Error updating salt key:', error)
      throw error 
    }
  },

  /**
   * Configure le paramètre permettant d'inclure les scores non vérifiés dans la distribution des récompenses.
   * Si cette option est activée, les scores n'auront pas besoin d'être vérifiés par un vérificateur
   * pour être éligibles aux récompenses.
   */
  async setUnverifiedScoresSetting(params: {
    game: string,
    allowUnverifiedScores: boolean,
    account: Address
  }): Promise<Hash> {
    try {
      const walletClient = await getWalletClient()
      const { game, allowUnverifiedScores, account } = params

      const tx = await walletClient.writeContract({
        address: RETRO_GAMING_ADDRESS,
        abi: retroGamingABI,
        functionName: 'setUnverifiedScoresSetting',
        args: [game, allowUnverifiedScores],
        account
      });

      await publicClient.waitForTransactionReceipt({ hash: tx });
      return tx;
    } catch (error) {
      console.error('Error setting unverified scores setting:', error)
      throw error
    }
  },

  /**
   * Configure le délai minimum après la fin d'un round avant de pouvoir distribuer les récompenses.
   * Ce délai permet de s'assurer que tous les vérificateurs ont eu suffisamment de temps pour
   * vérifier les scores soumis.
   * 
   * @param params - Les paramètres de configuration du délai de distribution
   * @returns Hash de la transaction
   */
  async setDistributionDelay(params: {
    game: string,
    minDistributionDelay: bigint,
    account: Address
  }): Promise<Hash> {
    try {
      const walletClient = await getWalletClient()
      const { game, minDistributionDelay, account } = params

      const tx = await walletClient.writeContract({
        address: RETRO_GAMING_ADDRESS,
        abi: retroGamingABI,
        functionName: 'setDistributionDelay',
        args: [game, minDistributionDelay],
        account
      });

      await publicClient.waitForTransactionReceipt({ hash: tx });
      return tx;
    } catch (error) {
      console.error('Error setting distribution delay:', error)
      throw error
    }
  },

  async withdraw(account: Address): Promise<Hash> {
    try {
      const walletClient = await getWalletClient()
      
      const tx = await walletClient.writeContract({
        address: RETRO_GAMING_ADDRESS,
        abi: retroGamingABI,
        functionName: 'withdraw',
        account
      });

      await publicClient.waitForTransactionReceipt({ hash: tx });
      return tx;
    } catch (error) {
      console.error('Error withdrawing:', error)
      throw error
    }
  },

  async emergencyWithdraw(account: Address): Promise<Hash> {
    try {
      const walletClient = await getWalletClient()
      
      const tx = await walletClient.writeContract({
        address: RETRO_GAMING_ADDRESS,
        abi: retroGamingABI,
        functionName: 'emergencyWithdraw',
        account
      });

      await publicClient.waitForTransactionReceipt({ hash: tx });
      return tx;
    } catch (error) {
      console.error('Error emergency withdrawing:', error)
      throw error
    }
  },

  async addVerifier(params: {
    verifierAddress: Address,
    account: Address
  }): Promise<Hash> {
    try {
      const walletClient = await getWalletClient()
      const { verifierAddress, account } = params
      
      const tx = await walletClient.writeContract({
        address: RETRO_GAMING_ADDRESS,
        abi: retroGamingABI,
        functionName: 'addVerifier',
        args: [verifierAddress],
        account
      });

      await publicClient.waitForTransactionReceipt({ hash: tx });
      return tx;
    } catch (error) {
      console.error('Error adding verifier:', error)
      throw error
    }
  },

  async removeVerifier(params: {
    verifierAddress: Address,
    account: Address
  }): Promise<Hash> {
    try {
      const walletClient = await getWalletClient()
      const { verifierAddress, account } = params
      
      const tx = await walletClient.writeContract({
        address: RETRO_GAMING_ADDRESS,
        abi: retroGamingABI,
        functionName: 'removeVerifier',
        args: [verifierAddress],
        account
      });

      await publicClient.waitForTransactionReceipt({ hash: tx });
      return tx;
    } catch (error) {
      console.error('Error removing verifier:', error)
      throw error
    }
  },

  /**
   * Configure le nombre maximum de scores qu'un joueur peut soumettre dans un seul round.
   * Cela peut être utilisé pour limiter la "domination" d'un seul joueur et encourager
   * la diversité des participants.
   * 
   * @param params - Les paramètres de configuration de la limite de scores par joueur
   * @returns Hash de la transaction
   */
  async setMaxScoresPerPlayer(params: {
    game: string,
    maxScoresPerPlayer: number,
    account: Address
  }): Promise<Hash> {
    try {
      const walletClient = await getWalletClient()
      const { game, maxScoresPerPlayer, account } = params
      
      const tx = await walletClient.writeContract({
        address: RETRO_GAMING_ADDRESS,
        abi: retroGamingABI,
        functionName: 'setMaxScoresPerPlayer',
        args: [game, maxScoresPerPlayer],
        account
      });

      await publicClient.waitForTransactionReceipt({ hash: tx });
      return tx;
    } catch (error) {
      console.error('Error setting max scores per player:', error)
      throw error
    }
  },

  
 /**
 * Crée un nouveau jeu avec une configuration complète.
 * Cette fonction utilise des valeurs par défaut sensées pour les paramètres non spécifiés.
 * 
 * @param params - Les paramètres de base et optionnels pour la création du jeu
 * @returns Hash de la transaction
 */
async createGame(params: {
  game: string,
  roundDuration: bigint,
  minStake: bigint,
  account: Address,
  // Paramètres optionnels avec valeurs par défaut
  platformFee?: number,
  verifierFee?: number,
  maxScorePerGame?: bigint,
  maxScoresPerPlayer?: number,
  active?: boolean,
  allowUnverifiedScores?: boolean,
  minDistributionDelay?: bigint,
  saltKey?: `0x${string}`,
  maxWinners?: number,
  platformFeePercent?: number,
  winnerPercentages?: number[]
}): Promise<Hash> {
  try {
    const walletClient = await getWalletClient();
    const { 
      game, 
      roundDuration, 
      minStake, 
      account,
      // Paramètres optionnels avec valeurs par défaut
      platformFee = 10,                            // 10%
      verifierFee = 5,                            // 5%
      maxScorePerGame = BigInt(100),             // 100 scores max par round
      maxScoresPerPlayer = 5,                    // 5 scores par joueur max
      active = true,                             // Jeu actif par défaut
      allowUnverifiedScores = false,             // Scores vérifiés requis par défaut
      minDistributionDelay = BigInt(86400),      // 24h de délai avant distribution
      saltKey = ('0x' + '0'.repeat(64)) as `0x${string}`,  // Clé salt par défaut correctement typée
      maxWinners = 3,                            // 3 gagnants par défaut
      platformFeePercent = 10,                   // 10% pour la plateforme
      winnerPercentages = [50, 30, 20]           // Distribution 50/30/20 par défaut
    } = params;
    
    // Vérifications préliminaires
    if (platformFee + verifierFee > 100) {
      throw new Error('Total fees cannot exceed 100%');
    }
    
    if (winnerPercentages.reduce((a, b) => a + b, 0) > 100) {
      throw new Error('Total winner percentages cannot exceed 100%');
    }
    
    // Utiliser configureGame au lieu de createGame pour une configuration complète
    const tx = await walletClient.writeContract({
      address: RETRO_GAMING_ADDRESS,
      abi: retroGamingABI,
      functionName: 'configureGame',
      args: [
        game,
        roundDuration,
        minStake,
        platformFee,
        verifierFee,
        maxScorePerGame,
        maxScoresPerPlayer,
        active,
        allowUnverifiedScores,
        minDistributionDelay,
        saltKey,
        maxWinners,
        platformFeePercent,
        winnerPercentages
      ],
      account
    });

    await publicClient.waitForTransactionReceipt({ hash: tx });
    
    // Journalisation du succès
    console.log(`Game "${game}" created successfully with transaction ${tx}`);
    
    return tx;
  } catch (error) {
    console.error('Error creating game:', error);
    throw error;
  }
},

  /**
   * Met en pause le contrat, empêchant certaines opérations d'être effectuées.
   * Seul le propriétaire du contrat peut appeler cette fonction.
   */
  async pause(account: Address): Promise<Hash> {
    try {
      const walletClient = await getWalletClient()
      
      const tx = await walletClient.writeContract({
        address: RETRO_GAMING_ADDRESS,
        abi: retroGamingABI,
        functionName: 'pause',
        account
      });

      await publicClient.waitForTransactionReceipt({ hash: tx });
      return tx;
    } catch (error) {
      console.error('Error pausing contract:', error)
      throw error
    }
  },

  /**
   * Reprend le contrat après une mise en pause.
   * Seul le propriétaire du contrat peut appeler cette fonction.
   */
  async unpause(account: Address): Promise<Hash> {
    try {
      const walletClient = await getWalletClient()
      
      const tx = await walletClient.writeContract({
        address: RETRO_GAMING_ADDRESS,
        abi: retroGamingABI,
        functionName: 'unpause',
        account
      });

      await publicClient.waitForTransactionReceipt({ hash: tx });
      return tx;
    } catch (error) {
      console.error('Error unpausing contract:', error)
      throw error
    }
  },

  /**
   * Initialise le contrat avec un propriétaire initial.
   * Cette fonction ne peut être appelée qu'une seule fois, lors du déploiement du contrat.
   */
  async initialize(initialOwner: Address, account: Address): Promise<Hash> {
    try {
      const walletClient = await getWalletClient()
      
      const tx = await walletClient.writeContract({
        address: RETRO_GAMING_ADDRESS,
        abi: retroGamingABI,
        functionName: 'initialize',
        args: [initialOwner],
        account
      });

      await publicClient.waitForTransactionReceipt({ hash: tx });
      return tx;
    } catch (error) {
      console.error('Error initializing contract:', error)
      throw error
    }
  },

  /**
   * Met à niveau le contrat vers une nouvelle implémentation.
   * Seul le propriétaire du contrat peut appeler cette fonction.
   */
  async upgradeToAndCall(params: {
    newImplementation: Address,
    data: `0x${string}`,
    account: Address
  }): Promise<Hash> {
    try {
      const walletClient = await getWalletClient()
      const { newImplementation, data, account } = params
      
      const tx = await walletClient.writeContract({
        address: RETRO_GAMING_ADDRESS,
        abi: retroGamingABI,
        functionName: 'upgradeToAndCall',
        args: [newImplementation, data],
        account,
        value: BigInt(0)
      });

      await publicClient.waitForTransactionReceipt({ hash: tx });
      return tx;
    } catch (error) {
      console.error('Error upgrading contract:', error)
      throw error
    }
  },

  /**
   * Transfère la propriété du contrat à un nouveau propriétaire.
   * Seul le propriétaire actuel du contrat peut appeler cette fonction.
   */
  async transferOwnership(newOwner: Address, account: Address): Promise<Hash> {
    try {
      const walletClient = await getWalletClient()
      
      const tx = await walletClient.writeContract({
        address: RETRO_GAMING_ADDRESS,
        abi: retroGamingABI,
        functionName: 'transferOwnership',
        args: [newOwner],
        account
      });

      await publicClient.waitForTransactionReceipt({ hash: tx });
      return tx;
    } catch (error) {
      console.error('Error transferring ownership:', error)
      throw error
    }
  },

  /**
   * Renonce à la propriété du contrat.
   * Après avoir appelé cette fonction, le contrat n'aura plus de propriétaire.
   * Seul le propriétaire actuel du contrat peut appeler cette fonction.
   */
  async renounceOwnership(account: Address): Promise<Hash> {
    try {
      const walletClient = await getWalletClient()
      
      const tx = await walletClient.writeContract({
        address: RETRO_GAMING_ADDRESS,
        abi: retroGamingABI,
        functionName: 'renounceOwnership',
        account
      });

      await publicClient.waitForTransactionReceipt({ hash: tx });
      return tx;
    } catch (error) {
      console.error('Error renouncing ownership:', error)
      throw error
    }
  }
}

export const contractActions = {
  read: readContract,
  write: writeContract
}