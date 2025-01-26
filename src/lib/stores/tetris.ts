// src/lib/stores/tetris.ts
import { writable } from 'svelte/store';

export const gameState = writable({
  score: 0,
  level: 1,
  lines: 0,
  isGameOver: false
});