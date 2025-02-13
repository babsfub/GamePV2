// lib/types.ts
import type { Address } from 'viem'

// Wallet Types
export interface WalletState {
  address: Address | null
  isConnecting: boolean
  isVerifier: boolean
  isAdmin: boolean
  pendingWithdrawals: bigint
  error: string | null
}

// Base Types
export type GameId = 'snake' | 'tetris'

// Contract Types (Smart Contract Level)
export interface ContractScore {
  player: Address
  score: bigint
  blockNumber: bigint
  verified: boolean
  stake: bigint
  scoreHash: `0x${string}`
  verifier: Address
}

export interface ContractRoundBasicInfo {
  startTime: bigint
  endTime: bigint
  totalPrizePool: bigint
  rewardsDistributed: boolean
}

export interface ContractRoundView {
  basic: ContractRoundBasicInfo
  scores: ContractScore[]
  winners: Winner[]
  verifiers: Address[]
  prizePool: bigint
  isActive: boolean
}

// Extended UI/DB Types
export interface Score extends ContractScore {
  transactionHash: `0x${string}`
  level?: bigint
  lines?: number
  moves_count?: number
  moves_hash?: string
}

export interface RoundView extends Omit<ContractRoundView, 'scores'> {
  scores: Score[]
}

// Game Configuration Types
export interface GameConfig {
  roundDuration: bigint        // uint64
  minStake: bigint            // uint64
  platformFee: number         // uint8
  verifierFee: number         // uint8
  maxScorePerGame: bigint     // uint64
  active: boolean             // bool
  saltKey: `0x${string}`      // bytes32
  currentRound: bigint        // uint256
  lastRoundStartTime: bigint  // uint64
  rewardDistribution: RewardDistribution
}

export interface GameMetadata {
  id: GameId
  title: string
  description: string
  path: string
  maxScore: number
  imageUrl: string
  minStake: string
}

// Reward Types
export interface RewardDistribution {
  maxWinners: number
  platformFeePercent: number
  winnerPercentages: readonly number[]
}

export interface Winner {
  winnerAddress: Address
  score: bigint
  reward: bigint
}

// Verification Types
export interface VerifierStats {
  verifiers: Address[]
  actions: bigint[]
  rewards: bigint[]
  isActive: boolean
}

export interface ValidationMetadata {
  transactionHash: `0x${string}`
  verifier: Address
  roundId: bigint
  timestamp: number
  dbHash?: `0x${string}`
  contractHash?: `0x${string}`
  blockNumber?: bigint
}

export interface VerificationDetail {
  type: 'game_hash' | 'transaction' | 'game_state' | 'chain_state'
  success: boolean
  timestamp: number
  details: {
    hash?: `0x${string}`
    score?: bigint
    blockNumber?: bigint
    error?: string
  }
}

export interface ValidationResult {
  isValid: boolean
  score: bigint
  gameId: GameId
  scoreHash: `0x${string}`
  verificationDetails: VerificationDetail[]
  metadata: ValidationMetadata
  timestamp: number
}

export interface VerifiedScore extends Score {
  verificationDetails: VerificationDetail[]
  metadata: ValidationMetadata
  verifiedAt: number
  verifiedBy: Address
  rewards?: {
    amount: bigint
    claimed: boolean
    claimedAt?: number
  }
}

export interface ValidationState {
  currentRound: RoundView | null
  pendingScores: Score[]
  selectedScores: Set<number>
  batchValidation: { [key: number]: boolean }
  verifiedScores: VerifiedScore[]
  error: string | null
  loading: boolean
  verifying: boolean
  metadata: ValidationMetadata | null
  metrics: {
    totalVerified: number
    successRate: number
    averageVerificationTime: number
  }
}

// Game Engine Interface
export interface GameEngine {
  verify_score: (
    scoreHash: `0x${string}`,
    player: Address,
    blockNumber: bigint,
    saltKey: string
  ) => boolean
  
  verify_game_data: (gameState: any) => {
    isValid: boolean
    score: bigint
    details?: {
      moves?: string[]
      timestamps?: number[]
      gameSpecificData?: Record<string, unknown>
    }
  }
}

// Game Specific Types
export interface TetrisState {
  board: number[][]
  score: number | null
  level: number | null
  lines: number | null
  is_game_over: boolean
  is_paused: boolean
  current_piece: TetrisPiece | null
  ghost_piece: TetrisPiece | null
  next_piece: TetrisPiece | null
  hold_piece: TetrisPiece | null
  is_soft_dropping: boolean
  can_hold: boolean
  moves_count: number
  last_update: number
  drop_interval: number
}

interface TetrisPiece {
  piece_type: number
  shape: number[][]
  color: number
  x: number
  y: number
}

// App Types
export interface PageData {
  isAdmin: boolean
  isVerifier: boolean
}

// Toast Types
export type ToastType = 'info' | 'success' | 'error' | 'warning'

export interface Toast {
  id: number
  type: ToastType
  message: string
  timeout?: number
}