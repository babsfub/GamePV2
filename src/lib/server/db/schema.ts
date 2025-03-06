// src/lib/server/db/schema.ts
import { pgTable, serial, varchar, timestamp, boolean, bigint } from 'drizzle-orm/pg-core';

// Définition des tables
export const tetrisGames = pgTable('tetris_games', {
  id: serial('id').primaryKey(),
  player_address: varchar('player_address', { length: 42 }).notNull(),
  round_id: bigint('round_id', { mode: 'number' }).notNull(),
  score: bigint('score', { mode: 'number' }).notNull(),
  game_state: varchar('game_state', { length: 1000 }).notNull(),
  score_hash: varchar('score_hash', { length: 66 }).notNull(),
  block_number: bigint('block_number', { mode: 'number' }).notNull(),
  stake: bigint('stake', { mode: 'number' }).notNull(),
  transaction_hash: varchar('transaction_hash', { length: 66 }).notNull(),
  verified: boolean('verified').default(false),
  verifier_address: varchar('verifier_address', { length: 42 }),
  db_hash: varchar('db_hash', { length: 66 }),
  contract_hash: varchar('contract_hash', { length: 66 }),
  transaction_block_number: bigint('transaction_block_number', { mode: 'number' }),
  transaction_timestamp: timestamp('transaction_timestamp'),
  expires_at: timestamp('expires_at').notNull()
});

export const snakeGames = pgTable('snake_games', {
  id: serial('id').primaryKey(),
  player_address: varchar('player_address', { length: 42 }).notNull(),
  round_id: bigint('round_id', { mode: 'number' }).notNull(),
  score: bigint('score', { mode: 'number' }).notNull(),
  game_state: varchar('game_state', { length: 1000 }).notNull(),
  score_hash: varchar('score_hash', { length: 66 }).notNull(),
  block_number: bigint('block_number', { mode: 'number' }).notNull(),
  stake: bigint('stake', { mode: 'number' }).notNull(),
  transaction_hash: varchar('transaction_hash', { length: 66 }).notNull(),
  verified: boolean('verified').default(false),
  verifier_address: varchar('verifier_address', { length: 42 }),
  db_hash: varchar('db_hash', { length: 66 }),
  contract_hash: varchar('contract_hash', { length: 66 }),
  transaction_block_number: bigint('transaction_block_number', { mode: 'number' }),
  transaction_timestamp: timestamp('transaction_timestamp'),
  expires_at: timestamp('expires_at').notNull()
});

// Types inférés pour les insertions
export type NewTetrisGame = typeof tetrisGames.$inferInsert;
export type NewSnakeGame = typeof snakeGames.$inferInsert;

// Types pour les sélections
export type TetrisGame = typeof tetrisGames.$inferSelect;
export type SnakeGame = typeof snakeGames.$inferSelect;