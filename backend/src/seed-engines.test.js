import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import { seedEngines, buildSeedData } from './seed-engines.js';
import {
  Client,
  Project,
  Room,
  Furniture,
  Material,
  Settings,
} from './adapters/persistence/mongoose/models/index.js';

let mongo;
let uri;

beforeAll(async () => {
  mongo = await MongoMemoryServer.create();
  uri = mongo.getUri();
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongo.stop();
});

/** Reconnect and count real rows (seedEngines disconnects when done). */
async function rowCounts() {
  await mongoose.connect(uri);
  const counts = {
    clients: await Client.countDocuments(),
    projects: await Project.countDocuments(),
    rooms: await Room.countDocuments(),
    furniture: await Furniture.countDocuments(),
    materials: await Material.countDocuments(),
    settings: await Settings.countDocuments(),
  };
  await mongoose.disconnect();
  return counts;
}

describe('buildSeedData', () => {
  it('returns realistic fixtures for every collection', () => {
    const data = buildSeedData();
    expect(data.clients).toHaveLength(2);
    expect(data.projects).toHaveLength(2);
    expect(data.rooms).toHaveLength(4);
    expect(data.furniture.length).toBeGreaterThan(5);
    expect(data.materials.length).toBeGreaterThan(10);
    expect(data.settings._id).toBe('company');
    expect(data.settings.sheetSizes.map((s) => s.key)).toEqual(['8x4', '9x4', '10x4']);
    expect(data.settings.quotationNumbering).toMatchObject({
      prefix: 'QTN',
      format: '{prefix}-{year}-{seq}',
      seqPadding: 4,
      startFrom: 1,
    });
  });
});

describe('seedEngines', () => {
  it('seeds the full dataset exactly once (idempotent on re-run)', async () => {
    await seedEngines({ mongoUri: uri });
    const first = await rowCounts();

    await seedEngines({ mongoUri: uri });
    const second = await rowCounts();

    expect(second).toEqual(first);
    expect(first).toEqual({
      clients: 2,
      projects: 2,
      rooms: 4,
      furniture: 10,
      materials: 23,
      settings: 1,
    });
  });

  it('links furniture to rooms and materials', async () => {
    await mongoose.connect(uri);
    const wardrobe = await Furniture.findOne({ name: 'Wardrobe 8ft' }).lean();
    const room = await Room.findById(wardrobe.roomId).lean();
    const material = await Material.findById(wardrobe.materialId).lean();
    await mongoose.disconnect();

    expect(room.name).toBe('Master Bedroom');
    expect(material.sku).toBe('BD-PLY-18');
    expect(wardrobe.category).toBe('wardrobe');
  });
});
