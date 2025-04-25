// $lib/server/db/index.ts
import { drizzle } from 'drizzle-orm/neon-http';
import { NeonHttpDatabase } from 'drizzle-orm/neon-http';
import { neon, neonConfig } from '@neondatabase/serverless';
import * as schema from './schema.js';

neonConfig.fetchConnectionCache = true;

const sql = neon(process.env.POSTGRES_URL!);

export const db = drizzle(sql, { schema }) satisfies NeonHttpDatabase<typeof schema>;

// Type sûr pour les requêtes
export type DbClient = typeof db;

export async function withDb<T>(fn: (db: DbClient) => Promise<T>): Promise<T> {
  try {
    return await fn(db);
  } catch (error) {
    console.error('Database error:', error);
    throw new Error('Database operation failed');
  }
}