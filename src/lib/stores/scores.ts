//lib/stores/scores.ts
import { writable } from 'svelte/store'

export interface GameScore {
  address: string
  score: number
  timestamp: number
  game: 'snake' | 'tetris'
}

export const currentScores = writable<GameScore[]>([])
export const gamePool = writable<bigint>(0n)