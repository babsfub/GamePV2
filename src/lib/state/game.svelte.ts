// lib/state/game.svelte.ts
import { setContext, getContext } from 'svelte';
import type { GameId, GameConfig, Score, RoundView, TetrisState } from '$lib/types.js';

const GAME_STATE_KEY = Symbol('game-state');

export class GameState {
  configs = $state<Record<GameId, GameConfig | null>>({
    snake: null,
    tetris: null
  });

  currentRounds = $state<Record<GameId, RoundView | null>>({
    snake: null,
    tetris: null
  });

  scores = $state<Record<GameId, Score[]>>({
    snake: [],
    tetris: []
  });

  platformFees = $state<Record<GameId, number>>({
    snake: 0,
    tetris: 0
  });

  verifierFees = $state<Record<GameId, number>>({
    snake: 0,
    tetris: 0
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

  // États dérivés pour le tetris
  tetrisScores = $derived({
    score: this.tetrisState.score ?? 0,
    level: this.tetrisState.level ?? 1,
    lines: this.tetrisState.lines ?? 0,
    isGameOver: this.tetrisState.is_game_over
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
    return this.gameMetrics[gameId];
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