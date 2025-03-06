/* tslint:disable */
/* eslint-disable */
export class GameState {
  private constructor();
  free(): void;
}
export class GameVerificationData {
  private constructor();
  free(): void;
}
export class MinesweeperEngine {
  free(): void;
  constructor(stake_amount: bigint);
  reveal_cell(x: number, y: number): boolean;
  toggle_flag(x: number, y: number): boolean;
  get_score_hash(player_address: string, salt_key: string, block_number: bigint): Uint8Array;
  get_state(): any;
  verify_score(stored_hash: Uint8Array, player_address: string, block_number: bigint, salt_key: string): boolean;
}
