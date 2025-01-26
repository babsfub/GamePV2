import { mysqlTable, bigint, varchar, timestamp, index } from 'drizzle-orm/mysql-core';

export const tetrisScores = mysqlTable('tetris_scores', {
  id: bigint('id', { mode: 'number' }).primaryKey().autoincrement(),
  walletAddress: varchar('wallet_address', { length: 42 }).notNull(),
  score: bigint('score', { mode: 'number' }).notNull(),
  txHash: varchar('tx_hash', { length: 66 }).notNull(),
  blockNumber: bigint('block_number', { mode: 'number' }).notNull(),
  stake: varchar('stake', { length: 255 }).notNull(),
  createdAt: timestamp('created_at').defaultNow(),
}, (table) => ({
  walletIndex: index('wallet_idx').on(table.walletAddress),
  scoreIndex: index('score_idx').on(table.score),
}));

// Structure identique pour d'autres jeux
export const snakeScores = mysqlTable('snake_scores', {
  // ... mêmes champs
});

// Type pour les scores
export type TetrisScore = typeof tetrisScores.$inferSelect;
export type NewTetrisScore = typeof tetrisScores.$inferInsert;