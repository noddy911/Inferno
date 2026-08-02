/**
 * Settings orchestration — read-through cache feeding every engine (design §8.5, §11).
 *
 * `getSettings()` returns the validated company config, cached 5 minutes and
 * invalidated on `PUT /settings`. Callers (controllers, CLI, AI workflows, and the
 * Phase-2 orchestration services) all read through this service, so a settings change
 * is visible everywhere after the next PUT or cache expiry. The cache clock/TTL are
 * injectable for deterministic tests.
 */

import { TTLCache } from '../../../shared/ttl-cache.js';
import { invalidInput } from '../../../shared/errors.js';
import { settingsUpdateSchema } from '../../../domain/settings/dto.js';
import {
  getOrCreateSettings,
  createOrUpdateSettings,
} from '../../persistence/repositories/settings.repository.js';

const CACHE_KEY = 'company';
const DEFAULT_TTL_MS = 5 * 60 * 1000;

/** Persistence-only fields never exposed on the config surface. */
const INTERNAL_KEYS = ['_id', '__v', 'createdAt', 'updatedAt'];

/** Strip persistence internals from a lean doc → plain config object. */
function toConfig(doc) {
  const config = {};
  for (const [key, value] of Object.entries(doc)) {
    if (!INTERNAL_KEYS.includes(key)) config[key] = value;
  }
  return config;
}

/**
 * @param {{ ttlMs?: number, clock?: () => number }} [options]
 */
export function createSettingsService({ ttlMs = DEFAULT_TTL_MS, clock = Date.now } = {}) {
  const cache = new TTLCache({ ttlMs, clock });

  /** Read-through: cache → singleton (created from defaults when absent). */
  async function getSettings() {
    const cached = cache.get(CACHE_KEY);
    if (cached !== undefined) return cached;
    const config = toConfig(await getOrCreateSettings());
    cache.set(CACHE_KEY, config);
    return config;
  }

  /** Validate a partial update, persist, and refresh the cache. */
  async function updateSettings(update) {
    const parsed = settingsUpdateSchema.safeParse(update ?? {});
    if (!parsed.success) {
      const errors = parsed.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`);
      throw invalidInput('Invalid settings update', { errors });
    }
    const config = toConfig(await createOrUpdateSettings(parsed.data));
    cache.set(CACHE_KEY, config);
    return config;
  }

  /** Drop the cached copy so the next read refetches (called after writes). */
  function invalidateSettingsCache() {
    cache.delete(CACHE_KEY);
  }

  return { getSettings, updateSettings, invalidateSettingsCache };
}

/** Process-wide singleton used by the HTTP layer and orchestration. */
export const settingsService = createSettingsService();

export const { getSettings, updateSettings, invalidateSettingsCache } = settingsService;
