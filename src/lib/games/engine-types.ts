// lib/games/engine-types.ts
import type { GameMetadata, GameId } from '$lib/types.js';

export interface GameEngineParams {
  width?: number;
  height?: number;
  stake?: bigint;
  difficulty?: string;
  seed?: string;
}

export interface GameEngineMetadata extends GameMetadata {
  useStakeInHash: boolean;
  requiresGameState: boolean;
  supportsVerification: boolean;
  defaultParams: GameEngineParams;
}