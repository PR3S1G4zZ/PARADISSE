import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { runner } from 'node-pg-migrate';

const migrationsDir = join(dirname(fileURLToPath(import.meta.url)), '../../migrations');

/**
 * Apply pending SQL migrations. `dir` is absolute so this works regardless of cwd.
 * Logging is muted to avoid printing connection strings or SQL with user data.
 */
export async function runMigrations(databaseUrl) {
  if (!databaseUrl) return;
  await runner({
    databaseUrl,
    dir: migrationsDir,
    direction: 'up',
    migrationsTable: 'pgmigrations',
    verbose: false,
    log: () => {},
  });
}
