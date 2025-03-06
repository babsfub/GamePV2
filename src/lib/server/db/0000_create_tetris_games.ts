// drizzle/0000_create_tetris_games.ts
import { sql } from 'drizzle-orm';
import { bigint, boolean, index, mysqlTable, timestamp, varchar } from 'drizzle-orm/mysql-core';

export async function up(db) {
  await db.run(sql`
    CREATE TABLE tetris_games (
      id BIGINT PRIMARY KEY AUTO_INCREMENT,
      player_address VARCHAR(42) NOT NULL,
      score BIGINT NOT NULL,
      block_number BIGINT NOT NULL,
      verified BOOLEAN DEFAULT FALSE,
      stake BIGINT NOT NULL,
      score_hash VARCHAR(66) NOT NULL,
      verifier_address VARCHAR(42),
      game_state TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      expires_at TIMESTAMP NOT NULL,
      round_id BIGINT NOT NULL,
      transaction_hash VARCHAR(66),
      INDEX player_idx (player_address),
      INDEX round_idx (round_id),
      INDEX score_hash_idx (score_hash),
      INDEX expiry_idx (expires_at)
    );
  `);
}

export async function down(db) {
  await db.run(sql`DROP TABLE IF EXISTS tetris_games;`);
}