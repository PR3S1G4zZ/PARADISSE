import pg from 'pg';
import { config } from '../config.js';

const { Pool } = pg;

let pool;

export function getPool(databaseUrl = config.databaseUrl) {
  if (!databaseUrl) return null;
  if (!pool) {
    pool = new Pool({ connectionString: databaseUrl });
  }
  return pool;
}

export async function closePool() {
  if (!pool) return;
  await pool.end();
  pool = null;
}
