// src/lib/config/games.ts
import type { GameMetadata } from '$lib/types.js';
import { DIFFICULTY_LEVELS } from '$lib/components/games/MineSweeper/constants.js';

export const GAMES = {
  snake: {
    id: 'snake',
    title: 'Snake Evolution',
    description: 'Classic snake game reimagined for Web3 - Navigate, grow, and compete for rewards',
    features: [
      'Progressive difficulty levels',
      'Power-up system',
      'Real-time score tracking',
      'Global leaderboard'
    ],
    path: '/games/snake',
    maxScore: 1000000,
    imageUrl: '/screenshots/snake.png',
    minStake: '0.01',
    gradient: 'from-emerald-400 to-cyan-500',
    difficulty: 'Beginner-Friendly'
  },
  tetris: {
    id: 'tetris',
    title: 'Speed Blocks',
    description: 'Strategic block-stacking puzzle game with a competitive twist',
    descriptionLong: `
      Master the art of block-stacking in this innovative remake of the classic puzzle game:
      • Stack blocks strategically to clear lines
      • Score multipliers for combo moves
      • Compete in daily tournaments
      • Earn rewards for your skills
      Fast-paced action meets strategic thinking in this Web3 reimagining.
    `,
    imageUrl: '/SpeedBlock.png',
    minStake: '0.01',
    gradient: 'from-purple-500 to-pink-500',
    difficulty: 'Intermediate',
    path: '/games/tetris',
    maxScore: 500000
  },
  minesweeper: {
    id: 'minesweeper',
    title: 'Crypto Mines',
    description: 'Strategic mine-clearing puzzle with variable difficulty levels and rewards',
    descriptionLong: `
      Challenge yourself in this Web3 adaptation of the classic Minesweeper:
      • Three difficulty levels with increasing rewards
      • Real-time scoring with time bonuses
      • Chain reveal multipliers
      • Strategic flag placement
      • Competitive tournaments
      Choose your risk level and compete for bigger rewards as you master each difficulty.
    `,
    features: [
      'Multiple difficulty levels',
      'Progressive rewards',
      'Time-based bonuses',
      'Chain reveal multipliers'
    ],
    path: '/games/minesweeper',
    maxScore: 1000000,
    imageUrl: '/images/games/minesweeper.png',
    minStake: DIFFICULTY_LEVELS.beginner.minStake,
    gradient: 'from-blue-500 to-indigo-600',
    difficulty: 'Variable'
  }
} as const satisfies Record<string, GameMetadata>;

export const SUPPORTED_GAME_IDS = Object.keys(GAMES) as (keyof typeof GAMES)[];

export const GAME_DEFAULTS = {
  // Game Configuration
  roundDuration: 86400n, // 24 hours in seconds
  minStake: '0.5',      // Minimum stake in SOL
  maxScorePerGame: 100n, // Maximum scores per game
  platformFee: 10n,      // Platform fee percentage

  // Tournament Structure
  rewardDistribution: {
    maxWinners: 10,       // Maximum number of winners per round
    platformFeePercent: 10, // Platform fee percentage
    winnerPercentages: [   // Prize distribution for top players
      50, // 1st place: 50%
      25, // 2nd place: 25%
      15, // 3rd place: 15%
      5,  // 4th place: 5%
      5   // 5th place: 5%
    ]
  },

  // UI Configuration
  refreshInterval: 60000, // State refresh interval in ms
  animationDuration: 300, // Default animation duration in ms
  
  // Game Mechanics
  scoreMultiplier: 1.5,   // Base score multiplier
  difficultyIncrease: 1.2 // Difficulty increase factor per level
} as const;

// Marketing copy for different sections
export const GAME_MARKETING = {
  hero: {
    title: "Play, Compete, Earn",
    subtitle: "Classic Arcade Games Reimagined for Web3",
    description: "Experience your favorite arcade classics with a competitive twist. Play for free, compete for high scores, and earn real rewards!"
  },
  features: {
    title: "Why Play With Us?",
    items: [
      {
        title: "Free to Play",
        description: "Start playing immediately with no entry fees. Choose when to compete for rewards."
      },
      {
        title: "Fair Competition",
        description: "24-hour tournaments with transparent scoring and verified results."
      },
      {
        title: "Real Rewards",
        description: "Top players share prize pools with guaranteed payouts."
      },
      {
        title: "Secure Platform",
        description: "Blockchain-powered security for all transactions and rewards."
      }
    ]
  },
  howToPlay: {
    title: "Getting Started",
    steps: [
      "Connect your wallet to start",
      "Choose your favorite game",
      "Practice for free anytime",
      "Join tournaments to compete for rewards"
    ]
  }
} as const;