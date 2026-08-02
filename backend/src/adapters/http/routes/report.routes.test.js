import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import express from 'express';
import request from 'supertest';
import { MongoMemoryReplSet } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import { signAccessToken } from '../../../utils/token.js';
import { errorHandler } from '../../../middleware/error-handler.js';
import { Project } from '../../persistence/mongoose/models/project.model.js';
import { Quotation } from '../../persistence/mongoose/models/quotation.model.js';
import { Boq } from '../../persistence/mongoose/models/boq.model.js';
import { Counter } from '../../persistence/mongoose/models/counter.model.js';
import { seedEngines } from '../../../seed-engines.js';
import quotationRoutes from './quotation.routes.js';
import reportRoutes from './report.routes.js';

let replSet;
let uri;

const tokenFor = (role) =>
  signAccessToken({ id: new mongoose.Types.ObjectId().toString(), role });

const app = express();
app.use(express.json());
app.use('/api/v1', quotationRoutes);
app.use('/api/v1', reportRoutes);
app.use(errorHandler);

beforeAll(async () => {
  replSet = await MongoMemoryReplSet.create({
    replSet: { count: 1 },
    instanceOpts: [{ args: ['--setParameter', 'maxTransactionLockRequestTimeoutMillis=5000'] }],
  });
  uri = replSet.getUri();
  
  // Seed databases
  await seedEngines({ mongoUri: uri });
  
  // Reconnect manually
  await mongoose.connect(uri);
  await Promise.all([Quotation.init(), Boq.init(), Counter.init()]);
});

afterAll(async () => {
  await mongoose.disconnect();
  await replSet.stop();
});

describe('Reports API Endpoints', () => {
  let projectId;
  let quotationId;

  beforeAll(async () => {
    const project = await Project.findOne({ projectName: /Villa Sunlight/ }).lean();
    projectId = project._id.toString();

    // 1. Generate a quotation first
    const resGen = await request(app)
      .post('/api/v1/quotations/generate')
      .set('Authorization', `Bearer ${tokenFor('designer')}`)
      .send({ projectId });
    
    quotationId = resGen.body.data.id;

    // 2. Transition it to 'sent' so it is counted in reports
    await request(app)
      .put(`/api/v1/quotations/${quotationId}`)
      .set('Authorization', `Bearer ${tokenFor('sales')}`)
      .send({ status: 'sent' });
  });

  describe('GET /api/v1/reports/:type', () => {
    it('allows admin to fetch sales report', async () => {
      const res = await request(app)
        .get('/api/v1/reports/sales?from=2026-01-01&to=2026-12-31')
        .set('Authorization', `Bearer ${tokenFor('admin')}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.type).toBe('sales');
      expect(res.body.data.total.count).toBe(1);
      expect(res.body.data.total.revenuePaise).toBeGreaterThan(0);
    });

    it('allows sales role to fetch sales report, but rejects designer with 403', async () => {
      const resSales = await request(app)
        .get('/api/v1/reports/sales')
        .set('Authorization', `Bearer ${tokenFor('sales')}`);
      expect(resSales.status).toBe(200);

      const resDesigner = await request(app)
        .get('/api/v1/reports/sales')
        .set('Authorization', `Bearer ${tokenFor('designer')}`);
      expect(resDesigner.status).toBe(403);
    });

    it('allows designer to fetch material report, but rejects sales with 403', async () => {
      const resDesigner = await request(app)
        .get('/api/v1/reports/material')
        .set('Authorization', `Bearer ${tokenFor('designer')}`);
      expect(resDesigner.status).toBe(200);
      expect(resDesigner.body.data.total.amountPaise).toBeGreaterThan(0);

      const resSales = await request(app)
        .get('/api/v1/reports/material')
        .set('Authorization', `Bearer ${tokenFor('sales')}`);
      expect(resSales.status).toBe(403);
    });

    it('allows admin to fetch profit report, but rejects sales/designers with 403', async () => {
      const resAdmin = await request(app)
        .get('/api/v1/reports/profit')
        .set('Authorization', `Bearer ${tokenFor('admin')}`);
      expect(resAdmin.status).toBe(200);

      const resSales = await request(app)
        .get('/api/v1/reports/profit')
        .set('Authorization', `Bearer ${tokenFor('sales')}`);
      expect(resSales.status).toBe(403);
    });
  });

  describe('GET /api/v1/reports/:type/export?format=xlsx', () => {
    it('downloads the formatted Excel report', async () => {
      const res = await request(app)
        .get('/api/v1/reports/sales/export?format=xlsx')
        .set('Authorization', `Bearer ${tokenFor('admin')}`);

      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toContain('openxmlformats-officedocument.spreadsheetml.sheet');
      expect(res.body).toBeDefined();
    });
  });
});
