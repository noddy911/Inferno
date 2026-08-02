import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import express from 'express';
import request from 'supertest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import { signAccessToken } from '../../../utils/token.js';
import { errorHandler } from '../../../middleware/error-handler.js';
import { Material } from '../../persistence/mongoose/models/material.model.js';
import materialRoutes from './material.routes.js';

let mongo;
let uri;

const tokenFor = (role) =>
  signAccessToken({ id: new mongoose.Types.ObjectId().toString(), role });

const app = express();
app.use(express.json());
app.use('/api/v1', materialRoutes);
app.use(errorHandler);

beforeAll(async () => {
  mongo = await MongoMemoryServer.create();
  uri = mongo.getUri();
  await mongoose.connect(uri);
  await Material.init();
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongo.stop();
});

const mockMaterial = {
  sku: 'BD-PLY-18',
  name: '18mm BWP Plywood',
  category: 'board',
  type: 'plywood',
  brand: 'Greenply',
  thickness: 18,
  sheetSize: { width: 2440, height: 1220 },
  unit: 'sheet',
  purchaseRate: 2050,
  sellingRate: 2600,
  gst: 18,
  supplier: 'Greenply',
};

describe('Material CRUD API', () => {
  let materialId;

  beforeEach(async () => {
    await Material.deleteMany({});
    const doc = await Material.create(mockMaterial);
    materialId = doc._id.toString();
  });

  describe('GET /api/v1/materials', () => {
    it('rejects unauthenticated requests with 401', async () => {
      const res = await request(app).get('/api/v1/materials');
      expect(res.status).toBe(401);
    });

    it('returns paginated materials', async () => {
      const res = await request(app)
        .get('/api/v1/materials')
        .set('Authorization', `Bearer ${tokenFor('sales')}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.items).toHaveLength(1);
      expect(res.body.data.total).toBe(1);
      expect(res.body.data.items[0].sku).toBe('BD-PLY-18');
    });

    it('filters by category and query q', async () => {
      // Add another material
      await Material.create({
        ...mockMaterial,
        sku: 'FN-LAM-01',
        name: 'Laminate Matte White',
        category: 'finish',
        type: 'laminate',
      });

      const res = await request(app)
        .get('/api/v1/materials?category=finish&q=matte')
        .set('Authorization', `Bearer ${tokenFor('designer')}`);

      expect(res.status).toBe(200);
      expect(res.body.data.items).toHaveLength(1);
      expect(res.body.data.items[0].sku).toBe('FN-LAM-01');
    });
  });

  describe('GET /api/v1/materials/:id', () => {
    it('returns material by ID', async () => {
      const res = await request(app)
        .get(`/api/v1/materials/${materialId}`)
        .set('Authorization', `Bearer ${tokenFor('client')}`);

      expect(res.status).toBe(200);
      expect(res.body.data.sku).toBe('BD-PLY-18');
    });

    it('returns 404 for unknown ID', async () => {
      const fakeId = new mongoose.Types.ObjectId().toString();
      const res = await request(app)
        .get(`/api/v1/materials/${fakeId}`)
        .set('Authorization', `Bearer ${tokenFor('admin')}`);

      expect(res.status).toBe(404);
    });
  });

  describe('POST /api/v1/materials', () => {
    it('permits admins and designers to create materials', async () => {
      const newMat = {
        sku: 'FN-LAM-10',
        name: 'Glossy Oak Laminate',
        category: 'finish',
        type: 'laminate',
        unit: 'sqft',
        purchaseRate: 50,
        sellingRate: 80,
      };

      const res = await request(app)
        .post('/api/v1/materials')
        .set('Authorization', `Bearer ${tokenFor('designer')}`)
        .send(newMat);

      expect(res.status).toBe(201);
      expect(res.body.data.sku).toBe('FN-LAM-10');

      const doc = await Material.findOne({ sku: 'FN-LAM-10' });
      expect(doc).toBeDefined();
    });

    it('rejects sales and clients with 403', async () => {
      const res = await request(app)
        .post('/api/v1/materials')
        .set('Authorization', `Bearer ${tokenFor('sales')}`)
        .send({});

      expect(res.status).toBe(403);
    });

    it('rejects duplicates SKU with 409', async () => {
      const res = await request(app)
        .post('/api/v1/materials')
        .set('Authorization', `Bearer ${tokenFor('admin')}`)
        .send(mockMaterial); // Already exists in beforeEach

      expect(res.status).toBe(409);
    });
  });

  describe('PUT /api/v1/materials/:id', () => {
    it('updates material fields', async () => {
      const res = await request(app)
        .put(`/api/v1/materials/${materialId}`)
        .set('Authorization', `Bearer ${tokenFor('admin')}`)
        .send({ purchaseRate: 2200, name: '18mm Premium BWP Plywood' });

      expect(res.status).toBe(200);
      expect(res.body.data.purchaseRate).toBe(2200);
      expect(res.body.data.name).toBe('18mm Premium BWP Plywood');
    });

    it('rejects invalid fields with 400', async () => {
      const res = await request(app)
        .put(`/api/v1/materials/${materialId}`)
        .set('Authorization', `Bearer ${tokenFor('designer')}`)
        .send({ purchaseRate: -100 });

      expect(res.status).toBe(400);
    });
  });

  describe('DELETE /api/v1/materials/:id', () => {
    it('soft deletes material (admin only)', async () => {
      const res = await request(app)
        .delete(`/api/v1/materials/${materialId}`)
        .set('Authorization', `Bearer ${tokenFor('admin')}`);

      expect(res.status).toBe(200);

      // Check soft deletion: active check finds nothing
      const activeDoc = await Material.findOne({ _id: materialId, isActive: true });
      expect(activeDoc).toBeNull();

      // Database has the soft deleted row
      const rawDoc = await Material.findById(materialId);
      expect(rawDoc.isActive).toBe(false);
      expect(rawDoc.deletedAt).toBeInstanceOf(Date);
    });

    it('denies delete for designers with 403', async () => {
      const res = await request(app)
        .delete(`/api/v1/materials/${materialId}`)
        .set('Authorization', `Bearer ${tokenFor('designer')}`);

      expect(res.status).toBe(403);
    });
  });
});
