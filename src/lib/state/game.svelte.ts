// lib/state/game.svelte.ts
import { setContext, getContext } from 'svelte';
import type { GameId, GameConfig, Score, RoundView, TetrisState } from '$lib/types.js';

// Définir le type SnakeState qui est manquant
interface SnakeState {
  board: any[][];
  score: number;
  level: number;
  apples_eaten: number;
  is_game_over: boolean;
  is_paused: boolean;
  snake: Array<{x: number, y: number}>;
  direction: string;
  apple_position: {x: number, y: number} | null;
  moves_count: number;
  last_update: number;
}

const GAME_STATE_KEY = Symbol('game-state');

export class GameState {
  configs = $state<Record<GameId, GameConfig | null>>({
    snake: null,
    tetris: null,
    minesweeper: null
  });

  currentRounds = $state<Record<GameId, RoundView | null>>({
    snake: null,
    tetris: null,
    minesweeper: null
  });

  scores = $state<Record<GameId, Score[]>>({
    snake: [],
    tetris: [],
    minesweeper: []
  });

  platformFees = $state<Record<GameId, number>>({
    snake: 0,
    tetris: 0,
    minesweeper: 0
  });

  verifierFees = $state<Record<GameId, number>>({
    snake: 0,
    tetris: 0,
    minesweeper: 0
  });

  // États dérivés
  activeGames = $derived(
    Object.entries(this.configs)
      .filter(([_, config]) => config?.active)
      .map(([id]) => id as GameId)
  );

  isGameActive(gameId: GameId): boolean {
    return !!this.configs[gameId]?.active;
  }

  totalPrizePool = $derived(
    Object.values(this.currentRounds)
      .reduce((total, round) => total + (round?.prizePool ?? 0n), 0n)
  );

  totalPlayers = $derived(
    Object.values(this.currentRounds).reduce((total, round) => {
      if (!round) return total;
      const uniquePlayers = new Set(round.scores.map(s => s.player));
      return total + uniquePlayers.size;
    }, 0)
  );

  // Métriques des jeux
  gameMetrics = $derived({
    snake: this.getMetricsForGame('snake'),
    tetris: this.getMetricsForGame('tetris')
  });

  private getMetricsForGame(gameId: GameId) {
    const config = this.configs[gameId];
    const round = this.currentRounds[gameId];

    return {
      isActive: config?.active ?? false,
      prizePool: round?.prizePool ?? 0n,
      playerCount: round ? new Set(round.scores.map(s => s.player)).size : 0,
      minStake: config?.minStake ?? 0n,
      platformFee: this.platformFees[gameId],
      verifierFee: this.verifierFees[gameId]
    };
  }

  tetrisState = $state<TetrisState>({
    board: [], 
    score: 0,
    level: 1,
    lines: 0,
    is_game_over: false,
    is_paused: false,
    current_piece: null,
    ghost_piece: null,
    next_piece: null,
    hold_piece: null,
    is_soft_dropping: false,
    can_hold: true,
    moves_count: 0,
    last_update: 0,
    drop_interval: 0
  });

  // Nouvel état pour Snake
  snakeState = $state<SnakeState>({
    board: [],
    score: 0,
    level: 1,
    apples_eaten: 0,
    is_game_over: false,
    is_paused: false,
    snake: [],
    direction: 'right',
    apple_position: null,
    moves_count: 0,
    last_update: 0
  });

  // États dérivés pour le tetris
  tetrisScores = $derived({
    score: this.tetrisState.score ?? 0,
    level: this.tetrisState.level ?? 1,
    lines: this.tetrisState.lines ?? 0,
    isGameOver: this.tetrisState.is_game_over
  });

  // États dérivés pour le snake
  snakeScores = $derived({
    score: this.snakeState.score ?? 0,
    level: this.snakeState.level ?? 1,
    apples: this.snakeState.apples_eaten ?? 0,
    isGameOver: this.snakeState.is_game_over
  });

  // Méthodes pour mettre à jour le state tetris
  updateTetrisState(state: Partial<TetrisState>) {
    this.tetrisState = {
      ...this.tetrisState,
      ...state
    };
  }

  updateTetrisScore(score: number) {
    this.tetrisState.score = score;
  }

  updateTetrisLevel(level: number) {
    this.tetrisState.level = level;
  }

  updateTetrisLines(lines: number) {
    this.tetrisState.lines = lines;
  }

  setTetrisGameOver(isGameOver: boolean) {
    this.tetrisState.is_game_over = isGameOver;
  }

  resetTetrisState() {
    this.tetrisState = {
      board: [],
      score: 0,
      level: 1,
      lines: 0,
      is_game_over: false,
      is_paused: false,
      current_piece: null,
      ghost_piece: null,
      next_piece: null,
      hold_piece: null,
      is_soft_dropping: false,
      can_hold: true,
      moves_count: 0,
      last_update: 0,
      drop_interval: 0
    };
  }

  // Méthodes pour mettre à jour le state snake
  updateSnakeState(state: Partial<SnakeState>) {
    this.snakeState = {
      ...this.snakeState,
      ...state
    };
  }

  updateSnakeScore(score: number) {
    this.snakeState.score = score;
  }

  updateSnakeLevel(level: number) {
    this.snakeState.level = level;
  }

  updateSnakeApples(apples: number) {
    this.snakeState.apples_eaten = apples;
  }

  setSnakeGameOver(isGameOver: boolean) {
    this.snakeState.is_game_over = isGameOver;
  }

  resetSnakeState() {
    this.snakeState = {
      board: [],
      score: 0,
      level: 1,
      apples_eaten: 0,
      is_game_over: false,
      is_paused: false,
      snake: [],
      direction: 'right',
      apple_position: null,
      moves_count: 0,
      last_update: 0
    };
  }

  // Méthodes
  setConfig(gameId: GameId, config: GameConfig | null) {
    this.configs[gameId] = config;
  }

  setRound(gameId: GameId, round: RoundView | null) {
    this.currentRounds[gameId] = round;
  }

  updateScores(gameId: GameId, scores: Score[]) {
    this.scores[gameId] = scores;
  }

  setGameFees(gameId: GameId, platformFee: number, verifierFee: number) {
    this.platformFees[gameId] = platformFee;
    this.verifierFees[gameId] = verifierFee;
  }

  updateGameConfig(gameId: GameId, config: GameConfig) {
    this.configs[gameId] = config;
    this.platformFees[gameId] = config.platformFee;
    this.verifierFees[gameId] = config.verifierFee;
  }

  getGameFees(gameId: GameId) {
    return {
      platformFee: this.platformFees[gameId],
      verifierFee: this.verifierFees[gameId]
    };
  }
  
  getGameMetrics(gameId: GameId) {
    // Maintenant gameMetrics est un objet dérivé, pas une fonction
    return this.gameMetrics[gameId as keyof typeof this.gameMetrics];
  }
}

export function createGameState() {
  const state = new GameState();
  setContext(GAME_STATE_KEY, state);
  return state;
}

export function getGameState(): GameState {
  const state = getContext<GameState>(GAME_STATE_KEY);
  if (!state) throw new Error('GameState not found in context');
  return state;
}