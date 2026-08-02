import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import express from 'express';
import request from 'supertest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import { signAccessToken } from '../../../utils/token.js';
import { errorHandler } from '../../../middleware/error-handler.js';
import { Project } from '../../persistence/mongoose/models/project.model.js';
import { Boq } from '../../persistence/mongoose/models/boq.model.js';
import { seedEngines } from '../../../seed-engines.js';
import boqRoutes from './boq.routes.js';

let mongo;
let uri;

const tokenFor = (role) =>
  signAccessToken({ id: new mongoose.Types.ObjectId().toString(), role });

const app = express();
app.use(express.json());
app.use('/api/v1', boqRoutes);
app.use(errorHandler);

beforeAll(async () => {
  mongo = await MongoMemoryServer.create();
  uri = mongo.getUri();
  // Run seed engines to prepare clients, projects, rooms, furniture, materials
  await seedEngines({ mongoUri: uri });
  // Reconnect manually since seedEngines disconnects
  await mongoose.connect(uri);
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongo.stop();
});

describe('BOQ API Endpoints', () => {
  let projectId;
  let boqId;

  beforeAll(async () => {
    const project = await Project.findOne({ projectName: /Villa Sunlight/ }).lean();
    projectId = project._id.toString();
  });

  describe('POST /api/v1/boq/generate', () => {
    it('generates a BOQ for a project successfully', async () => {
      const res = await request(app)
        .post('/api/v1/boq/generate')
        .set('Authorization', `Bearer ${tokenFor('designer')}`)
        .send({ projectId });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBeDefined();
      expect(res.body.data.items.length).toBeGreaterThan(0);
      expect(res.body.data.totals.amount).toBeGreaterThan(0);

      boqId = res.body.data.id;
    });

    it('rejects sales/clients from generating if they do not have access', async () => {
      const res = await request(app)
        .post('/api/v1/boq/generate')
        .set('Authorization', `Bearer ${tokenFor('client')}`)
        .send({ projectId });

      expect(res.status).toBe(403);
    });
  });

  describe('GET /api/v1/boq/:id', () => {
    it('retrieves saved BOQ details', async () => {
      const res = await request(app)
        .get(`/api/v1/boq/${boqId}`)
        .set('Authorization', `Bearer ${tokenFor('sales')}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.items).toHaveLength(res.body.data.totals.lineCount);
    });

    it('returns 404 for unknown BOQ ID', async () => {
      const fakeId = new mongoose.Types.ObjectId().toString();
      const res = await request(app)
        .get(`/api/v1/boq/${fakeId}`)
        .set('Authorization', `Bearer ${tokenFor('designer')}`);

      expect(res.status).toBe(404);
    });
  });

  describe('GET /api/v1/boq/:id/export?format=xlsx', () => {
    it('exports BOQ as xlsx spreadsheet buffer', async () => {
      const res = await request(app)
        .get(`/api/v1/boq/${boqId}/export?format=xlsx`)
        .set('Authorization', `Bearer ${tokenFor('sales')}`);

      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toContain('openxmlformats-officedocument.spreadsheetml.sheet');
      expect(res.headers['content-disposition']).toContain('attachment');
      expect(res.body).toBeDefined(); // Binary Excel buffer
    });
  });
});
