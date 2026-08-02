import app from './app.js';
import { env } from './config/env.js';
import { logger } from './config/logger.js';
import { connectDB, disconnectDB } from './config/db.js';

async function start() {
  try {
    await connectDB();
  } catch (err) {
    logger.error(`[db] Failed to connect: ${err.message}`);
    if (env.NODE_ENV === 'production') {
      process.exit(1);
    }
    logger.warn('[db] Continuing without a database (development). /api/v1/health reports state.');
  }

  const server = app.listen(env.PORT, () => {
    logger.info(`[server] API listening on http://localhost:${env.PORT}/api/v1`);
  });

  const shutdown = async (signal) => {
    logger.info(`[server] Received ${signal}, shutting down gracefully...`);
    server.close(async () => {
      await disconnectDB();
      process.exit(0);
    });
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

start();
