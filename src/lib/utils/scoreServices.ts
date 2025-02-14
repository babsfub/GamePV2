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
    transactionHash: Hash,
    contractHash?: Hash,
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

  static async getScores(gameId: GameId, roundId?: string) {
    try {
        const params = new URLSearchParams();
        params.append('gameId', gameId);
        if (roundId) params.append('roundId', roundId);

        console.log('Fetching scores with params:', params.toString()); // Pour debug

        const response = await fetch(`/api/games?${params}`);
        
        if (!response.ok) {
            const error = await response.text();
            throw new Error(`Failed to fetch scores: ${error}`);
        }

        const data = await response.json();
        return data;
    } catch (error) {
        console.error('ScoreService error:', error);
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
    transactionHash: Hash,
    contractHash?: Hash,
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