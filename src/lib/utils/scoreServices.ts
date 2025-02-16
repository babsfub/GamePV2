// lib/utils/scoreServices.ts
import type { GameId } from '$lib/types.js';
import type { Address, Hash } from 'viem';

export class ScoreService {
  static async submitScore({
    gameState,
    playerAddress,
    score,
    blockNumber,
    stake,
    scoreHash,
    transactionHash,
    contractHash,
    roundId,
    transactionBlockNumber,
    transactionTimestamp
  }: {
    gameState: any,
    playerAddress: Address,
    score: bigint,
    blockNumber: bigint,
    stake: bigint,
    scoreHash: Hash,
    transactionHash: `0x${string}`,
    contractHash?: `0x${string}`,
    roundId: bigint,
    transactionBlockNumber?: bigint,
    transactionTimestamp?: Date
  }) {
    const response = await fetch('/api/games', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        gameState,
        playerAddress,
        score: score.toString(),
        blockNumber: blockNumber.toString(),
        stake: stake.toString(),
        scoreHash,
        transactionHash,
        contractHash,
        roundId: roundId.toString(),
        transactionBlockNumber: transactionBlockNumber?.toString(),
        transactionTimestamp: transactionTimestamp?.toISOString()
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to save game data');
    }

    return response.json();
  }

  static async getScores(gameId: GameId, roundId: string): Promise<any[]> {
    try {
      const params = new URLSearchParams({
        gameId,
        roundId
      });
  
      console.log("Fetching scores:", {
        gameId,
        roundId,
        url: `/api/games?${params.toString()}`
      });
  
      const response = await fetch(`/api/games?${params.toString()}`);
      if (!response.ok) {
        const errorText = await response.text();
        console.error("API Error:", {
          status: response.status,
          statusText: response.statusText,
          errorText
        });
        throw new Error('Network response was not ok');
      }
  
      const data = await response.json();
      console.log("DB Response data:", {
        count: data?.length,
        data
      });
      return data;
    } catch (error) {
      console.error("Error fetching scores:", error);
      throw error;
    }
  }

  static async verifyScores({
    gameId,
    roundId,
    scoreIndexes,
    validations,
    verifierAddress,
    transactionHash,
    contractHash,
    transactionBlockNumber,
    transactionTimestamp
  }: {
    gameId: GameId,
    roundId: bigint,
    scoreIndexes: number[],
    validations: boolean[],
    verifierAddress: Address,
    transactionHash: `0x${string}`,
    contractHash?: `0x${string}`,
    transactionBlockNumber?: bigint,
    transactionTimestamp?: Date
  }) {
    const response = await fetch('/api/games/verify', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        gameId,
        roundId: roundId.toString(),
        scoreIndexes: scoreIndexes.map(String),
        validations,
        verifierAddress,
        transactionHash,
        contractHash,
        transactionBlockNumber: transactionBlockNumber?.toString(),
        transactionTimestamp: transactionTimestamp?.toISOString()
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to verify scores');
    }

    return response.json();
  }
}