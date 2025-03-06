import type { GameMetadata } from '$lib/types.js';

interface DifficultyLevel {
  name: string;
  minStake: string;
  description: string;
  color: string;
  boardSize: {
    width: number;
    height: number;
  };
  mines: number;
}

export const DIFFICULTY_LEVELS: Record<string, DifficultyLevel> = {
  beginner: {
    name: 'Beginner',
    minStake: '0.01',
    description: '9x9 board, 10 mines',
    color: 'from-green-500 to-emerald-600',
    boardSize: {
      width: 9,
      height: 9
    },
    mines: 10
  },
  intermediate: {
    name: 'Intermediate',
    minStake: '0.05',
    description: '16x16 board, 40 mines',
    color: 'from-blue-500 to-indigo-600',
    boardSize: {
      width: 16,
      height: 16
    },
    mines: 40
  },
  expert: {
    name: 'Expert',
    minStake: '0.1',
    description: '16x30 board, 99 mines',
    color: 'from-purple-500 to-pink-600',
    boardSize: {
      width: 30,
      height: 16
    },
    mines: 99
  }
} as const;

export const MINESWEEPER_METADATA: GameMetadata = {
  id: 'minesweeper',
  title: 'Minesweeper',
  description: 'Classic puzzle game with mines and flags',
  path: '/games/minesweeper',
  maxScore: 10000,
  imageUrl: '/images/games/minesweeper.webp',
  minStake: DIFFICULTY_LEVELS.beginner.minStake,
  gradient: 'from-blue-500 to-indigo-600',
  difficulty: 'Variable',
  features: [
    'Multiple difficulty levels',
    'Stake-based gameplay',
    'Time bonus scoring',
    'Chain reveal bonus'
  ],
  descriptionLong: `
    A Web3 version of the classic Minesweeper puzzle game. 
    Choose your difficulty level, with higher stakes required for more challenging boards.
    Earn points through quick reveals and chaining multiple safe cells.
    Victory rewards are based on your chosen difficulty level and completion speed.
  `
};

export const MINESWEEPER_COLORS = {
  numbers: [
    '#0000FF', // 1: Blue
    '#008000', // 2: Green
    '#FF0000', // 3: Red
    '#000080', // 4: Navy
    '#800000', // 5: Maroon
    '#008080', // 6: Teal
    '#000000', // 7: Black
    '#808080'  // 8: Gray
  ],
  mine: '#FF0000',
  flag: '#FF0000',
  revealed: '#E5E7EB',
  hidden: '#9CA3AF',
  hover: '#4B5563'
};

export const GAME_CONFIG = {
  BASE_POINTS: 100,
  TIME_BONUS_MULTIPLIER: 0.5,
  CONSECUTIVE_REVEAL_BONUS: 10,
  DEFAULT_CELL_SIZE: 32,
  ANIMATION_DURATION: 300,
  REVEAL_DELAY: 50
};

export const MINESWEEPER_EVENTS = {
  CELL_CLICK: 'cell:click',
  CELL_FLAG: 'cell:flag',
  GAME_OVER: 'game:over',
  GAME_WIN: 'game:win',
  SCORE_UPDATE: 'score:update'
} as const;
