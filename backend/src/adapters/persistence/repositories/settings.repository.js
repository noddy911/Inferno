/**
 * Settings repository — the single-company singleton (design §4.4).
 *
 * One doc, `_id: 'company'`. `createOrUpdateSettings` upserts atomically: applied
 * changes via `$set`, full defaults via `$setOnInsert` so the singleton always exists
 * with sane values even before `seed-engines` runs. Nested partial patches (e.g.
 * `{ labourRates: { carpenter: 1500 } }`) are flattened to dotted paths so a partial
 * update never wipes the sibling rate fields. This is the only module that touches
 * the `Settings` model.
 */

import { Settings, DEFAULT_SETTINGS } from '../mongoose/models/settings.model.js';

const SETTINGS_ID = 'company';

/** Writable defaults — everything except the `_id` (already the query's filter). */
const DEFAULTS = { ...DEFAULT_SETTINGS };
delete DEFAULTS._id;

/**
 * Flatten a nested partial update into Mongo `$set` dotted paths, leaving arrays
 * (sheetSizes) and scalars intact. `{ labourRates: { carpenter: 1500 } }` →
 * `{ 'labourRates.carpenter': 1500 }` — siblings are preserved by the update.
 * @param {Record<string, *>} update
 * @returns {Record<string, *>}
 */
export function flattenUpdate(update) {
  const out = {};
  for (const [key, value] of Object.entries(update)) {
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      for (const [nestedKey, nestedValue] of Object.entries(value)) {
        out[`${key}.${nestedKey}`] = nestedValue;
      }
    } else {
      out[key] = value;
    }
  }
  return out;
}

/** @returns {Promise<import('mongoose').FlattenMaps<any> | null>} */
export async function getSettings() {
  return Settings.findById(SETTINGS_ID).lean();
}

/**
 * Apply a (validated) partial update, creating the singleton from defaults on first
 * use. Returns the full updated doc (after state).
 *
 * Two steps on purpose: MongoDB forbids the same path appearing in both `$set` and
 * `$setOnInsert` of one command, and a dotted `$set` path (e.g. `labourRates.carpenter`)
 * conflicts with a parent `$setOnInsert` object (`labourRates`). So the singleton is
 * ensured with `$setOnInsert` alone first, then the patch is applied with `$set` alone.
 * @param {Record<string, *>} [update]
 * @returns {Promise<import('mongoose').FlattenMaps<any>>}
 */
export async function createOrUpdateSettings(update = {}) {
  // Ensure existence (no-op when present) — creates from DEFAULT_SETTINGS when absent.
  await Settings.updateOne(
    { _id: SETTINGS_ID },
    { $setOnInsert: DEFAULTS },
    { upsert: true }
  );
  // Apply the patch — the doc is guaranteed to exist now.
  return Settings.findOneAndUpdate(
    { _id: SETTINGS_ID },
    { $set: flattenUpdate(update) },
    { returnDocument: 'after', runValidators: true }
  ).lean();
}

/** Ensure the singleton exists (from defaults when absent) and return it. */
export async function getOrCreateSettings() {
  return createOrUpdateSettings({});
}
