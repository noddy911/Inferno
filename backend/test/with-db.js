// Bootstrap: must be the FIRST import in any test file that touches the app.
// ES module imports are hoisted, so setting process.env here (with top-level
// await) guarantees env.js sees the in-memory MongoDB URI before it parses.
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';

process.env.NODE_ENV = 'test';
process.env.JWT_ACCESS_SECRET = 'test-access-secret-0123456789abcdef';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-0123456789abcdef';

const mongod = await MongoMemoryServer.create();
process.env.MONGODB_URI = mongod.getUri('interior-quotation');
await mongoose.connect(process.env.MONGODB_URI);

/** Stop the in-memory database. Call in afterAll(). */
export async function stopDb() {
  await mongoose.disconnect();
  await mongod.stop();
}
