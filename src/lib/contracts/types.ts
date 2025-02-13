//$lib/contracts/types.ts-->
import type { Address } from 'viem'

export interface Score {
  player: Address
  score: bigint
  blockNumber: bigint
  verified: boolean
  stake: bigint
  scoreHash: `0x${string}`
  verifier: Address
  level?: bigint        
  lines?: number        
  moves_count?: number  
  moves_hash?: string   
}

export interface GameConfig {
  roundDuration: bigint
  minStake: bigint
  platformFee: number
  verifierFee: number
  maxScorePerGame: bigint
  active: boolean
  saltKey: `0x${string}`
  currentRound: bigint
  lastRoundStartTime: bigint
  rewardDistribution: RewardDistribution
}

export interface RoundBasicInfo {
  roundId : bigint
  startTime: bigint
  endTime: bigint
  totalPrizePool: bigint
  rewardsDistributed: boolean
}

export interface RoundView {
  basic: RoundBasicInfo
  scores: Score[]
  winners: Winner[]
  verifiers: Address[]
  prizePool: bigint
  isActive: boolean
}

export interface Winner {
  winnerAddress: Address
  score: bigint
  reward: bigint
}

export interface RewardDistribution {
  maxWinners: number
  platformFeePercent: number
  winnerPercentages: readonly number[]
}

export interface ContractReturnTypes {
  GameConfig: {
    roundDuration: bigint
    minStake: bigint
    platformFee: number
    verifierFee: number
    maxScorePerGame: bigint
    active: boolean
    saltKey: `0x${string}`
    currentRound: bigint
    lastRoundStartTime: bigint
    rewardDistribution: RewardDistribution
  }
  RoundView: RoundView
}

export interface GameRoundData {
  basic: RoundBasicInfo
  verifiersCount: bigint
}

export interface VerifierStats {
  actions: bigint
  rewards: bigint
  isActive: boolean
}

export interface TransactionParams {
  account: Address
  value?: bigint
}

export interface Scores {
  player: string;          
  score: bigint;           
  blockNumber: bigint;     
  verified: boolean;       
  stake: number;           
  scoreHash: string;       
  verifier: string;        
};

export type GameId = 'snake' | 'tetris';