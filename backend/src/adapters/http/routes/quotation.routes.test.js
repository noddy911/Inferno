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

let replSet;
let uri;

const tokenFor = (role) =>
  signAccessToken({ id: new mongoose.Types.ObjectId().toString(), role });

const app = express();
app.use(express.json());
app.use('/api/v1', quotationRoutes);
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

describe('Quotation API Endpoints', () => {
  let projectId;
  let quotationId;
  let quotationNumber;

  beforeAll(async () => {
    const project = await Project.findOne({ projectName: /Villa Sunlight/ }).lean();
    projectId = project._id.toString();
  });

  describe('POST /api/v1/quotations/generate', () => {
    it('generates a quotation + BOQ transactionally', async () => {
      const res = await request(app)
        .post('/api/v1/quotations/generate')
        .set('Authorization', `Bearer ${tokenFor('designer')}`)
        .send({ projectId });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.quotationNumber).toBeDefined();
      expect(res.body.data.status).toBe('draft');
      expect(res.body.data.summary.total).toBeGreaterThan(0);

      quotationId = res.body.data.id;
      quotationNumber = res.body.data.quotationNumber;
    });
  });

  describe('GET /api/v1/quotations', () => {
    it('lists quotations', async () => {
      const res = await request(app)
        .get('/api/v1/quotations')
        .set('Authorization', `Bearer ${tokenFor('sales')}`);

      expect(res.status).toBe(200);
      expect(res.body.data.items.length).toBeGreaterThan(0);
    });
  });

  describe('GET /api/v1/quotations/:id', () => {
    it('gets quotation details', async () => {
      const res = await request(app)
        .get(`/api/v1/quotations/${quotationId}`)
        .set('Authorization', `Bearer ${tokenFor('designer')}`);

      expect(res.status).toBe(200);
      expect(res.body.data.quotationNumber).toBe(quotationNumber);
    });
  });

  describe('PUT /api/v1/quotations/:id', () => {
    it('allows transitions from draft to sent', async () => {
      const res = await request(app)
        .put(`/api/v1/quotations/${quotationId}`)
        .set('Authorization', `Bearer ${tokenFor('sales')}`)
        .send({ status: 'sent' });

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('sent');
    });

    it('rejects field updates once not in draft', async () => {
      const res = await request(app)
        .put(`/api/v1/quotations/${quotationId}`)
        .set('Authorization', `Bearer ${tokenFor('designer')}`)
        .send({ paymentTerms: 'Cash only' });

      expect(res.status).toBe(409); // INVALID_STATE
    });

    it('allows transitions from sent to rejected', async () => {
      const res = await request(app)
        .put(`/api/v1/quotations/${quotationId}`)
        .set('Authorization', `Bearer ${tokenFor('sales')}`)
        .send({ status: 'rejected' });

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('rejected');
    });

    it('spawns a new draft revision when transitioning from rejected to revised', async () => {
      const res = await request(app)
        .put(`/api/v1/quotations/${quotationId}`)
        .set('Authorization', `Bearer ${tokenFor('designer')}`)
        .send({ status: 'revised' });

      expect(res.status).toBe(200);
      expect(res.body.data.superseded.status).toBe('revised');
      expect(res.body.data.revision.status).toBe('draft');
      expect(res.body.data.revision.revisionOf).toBe(quotationId);
    });
  });

  describe('GET /api/v1/quotations/:id/pdf', () => {
    it('downloads the PDF rendered quotation', async () => {
      const res = await request(app)
        .get(`/api/v1/quotations/${quotationId}/pdf`)
        .set('Authorization', `Bearer ${tokenFor('sales')}`);

      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toContain('application/pdf');
      expect(res.headers['content-disposition']).toContain('attachment');
      expect(res.body).toBeDefined();
    });
  });

  describe('DELETE /api/v1/quotations/:id', () => {
    it('fails to delete a non-draft/rejected quotation', async () => {
      // The current status is 'revised' which is not deletable
      const res = await request(app)
        .delete(`/api/v1/quotations/${quotationId}`)
        .set('Authorization', `Bearer ${tokenFor('admin')}`);

      expect(res.status).toBe(409);
    });

    it('successfully deletes a draft quotation', async () => {
      // Get the revision ID from the last revised PUT response
      const items = await Quotation.find({ status: 'draft' }).lean();
      const draftId = items[0]._id.toString();

      const res = await request(app)
        .delete(`/api/v1/quotations/${draftId}`)
        .set('Authorization', `Bearer ${tokenFor('admin')}`);

      expect(res.status).toBe(200);

      const doc = await Quotation.findById(draftId);
      expect(doc).toBeNull();
    });
  });
});
