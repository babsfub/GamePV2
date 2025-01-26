// src/lib/types/scores.ts
import type { Address } from 'viem';

export interface Score {
  player: Address;
  score: bigint;
  blockNumber: bigint;
  verified: boolean;
  stake: bigint;
  scoreHash: `0x${string}`;
  verifier: Address;
  level?: bigint;
  lines?: number;
  moves_count?: number;
  moves_hash?: string;
}

export interface RoundInfo {
  roundId: bigint;
  startTime: bigint;
  endTime: bigint;
  active: boolean;
  totalPrizePool: bigint;
}

export interface ValidationState {
  [key: number]: boolean;
}