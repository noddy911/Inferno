import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import { DomainError } from '../../../shared/errors.js';
import { Settings, DEFAULT_SETTINGS } from '../../persistence/mongoose/models/settings.model.js';
import { createSettingsService } from './settings.service.js';

let mongo;
let uri;

beforeAll(async () => {
  mongo = await MongoMemoryServer.create();
  uri = mongo.getUri();
  await mongoose.connect(uri);
  await Settings.init();
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongo.stop();
});

describe('settings service — read-through cache', () => {
  it('creates the singleton from defaults when the collection is empty', async () => {
    const svc = createSettingsService();
    const config = await svc.getSettings();

    expect(config.companyName).toBe(DEFAULT_SETTINGS.companyName);
    expect(config.kerf).toBe(DEFAULT_SETTINGS.kerf);
    expect(config.labourRates).toMatchObject(DEFAULT_SETTINGS.labourRates);
    expect(config.quotationNumbering).toMatchObject(DEFAULT_SETTINGS.quotationNumbering);
    // persistence internals never leak onto the config surface
    expect(config).not.toHaveProperty('_id');
    expect(config).not.toHaveProperty('__v');

    const doc = await Settings.findById('company').lean();
    expect(doc.profitMargin).toBe(DEFAULT_SETTINGS.profitMargin);
  });

  it('update persists to the DB and refreshes the cache', async () => {
    const svc = createSettingsService();
    await svc.getSettings(); // warm the cache

    const updated = await svc.updateSettings({ profitMargin: 30 });
    expect(updated.profitMargin).toBe(30);
    expect((await svc.getSettings()).profitMargin).toBe(30);

    const doc = await Settings.findById('company').lean();
    expect(doc.profitMargin).toBe(30);
  });

  it('partial nested updates preserve sibling fields', async () => {
    const svc = createSettingsService();
    const updated = await svc.updateSettings({ labourRates: { carpenter: 1500 } });

    expect(updated.labourRates.carpenter).toBe(1500);
    expect(updated.labourRates.painter).toBe(DEFAULT_SETTINGS.labourRates.painter);
    expect(updated.labourRates.electrician).toBe(DEFAULT_SETTINGS.labourRates.electrician);
  });

  it('rejects an invalid update with INVALID_INPUT + structured errors', async () => {
    const svc = createSettingsService();
    let caught;
    try {
      await svc.updateSettings({ kerf: -1 });
    } catch (err) {
      caught = err;
    }

    expect(caught).toBeInstanceOf(DomainError);
    expect(caught.code).toBe('INVALID_INPUT');
    expect(caught.details.errors.length).toBeGreaterThan(0);
  });

  it('invalidateSettingsCache forces a refetch of the persisted value', async () => {
    const svc = createSettingsService();
    await svc.getSettings(); // cache the current value

    // Mutate the DB directly (bypassing the service) to prove the read path.
    await Settings.findByIdAndUpdate('company', { $set: { warranty: 'direct-write' } });

    expect((await svc.getSettings()).warranty).toBe(DEFAULT_SETTINGS.warranty); // stale → cached
    svc.invalidateSettingsCache();
    expect((await svc.getSettings()).warranty).toBe('direct-write'); // fresh → refetched
  });

  it('expires the cache after the TTL and refetches', async () => {
    let now = Date.now();
    const svc = createSettingsService({ ttlMs: 1000, clock: () => now });
    await svc.getSettings();

    await Settings.findByIdAndUpdate('company', { $set: { kerf: 9 } });
    expect((await svc.getSettings()).kerf).toBe(DEFAULT_SETTINGS.kerf); // cached (pre-TTL)

    now += 1001;
    expect((await svc.getSettings()).kerf).toBe(9); // refetched (post-TTL)
  });

  it('validates a full quotationNumbering block through the shared schema', async () => {
    const svc = createSettingsService();
    const updated = await svc.updateSettings({
      quotationNumbering: { prefix: 'EST', format: '{prefix}/{year}/{seq}', seqPadding: 3, startFrom: 100 },
    });
    expect(updated.quotationNumbering).toMatchObject({ prefix: 'EST', seqPadding: 3, startFrom: 100 });
  });
});
