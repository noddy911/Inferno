import { success } from '../../../utils/api-response.js';
import { getSettings, updateSettings } from '../../services/settings/settings.service.js';

/**
 * Thin controllers — validation happens in middleware, logic lives in services.
 * Express 5 forwards rejected promises to the error middleware automatically.
 */

/** GET /settings — read the company config (any authenticated role). */
export async function getSettingsHandler(req, res) {
  const settings = await getSettings();
  return success(res, 'Settings retrieved', settings);
}

/** PUT /settings — update the company config (admin only). */
export async function updateSettingsHandler(req, res) {
  const settings = await updateSettings(req.validated.body);
  return success(res, 'Settings updated', settings);
}
