/// <reference types="@sveltejs/kit" />

declare module '$app/environment' {
    export const browser: boolean;
    export const dev: boolean;
}




// Déclaration du module WASM
declare module '$lib/wasm/tetris/pkg/tetris_engine.js' {
    export interface TetrisScoreData {
        score: bigint;
        level: bigint;
        lines: number;
        moves_count: number;
        moves_hash: string;
        block_number: bigint;
    }
    
    export class TetrisEngine {
        constructor(width: number, height: number);
        free(): void;
        get_state(): any;
        update(timestamp: number): void;
        move_piece(direction: number): void;
        start_soft_drop(): void;
        end_soft_drop(): void;
        rotate(): void;
        hard_drop(): void;
        toggle_pause(): void;
        start(): void;
        get_proof(): { moves_hash: string };
        
        get_score_hash(
            player_address: string,
            salt_key: string,
            block_number: number // u64 en Rust -> number en TypeScript
        ): Uint8Array;
        
        verify_score(
            hash: Uint8Array,
            player_address: string,
            block_number: number, // u64 en Rust -> number en TypeScript
            salt_key: string
        ): boolean;
    }
    
    export function init(): Promise<void>;
}