/// <reference types="@sveltejs/kit" />

declare module '$app/environment' {
    export const browser: boolean;
    export const dev: boolean;
}

declare global {
    interface window {
        ethereum?: any;
        browser?: true | false;
    }
}

// Déclaration du module WASM pour Tetris
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

// Déclaration du module WASM pour Snake
declare module '$lib/games/snake/pkg/snake_engine.js' {
    export interface JsVerificationResult {
        readonly valid: boolean;
        readonly error: string | undefined;
        readonly final_score: number;
        free(): void;
    }
    
    export class SnakeEngine {
        constructor(width: number, height: number);
        free(): void;
        get_state(): any;
        update(timestamp: number): boolean;
        change_direction(direction: string): boolean;
        toggle_pause(): void;
        start(): void;
        
        get_score_hash_hex(
            player_address: string,
            salt_key: string,
            block_number: bigint
        ): string;
        
        verify_score_hex(
            stored_hash_hex: string,
            player_address: string,
            block_number: bigint,
            salt_key: string
        ): boolean;
        
        export_game_data_str(
            player_address: string,
            salt_key: string,
            block_number: bigint
        ): string;
        
        verify_game_data(verification_data: any): JsVerificationResult;
    }
    
    export function init(): Promise<void>;
}

