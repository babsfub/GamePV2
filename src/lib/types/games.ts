// src/lib/types/games.ts
export type GameId = string;

// Définition d'un score en jeu spécifique
export interface GameState {
  score: number;
  level: number;
  lines: number;
  movesCount: number;
  movesHash: string;
}

// Information statique sur un jeu
export interface GameInfo {
  id: GameId;
  title: string;
  description: string;
  path: string;
  gradient: string;
  imagePath: string;
  maxScore: number;
  // Ajout de paramètres spécifiques au jeu
  gameParams: {
    minLevel?: number;
    maxLevel?: number;
    initialSpeed?: number;
    maxMoves?: number;
  };
  // Validation spécifique au jeu
  validation?: {
    minMoves?: number;
    maxTimePerMove?: number;
    requiredPatterns?: string[];
  };
}

// État d'un round pour un jeu
export interface RoundInfo {
  roundId: bigint;
  startTime: bigint;
  endTime: bigint;
  totalPrizePool: bigint;
  rewardsDistributed: boolean;
  active: boolean;
  // Stats du round
  stats?: {
    totalPlayers: number;
    averageScore: number;
    highestScore: bigint;
  };
}

// Score soumis par un joueur
export interface ScoreRecord {
  id: string;
  gameId: GameId;
  roundId: bigint;
  player: string;
  score: bigint;
  scoreHash: string;
  blockNumber: bigint;
  timestamp: number;
  gameState: GameState;
  stake: bigint;
  verified: boolean;
  validationStatus: 'pending' | 'valid' | 'invalid';
  validatedAt?: number;
  validatedBy?: string;
}

// Configuration des jeux disponibles
export const AVAILABLE_GAMES: Record<GameId, GameInfo> = {
  'snake': {
    id: 'snake',
    title: 'Snake',
    description: 'Race against time and collect power-ups in this modern twist on the classic.',
    path: '/games/snake',
    gradient: 'from-emerald-400 to-cyan-500',
    imagePath: '/images/games/snake.webp',
    maxScore: 100,
    gameParams: {
      minLevel: 1,
      maxLevel: 10,
      initialSpeed: 1,
      maxMoves: 1000
    },
    validation: {
      minMoves: 10,
      maxTimePerMove: 500,
      requiredPatterns: ['food', 'movement']
    }
  },
  'tetris': {
    id: 'tetris',
    title: 'Tetris',
    description: 'Stack blocks strategically in this enhanced version with special pieces.',
    path: '/games/tetris',
    gradient: 'from-purple-500 to-pink-500',
    imagePath: '/images/games/tetris.webp',
    maxScore: 200,
    gameParams: {
      minLevel: 1,
      maxLevel: 15,
      initialSpeed: 1.0,
      maxMoves: 500
    },
    validation: {
      minMoves: 5,
      maxTimePerMove: 1000,
      requiredPatterns: ['line-clear', 'rotation']
    }
  }
} as const;

// Liste des IDs de jeux pour iteration
export const GAME_IDS = Object.keys(AVAILABLE_GAMES) as GameId[];

// Type union pour la compatibilité
export type Game = keyof typeof AVAILABLE_GAMES;

// Utilitaires pour la validation
export const getGameInfo = (gameId: GameId): GameInfo | undefined => 
  AVAILABLE_GAMES[gameId];

export const isValidGame = (gameId: unknown): gameId is GameId => 
  typeof gameId === 'string' && gameId in AVAILABLE_GAMES;

export const validateGameState = (gameId: GameId, state: GameState): boolean => {
  const game = AVAILABLE_GAMES[gameId];
  if (!game) return false;

  const { validation, gameParams } = game;
  if (!validation || !gameParams) return true;

  return (
    state.movesCount >= (validation.minMoves ?? 0) &&
    state.movesCount <= (gameParams.maxMoves ?? Infinity) &&
    state.level >= (gameParams.minLevel ?? 1) &&
    state.level <= (gameParams.maxLevel ?? Infinity)
  );
};