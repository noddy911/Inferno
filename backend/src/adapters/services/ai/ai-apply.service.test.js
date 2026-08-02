import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import { DomainError } from '../../../shared/errors.js';
import { Client } from '../../persistence/mongoose/models/client.model.js';
import { Project } from '../../persistence/mongoose/models/project.model.js';
import { Room } from '../../persistence/mongoose/models/room.model.js';
import { Furniture } from '../../persistence/mongoose/models/furniture.model.js';
import { applySuggestion } from './ai-apply.service.js';

let mongo;
let uri;
let projectId;

const suggestion = {
  summary: 'A bedroom suite with wardrobe and bed.',
  rooms: [
    {
      name: 'Master Bedroom',
      width: 4000,
      length: 3600,
      height: 2900,
      furniture: [
        { category: 'wardrobe', name: 'Wardrobe 8ft', width: 2400, height: 2400, depth: 600, shelves: 4, drawers: 2, shutters: 4, quantity: 1 },
        { category: 'bed', name: 'Queen Bed', width: 1800, height: 450, depth: 2000, quantity: 1 },
      ],
    },
  ],
};

beforeAll(async () => {
  mongo = await MongoMemoryServer.create();
  uri = mongo.getUri();
  await mongoose.connect(uri);
  await Promise.all([Client.init(), Project.init(), Room.init(), Furniture.init()]);

  const client = await Client.create({ name: 'Test Client', email: 'client@example.com' });
  const project = await Project.create({ clientId: client._id, projectName: 'Test Project' });
  projectId = project._id.toString();
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongo.stop();
});

describe('applySuggestion — persists rooms + furniture', () => {
  it('creates Room + Furniture docs and returns their ids', async () => {
    const result = await applySuggestion({ projectId, suggestion });

    expect(result.totalRooms).toBe(1);
    expect(result.totalFurniture).toBe(2);
    expect(result.rooms[0].name).toBe('Master Bedroom');
    expect(result.rooms[0].furniture).toHaveLength(2);
    expect(result.rooms[0].furniture[0]).toMatchObject({ category: 'wardrobe', width: 2400 });
    expect(result.measurement).toBeNull(); // measure defaults to false

    expect(await Room.countDocuments({ projectId })).toBe(1);
    expect(await Furniture.countDocuments({})).toBe(2);

    const furnitureDocs = await Furniture.find({}).lean();
    const roomId = result.rooms[0].roomId;
    for (const f of furnitureDocs) {
      expect(f.roomId.toString()).toBe(roomId);
      expect(f.category).toBeTruthy();
    }
  });

  it('runs the measurement engine when measure: true (seeds the cost pipeline)', async () => {
    const result = await applySuggestion({ projectId, suggestion, measure: true });

    expect(result.measurement).not.toBeNull();
    expect(result.measurement.totals.area).toBeGreaterThan(0);
    expect(result.measurement.totals.edgeBandM).toBeGreaterThan(0);
    expect(result.measurement.items).toHaveLength(2);
    expect(result.measurement.totals.hardware.hinges).toBeGreaterThan(0);
  });

  it('rejects an invalid suggestion (INVALID_INPUT)', async () => {
    let caught;
    try {
      await applySuggestion({ projectId, suggestion: { summary: 'x', rooms: [] } });
    } catch (err) {
      caught = err;
    }
    expect(caught).toBeInstanceOf(DomainError);
    expect(caught.code).toBe('INVALID_INPUT');
  });

  it('rejects an unknown project (NOT_FOUND)', async () => {
    let caught;
    try {
      await applySuggestion({ projectId: new mongoose.Types.ObjectId().toString(), suggestion });
    } catch (err) {
      caught = err;
    }
    expect(caught).toBeInstanceOf(DomainError);
    expect(caught.code).toBe('NOT_FOUND');
    expect(caught.message).toContain('Project not found');
  });
});
