import 'dotenv/config';
import { connectDB, disconnectDB } from './config/db.js';
import { logger } from './config/logger.js';
import { User } from './models/user.model.js';

const USERS = [
  { name: 'Admin User', email: 'admin@example.com', password: 'Admin@123', role: 'admin' },
  { name: 'Designer User', email: 'designer@example.com', password: 'Designer@123', role: 'designer' },
  { name: 'Sales User', email: 'sales@example.com', password: 'Sales@123', role: 'sales' },
  { name: 'Client User', email: 'client@example.com', password: 'Client@123', role: 'client' },
];

async function seed() {
  await connectDB();

  for (const user of USERS) {
    const existing = await User.findOne({ email: user.email });
    if (existing) {
      logger.info(`[seed] skip ${user.email} (already exists)`);
      continue;
    }
    await User.create(user);
    logger.info(`[seed] created ${user.email} (${user.role})`);
  }

  await disconnectDB();
  logger.info('[seed] done');
}

seed().catch((err) => {
  logger.error(`[seed] failed: ${err.message}`);
  process.exit(1);
});
