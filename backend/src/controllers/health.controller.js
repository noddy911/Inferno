import { dbState } from '../config/db.js';
import { success } from '../utils/api-response.js';

/** GET /api/v1/health - liveness + DB state probe. */
export function healthCheck(req, res) {
  success(res, 'OK', {
    status: 'up',
    db: dbState(),
    uptime: Math.round(process.uptime()),
    timestamp: new Date().toISOString(),
  });
}

export default healthCheck;
