// lib/games/engineFactory.ts
import type { GameEngine, GameEngineMetadata, GameId, GameEngineParams } from '$lib/types.js';
import { GAMES } from '$lib/config/games.js';
import { MinesweeperEngine } from './MineSweeper/pkg/minesweeper.js';
import { TetrisEngine } from './tetris/pkg/tetris_engine.js';

// Séparation de la config technique des jeux des métadonnées marketing
export const GAME_ENGINE_CONFIG: Record<GameId, Omit<GameEngineMetadata, keyof typeof GAMES[GameId]>> = {
  tetris: {
    useStakeInHash: false,
    requiresGameState: true,
    supportsVerification: true,
    engineParams: {
      width: 10,
      height: 20
    }
  },
  snake: {
    useStakeInHash: false,
    requiresGameState: true,
    supportsVerification: true,
    engineParams: {
      width: 20,
      height: 20
    }
  },
  minesweeper: {
    useStakeInHash: true,
    requiresGameState: false,
    supportsVerification: false,
    engineParams: {
      difficulty: 'beginner'
    }
  }
};

export class GameEngineFactory {
  private readonly engineConfig: typeof GAME_ENGINE_CONFIG[GameId];
  private readonly gameMetadata: typeof GAMES[GameId];

  constructor(private readonly gameId: GameId) {
    this.engineConfig = GAME_ENGINE_CONFIG[gameId];
    this.gameMetadata = GAMES[gameId];
  }

  createEngine(params?: GameEngineParams): GameEngine {
    const finalParams = { 
      ...this.engineConfig.engineParams,
      ...params 
    };

    switch (this.gameId) {
      case 'tetris':
        return new TetrisEngine(
          finalParams.width!, 
          finalParams.height!
        );
      case 'minesweeper':
        return new MinesweeperEngine(
          finalParams.stake || BigInt(finalParams.difficulty === 'beginner' ? 1 : 2)
        );
      case 'snake':
        throw new Error('Snake engine not implemented yet');
      default:
        throw new Error(`Unsupported game: ${this.gameId}`);
    }
  }

  getMetadata(): GameEngineMetadata {
    return {
      ...this.gameMetadata,
      ...this.engineConfig
    };
  }

  getDefaultParams(): GameEngineParams {
    return this.engineConfig.engineParams;
  }
}

// Singleton factory pour réutilisation
export const gameEngineFactory = {
  forGame(gameId: GameId): GameEngineFactory {
    return new GameEngineFactory(gameId);
  }
};