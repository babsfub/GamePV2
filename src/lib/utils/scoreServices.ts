// lib/utils/scoreServices.ts
import type { GameId } from '$lib/types.js';
import type { Address, Hash } from 'viem';

export class ScoreService {
  private static convertBigIntToString(obj: any): any {
    if (typeof obj === 'bigint') {
      return obj.toString();
    }
    
    if (Array.isArray(obj)) {
      return obj.map(item => this.convertBigIntToString(item));
    }
    
    if (obj !== null && typeof obj === 'object') {
      const result: { [key: string]: any } = {};
      for (const key in obj) {
        result[key] = this.convertBigIntToString(obj[key]);
      }
      return result;
    }
    
    return obj;
  }

  static async submitScore({
    gameId,
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
    gameId: GameId,
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
    // Créer un objet avec les BigInt convertis en string
    const data: { [key: string]: any } = {
      gameId,
      gameState: this.convertBigIntToString(gameState), // Conversion récursive
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
    };

    // Nettoyage des undefined
    Object.keys(data).forEach(key => {
      if (data[key] === undefined) {
        delete data[key];
      }
    });

    console.log('Prepared data for submission:', data); // Ajout d'un log pour debug

    const response = await fetch('/api/games', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data)
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