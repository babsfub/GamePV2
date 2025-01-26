/* tslint:disable */
/* eslint-disable */
export const memory: WebAssembly.Memory;
export const __wbg_gameconfig_free: (a: number, b: number) => void;
export const __wbg_gamemove_free: (a: number, b: number) => void;
export const __wbg_gameproof_free: (a: number, b: number) => void;
export const __wbg_gamestate_free: (a: number, b: number) => void;
export const __wbg_tetrisengine_free: (a: number, b: number) => void;
export const tetrisengine_new: (a: number, b: number) => number;
export const tetrisengine_get_state: (a: number) => [number, number, number];
export const tetrisengine_start_soft_drop: (a: number) => void;
export const tetrisengine_end_soft_drop: (a: number) => void;
export const tetrisengine_update: (a: number, b: number) => number;
export const tetrisengine_move_piece: (a: number, b: number) => number;
export const tetrisengine_rotate: (a: number) => number;
export const tetrisengine_get_score_hash: (a: number, b: number, c: number, d: number, e: number, f: bigint) => [number, number];
export const tetrisengine_verify_score: (a: number, b: number, c: number, d: number, e: number, f: bigint, g: number, h: number) => number;
export const tetrisengine_hard_drop: (a: number) => number;
export const tetrisengine_hold: (a: number) => number;
export const tetrisengine_toggle_pause: (a: number) => void;
export const tetrisengine_start: (a: number) => void;
export const __wbindgen_malloc: (a: number, b: number) => number;
export const __wbindgen_realloc: (a: number, b: number, c: number, d: number) => number;
export const __wbindgen_exn_store: (a: number) => void;
export const __externref_table_alloc: () => number;
export const __wbindgen_export_4: WebAssembly.Table;
export const __wbindgen_free: (a: number, b: number, c: number) => void;
export const __externref_table_dealloc: (a: number) => void;
export const __wbindgen_start: () => void;
