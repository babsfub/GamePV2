// src/lib/server/db/gamesData.ts
import { eq, and, gt, lt } from 'drizzle-orm';
import { db } from './index.js';
import { tetrisGames, type NewTetrisGame } from './schema.js';
import type { Address, Hash } from 'viem';

export class GameDataManager {
  static async saveTetrisGame({
    playerAddress,
    score,
    blockNumber,
    stake,
    scoreHash,
    gameState,
    roundId,
    transactionHash
  }: {
    playerAddress: Address;
    score: bigint;
    blockNumber: bigint;
    stake: bigint;
    scoreHash: Hash;
    gameState: string;
    roundId: bigint;
    transactionHash: Hash;
  }) {
    const newGame: NewTetrisGame = {
      player_address: playerAddress,
      score: Number(score),              
      block_number: Number(blockNumber), 
      stake: Number(stake),              
      score_hash: scoreHash,
      game_state: gameState,
      round_id: Number(roundId),         
      transaction_hash: transactionHash,
      verified: false,
      expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
    };

    return await db.insert(tetrisGames).values(newGame);
  }

  static async getGameByScoreHash(scoreHash: Hash) {
    return await db.query.tetrisGames.findFirst({
      where: eq(tetrisGames.score_hash, scoreHash)
    });
  }

  

  static async getPlayerGames(playerAddress: Address) {
    const now = new Date()
    return await db.query.tetrisGames.findMany({
      where: and(
        eq(tetrisGames.player_address, playerAddress),
        gt(tetrisGames.expires_at, now)
      ),
      orderBy: (games: any) => [games.createdAt, 'desc']
    })
  }

  static async getRoundGames(roundId: bigint) {
    const now = new Date()
    return await db.query.tetrisGames.findMany({
      where: and(
        eq(tetrisGames.round_id, Number(roundId)),
        gt(tetrisGames.expires_at, now)
      ),
      orderBy: (games: any) => [games.score, 'desc']
    })
  }

  static async cleanExpiredGames() {
    const now = new Date()
    return await db.delete(tetrisGames)
      .where(lt(tetrisGames.expires_at, now))
  }

  static async updateGameVerification(scoreHash: Hash, verifierAddress: Address) {
    return await db.update(tetrisGames)
      .set({ verified: true, verifier_address: verifierAddress })
      .where(eq(tetrisGames.score_hash, scoreHash))
  }
}