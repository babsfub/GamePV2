/* tslint:disable */
/* eslint-disable */
export class JsVerificationResult {
  private constructor();
  free(): void;
  readonly valid: boolean;
  readonly error: string | undefined;
  readonly final_score: number;
}
export class SnakeEngine {
  free(): void;
  constructor(width: number, height: number);
  start(): void;
  toggle_pause(): void;
  update(timestamp: number): boolean;
  change_direction(direction: string): boolean;
  get_state(): any;
  get_score_hash_hex(player_address: string, salt_key: string, block_number: bigint): string;
  verify_score_hex(stored_hash_hex: string, player_address: string, block_number: bigint, salt_key: string): boolean;
  export_game_data_str(player_address: string, salt_key: string, block_number: bigint): string;
  verify_game_data(verification_data: any): JsVerificationResult;
}

export type InitInput = RequestInfo | URL | Response | BufferSource | WebAssembly.Module;

export interface InitOutput {
  readonly memory: WebAssembly.Memory;
  readonly __wbg_jsverificationresult_free: (a: number, b: number) => void;
  readonly jsverificationresult_valid: (a: number) => number;
  readonly jsverificationresult_error: (a: number) => [number, number];
  readonly jsverificationresult_final_score: (a: number) => number;
  readonly __wbg_snakeengine_free: (a: number, b: number) => void;
  readonly snakeengine_new: (a: number, b: number) => number;
  readonly snakeengine_start: (a: number) => void;
  readonly snakeengine_toggle_pause: (a: number) => void;
  readonly snakeengine_update: (a: number, b: number) => number;
  readonly snakeengine_change_direction: (a: number, b: number, c: number) => number;
  readonly snakeengine_get_state: (a: number) => [number, number, number];
  readonly snakeengine_get_score_hash_hex: (a: number, b: number, c: number, d: number, e: number, f: bigint) => [number, number];
  readonly snakeengine_verify_score_hex: (a: number, b: number, c: number, d: number, e: number, f: bigint, g: number, h: number) => number;
  readonly snakeengine_export_game_data_str: (a: number, b: number, c: number, d: number, e: number, f: bigint) => [number, number, number, number];
  readonly snakeengine_verify_game_data: (a: number, b: any) => [number, number, number];
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
