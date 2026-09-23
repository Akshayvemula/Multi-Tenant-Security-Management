import { app } from './app.js';
import { pool } from './db.js';
import { config } from './config.js';

const server = app.listen(config.port, () => console.log(`API listening on http://localhost:${config.port}`));

async function shutdown(signal) {
  console.log(`${signal} received; shutting down`);
  server.close(async () => {
    await pool.end();
    process.exit(0);
  });
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

