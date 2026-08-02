import mongoose from 'mongoose';
import { env } from './env.js';
import { logger } from './logger.js';

/**
 * Connects to MongoDB. Throws on failure so callers decide how to handle it.
 * @param {string} [uri] overrides env.MONGODB_URI (used by tests with mongodb-memory-server).
 */
export async function connectDB(uri = env.MONGODB_URI) {
  mongoose.set('strictQuery', true);
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 });
  logger.info(`[db] Connected to MongoDB: ${mongoose.connection.host}/${mongoose.connection.name}`);
}

export async function disconnectDB() {
  await mongoose.disconnect();
}

const DB_STATES = ['disconnected', 'connected', 'connecting', 'disconnecting'];

/** Human-readable current connection state. */
export function dbState() {
  return DB_STATES[mongoose.connection.readyState] ?? 'unknown';
}
