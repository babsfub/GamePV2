// src/lib/config/index.ts
export * from './contract.js'
export * from './games.js'

// Constantes globales de l'application
export const APP_CONFIG = {
  name: 'Retro Gaming Platform',
  version: '1.0.0',
  description: 'Play retro games and earn rewards',
  contactEmail: 'contact@retrogaming.com',
  socials: {
    twitter: 'https://twitter.com/retrogaming',
    discord: 'https://discord.gg/retrogaming',
    github: 'https://github.com/retrogaming'
  }
} as const

// Configuration des environnements
export const ENV_CONFIG = {
  isDev: import.meta.env.DEV,
  isProd: import.meta.env.PROD,
  mode: import.meta.env.MODE
} as const

// Types exportés pour l'utilisation dans l'application
export type Game = typeof GAMES[keyof typeof GAMES]
export type GameId = keyof typeof GAMES