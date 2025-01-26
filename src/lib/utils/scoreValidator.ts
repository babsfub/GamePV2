// src/lib/utils/scoreValidator.ts
import { TetrisEngine } from '$lib/games/tetris/pkg/tetris_engine.js';
import type { Score } from '$lib/types/scores.js';

export class ScoreValidator {
  static async verifyScore(score: Score, saltKey: `0x${string}`) {
    try {
      const engine = new TetrisEngine(10, 20);
      
      const storedHashHex = score.scoreHash.slice(2);
      const storedHashBytes = new Uint8Array(
        (storedHashHex.match(/.{1,2}/g) || []).map(byte => parseInt(byte, 16))
      );

      const isValid = engine.verify_score(
        storedHashBytes,
        score.player,
        score.blockNumber,
        saltKey
      );

      engine.free();
      return isValid;
    } catch (error) {
      console.error('Validation error:', error);
      return false;
    }
  }
}