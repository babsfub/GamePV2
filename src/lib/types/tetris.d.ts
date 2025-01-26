export interface TetrisState {
  board: number[][];
  score: number;
  level: number;
  lines: number;
  is_paused: boolean;
  is_game_over: boolean;
  current_piece?: {
      x: number;
      y: number;
      shape: number[][];
      piece_type: number;
  };
  ghost_piece?: {
      x: number;
      y: number;
      shape: number[][];
      piece_type: number;
  };
}

// Utilitaire de vérification du state
export function isValidGameState(state: TetrisState | null): state is TetrisState {
  return state !== null && 
         Array.isArray(state.board) && 
         typeof state.score === 'number' &&
         typeof state.level === 'number' &&
         typeof state.lines === 'number';
}