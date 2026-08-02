import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import express from 'express';
import request from 'supertest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import { signAccessToken } from '../../../utils/token.js';
import { errorHandler } from '../../../middleware/error-handler.js';
import { Client } from '../../persistence/mongoose/models/client.model.js';
import { Project } from '../../persistence/mongoose/models/project.model.js';
import { Room } from '../../persistence/mongoose/models/room.model.js';
import { Furniture } from '../../persistence/mongoose/models/furniture.model.js';
import aiRoutes from './ai.routes.js';

let mongo;
let uri;
let projectId;

const tokenFor = (role) => signAccessToken({ id: new mongoose.Types.ObjectId().toString(), role });

const suggestion = {
  summary: 'A bedroom suite.',
  rooms: [
    {
      name: 'Master Bedroom',
      width: 4000,
      length: 3600,
      height: 2900,
      furniture: [{ category: 'wardrobe', name: 'Wardrobe 8ft', width: 2400, height: 2400, depth: 600, shelves: 4, drawers: 2, shutters: 4, quantity: 1 }],
    },
  ],
};

const app = express();
app.use(express.json());
app.use('/api/v1', aiRoutes);
app.use(errorHandler);

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

describe('POST /api/v1/ai/estimate', () => {
  it('returns 401 without a token', async () => {
    const res = await request(app).post('/api/v1/ai/estimate').send({ prompt: 'I need a modular kitchen.' });
    expect(res.status).toBe(401);
  });

  it('returns 403 for sales (RBAC: admin + designer only)', async () => {
    const res = await request(app)
      .post('/api/v1/ai/estimate')
      .set('Authorization', `Bearer ${tokenFor('sales')}`)
      .send({ prompt: 'I need a modular kitchen.' });
    expect(res.status).toBe(403);
  });

  it('returns a validated mock suggestion for a designer', async () => {
    const res = await request(app)
      .post('/api/v1/ai/estimate')
      .set('Authorization', `Bearer ${tokenFor('designer')}`)
      .send({ prompt: 'I need a modular kitchen.' });

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ success: true, message: 'Estimate generated' });
    expect(res.body.data.provider).toBe('mock');
    expect(res.body.data.suggestion.summary).toBeTruthy();
    expect(res.body.data.suggestion.rooms[0].furniture[0].category).toBe('kitchen');
  });

  it('rejects an out-of-range prompt with 400', async () => {
    const res = await request(app)
      .post('/api/v1/ai/estimate')
      .set('Authorization', `Bearer ${tokenFor('admin')}`)
      .send({ prompt: 'ab' });
    expect(res.status).toBe(400);
  });
});

describe('POST /api/v1/ai/apply', () => {
  it('returns 401 without a token', async () => {
    const res = await request(app).post('/api/v1/ai/apply').send({ projectId, suggestion });
    expect(res.status).toBe(401);
  });

  it('returns 403 for client', async () => {
    const res = await request(app)
      .post('/api/v1/ai/apply')
      .set('Authorization', `Bearer ${tokenFor('client')}`)
      .send({ projectId, suggestion });
    expect(res.status).toBe(403);
  });

  it('returns 404 for an unknown project', async () => {
    const res = await request(app)
      .post('/api/v1/ai/apply')
      .set('Authorization', `Bearer ${tokenFor('designer')}`)
      .send({ projectId: new mongoose.Types.ObjectId().toString(), suggestion });
    expect(res.status).toBe(404);
  });

  it('persists rooms + furniture and can measure', async () => {
    const res = await request(app)
      .post('/api/v1/ai/apply')
      .set('Authorization', `Bearer ${tokenFor('designer')}`)
      .send({ projectId, suggestion, measure: true });

    expect(res.status).toBe(200);
    expect(res.body.data.totalRooms).toBe(1);
    expect(res.body.data.totalFurniture).toBe(1);
    expect(res.body.data.measurement.totals.area).toBeGreaterThan(0);

    expect(await Room.countDocuments({ projectId })).toBeGreaterThan(0);
    expect(await Furniture.countDocuments({})).toBeGreaterThan(0);
  });

  it('returns 400 for an invalid suggestion', async () => {
    const res = await request(app)
      .post('/api/v1/ai/apply')
      .set('Authorization', `Bearer ${tokenFor('admin')}`)
      .send({ projectId, suggestion: { summary: 'x', rooms: [] } });
    expect(res.status).toBe(400);
  });
});
