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
} from './types.js'

export const readContract = {

  async getCurrentRoundId(): Promise<bigint> {
    try {
      const result = await publicClient.readContract({
        address: RETRO_GAMING_ADDRESS,
        abi: retroGamingABI,
        functionName: 'currentGlobalRoundId'
      })
      return result
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
      })
      return result as GameConfig
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
        args: [roundId, game]
      })
      return {
        basic: result.basic,
        scores: result.scores as Score[],
        winners: result.winners as Winner[],
        verifiers: result.verifiers.slice(),
        prizePool: result.prizePool,
        isActive: result.isActive
      }
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
        args: [roundId, game, verifiedOnly]
      })
      return result as unknown as Scores[]
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
        args: [roundId, game]
      })
      return {
        verifiers: result.verifiers,
        actions: result.actions,
        rewards: result.rewards,
        isActive: 'isActive' in result ? result.isActive : false 
      } as unknown as VerifierStats
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
      })
      return result as bigint
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
      })
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
      })
    } catch (error) {
      console.error('Error checking pause status:', error)
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
      })

      await publicClient.waitForTransactionReceipt({ hash: tx })
      return tx
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

        // Convertir les index en BigInt
        const scoreIndexesBigInt = scoreIndexes.map(index => BigInt(index));

        // Vérifier que les tableaux ont la même longueur
        if (scoreIndexesBigInt.length !== validations.length) {
            throw new Error('Scoreindexes and validations arrays must have the same length');
        }

        const hash = await walletClient.writeContract({
            address: RETRO_GAMING_ADDRESS,
            abi: retroGamingABI,
            functionName: 'verifyScoresBatch',
            args: [roundId, game, scoreIndexesBigInt, validations],
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
        args: [roundId, game],
        account
      })

      await publicClient.waitForTransactionReceipt({ hash: tx })
      return tx
    } catch (error) {
      console.error('Error distributing rewards:', error)
      throw error 
    }
  },

  async setGameConfig(params: {
    game: string
    roundDuration: bigint
    minStake: bigint
    platformFee: number
    verifierFee: number
    active: boolean
    account: Address
  }): Promise<Hash> {
    try {
      const walletClient = await getWalletClient()
      const { game, roundDuration, minStake, platformFee, verifierFee, active, account } = params

      const tx = await walletClient.writeContract({
        address: RETRO_GAMING_ADDRESS,
        abi: retroGamingABI,
        functionName: 'setGameConfig',
        args: [game, roundDuration, minStake, platformFee, verifierFee, active],
        account
      })

      await publicClient.waitForTransactionReceipt({ hash: tx })
      return tx
    } catch (error) {
      console.error('Error setting game config:', error)
      throw error
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
      })

      await publicClient.waitForTransactionReceipt({ hash: tx })
      return tx
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
      })

      await publicClient.waitForTransactionReceipt({ hash: tx })
      return tx
    } catch (error) {
      console.error('Error updating salt key:', error)
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
      })

      await publicClient.waitForTransactionReceipt({ hash: tx })
      return tx
    } catch (error) {
      console.error('Error withdrawing:', error)
      throw error
    }
  }
}

export const contractActions = {
  read: readContract,
  write: writeContract
}