// src/lib/server/db/index.ts
import pkg from 'pg';
const { Pool } = pkg;
import { drizzle } from 'drizzle-orm/node-postgres';
import { env } from '$env/dynamic/private';
import * as schema from './schema.js';

// Vérification de la présence des variables d'environnement
if (!env.PG_HOST || !env.PG_USER || !env.PG_PASSWORD || !env.PG_DATABASE) {
  console.warn('⚠️ Variables d\'environnement PostgreSQL incomplètes');
}

// Création du pool de connexion PostgreSQL
const pool = new Pool({
  host: env.PG_HOST,
  user: env.PG_USER,
  password: env.PG_PASSWORD,
  database: env.PG_DATABASE,
  port: Number(env.PG_PORT) || 5432,
  ssl: env.PG_SSL === 'true' ? { rejectUnauthorized: false } : false
});

// Initialisation de Drizzle avec le pool PostgreSQL
export const db = drizzle(pool, { schema });

// Type pour les requêtes
export type DbClient = typeof db;

// Fonction utilitaire avec gestion d'erreur
export async function withDb<T>(fn: (db: DbClient) => Promise<T>): Promise<T> {
  try {
    return await fn(db);
  } catch (error) {
    console.error('Database operation failed:', error);
    throw new Error('Database operation failed');
  }
}