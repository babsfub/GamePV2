// src/lib/config/games.ts
export const GAMES = {
    snake: {
      id: 'snake',
      title: 'Snake',
      description: 'Classic snake game - Eat apples and grow longer',
      path: '/games/snake',
      maxScore: 1000000,
      imageUrl: '/images/games/snake.png',
      minStake: '0.01'
    },
    tetris: {
      id: 'tetris',
      title: 'Speed blocks',
      description: 'remake of the famous block-stacking puzzle game',
      path: '/games/tetris',
      maxScore: 1000000,
      imageUrl: '/images/games/tetris.png',
      minStake: '0.01'
    }
  } as const
  
  export const SUPPORTED_GAME_IDS = Object.keys(GAMES) as (keyof typeof GAMES)[]
  
  export const GAME_DEFAULTS = {
    roundDuration: 172800n, // 48 heures
    minStake: '0.01',      // 0.01 ETH
    maxScorePerGame: 100n, // 100 scores max par jeu
    platformFee: 30n       // 30% de frais
  } as const