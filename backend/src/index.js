import { config } from './config.js';
import { createApp } from './app.js';
import { runMigrations } from './db/migrate.js';

if (config.databaseUrl) {
  try {
    await runMigrations(config.databaseUrl);
  } catch {
    console.error('No fue posible aplicar las migraciones de autenticación.');
    process.exit(1);
  }
}

const app = createApp();

app.listen(config.port, () => {
  console.log(`PARADISSE API escuchando en http://localhost:${config.port}`);
});
