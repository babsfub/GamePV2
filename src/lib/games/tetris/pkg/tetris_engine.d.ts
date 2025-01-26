/* tslint:disable */
/* eslint-disable */
export class GameConfig {
  private constructor();
  free(): void;
}
export class GameMove {
  private constructor();
  free(): void;
}
export class GameProof {
  private constructor();
  free(): void;
}
export class GameState {
  private constructor();
  free(): void;
}
export class TetrisEngine {
  free(): void;
  constructor(width: number, height: number);
  get_state(): any;
  start_soft_drop(): void;
  end_soft_drop(): void;
  update(timestamp: number): boolean;
  move_piece(direction: number): boolean;
  rotate(): boolean;
  get_score_hash(player_address: string, salt_key: string, block_number: bigint): Uint8Array;
  verify_score(hash: Uint8Array, player_address: string, block_number: bigint, salt_key: string): boolean;
  hard_drop(): boolean;
  hold(): boolean;
  toggle_pause(): void;
  start(): void;
}

export type InitInput = RequestInfo | URL | Response | BufferSource | WebAssembly.Module;

export interface InitOutput {
  readonly memory: WebAssembly.Memory;
  readonly __wbg_gameconfig_free: (a: number, b: number) => void;
  readonly __wbg_gamemove_free: (a: number, b: number) => void;
  readonly __wbg_gameproof_free: (a: number, b: number) => void;
  readonly __wbg_gamestate_free: (a: number, b: number) => void;
  readonly __wbg_tetrisengine_free: (a: number, b: number) => void;
  readonly tetrisengine_new: (a: number, b: number) => number;
  readonly tetrisengine_get_state: (a: number) => [number, number, number];
  readonly tetrisengine_start_soft_drop: (a: number) => void;
  readonly tetrisengine_end_soft_drop: (a: number) => void;
  readonly tetrisengine_update: (a: number, b: number) => number;
  readonly tetrisengine_move_piece: (a: number, b: number) => number;
  readonly tetrisengine_rotate: (a: number) => number;
  readonly tetrisengine_get_score_hash: (a: number, b: number, c: number, d: number, e: number, f: bigint) => [number, number];
  readonly tetrisengine_verify_score: (a: number, b: number, c: number, d: number, e: number, f: bigint, g: number, h: number) => number;
  readonly tetrisengine_hard_drop: (a: number) => number;
  readonly tetrisengine_hold: (a: number) => number;
  readonly tetrisengine_toggle_pause: (a: number) => void;
  readonly tetrisengine_start: (a: number) => void;
  readonly __wbindgen_malloc: (a: number, b: number) => number;
  readonly __wbindgen_realloc: (a: number, b: number, c: number, d: number) => number;
  readonly __wbindgen_exn_store: (a: number) => void;
  readonly __externref_table_alloc: () => number;
  readonly __wbindgen_export_4: WebAssembly.Table;
  readonly __wbindgen_free: (a: number, b: number, c: number) => void;
  readonly __externref_table_dealloc: (a: number) => void;
  readonly __wbindgen_start: () => void;
}

export type SyncInitInput = BufferSource | WebAssembly.Module;
/**
* Instantiates the given `module`, which can either be bytes or
* a precompiled `WebAssembly.Module`.
*
* @param {{ module: SyncInitInput }} module - Passing `SyncInitInput` directly is deprecated.
*
* @returns {InitOutput}
*/
export function initSync(module: { module: SyncInitInput } | SyncInitInput): InitOutput;

/**
* If `module_or_path` is {RequestInfo} or {URL}, makes a request and
* for everything else, calls `WebAssembly.instantiate` directly.
*
* @param {{ module_or_path: InitInput | Promise<InitInput> }} module_or_path - Passing `InitInput` directly is deprecated.
*
* @returns {Promise<InitOutput>}
*/
export default function __wbg_init (module_or_path?: { module_or_path: InitInput | Promise<InitInput> } | InitInput | Promise<InitInput>): Promise<InitOutput>;
