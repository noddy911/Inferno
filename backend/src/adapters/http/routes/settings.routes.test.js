import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import express from 'express';
import request from 'supertest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import { signAccessToken } from '../../../utils/token.js';
import { errorHandler } from '../../../middleware/error-handler.js';
import { Settings, DEFAULT_SETTINGS } from '../../persistence/mongoose/models/settings.model.js';
import settingsRoutes from './settings.routes.js';

let mongo;
let uri;

const tokenFor = (role) =>
  signAccessToken({ id: new mongoose.Types.ObjectId().toString(), role });

const app = express();
app.use(express.json());
app.use('/api/v1', settingsRoutes);
app.use(errorHandler);

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

describe('GET /api/v1/settings', () => {
  it('returns 401 without a token', async () => {
    const res = await request(app).get('/api/v1/settings');
    expect(res.status).toBe(401);
    expect(res.body).toMatchObject({ success: false, message: 'Authentication required' });
  });

  it.each(['admin', 'designer', 'sales', 'client'])('lets the %s role read the singleton', async (role) => {
    const res = await request(app)
      .get('/api/v1/settings')
      .set('Authorization', `Bearer ${tokenFor(role)}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.companyName).toBe(DEFAULT_SETTINGS.companyName);
    expect(res.body.data).not.toHaveProperty('_id');
    expect(res.body.data).toHaveProperty('profitMargin');
  });
});

describe('PUT /api/v1/settings (RBAC)', () => {
  it('returns 401 without a token', async () => {
    const res = await request(app).put('/api/v1/settings').send({ profitMargin: 30 });
    expect(res.status).toBe(401);
  });

  it.each(['designer', 'sales', 'client'])('returns 403 for the non-admin %s role', async (role) => {
    const res = await request(app)
      .put('/api/v1/settings')
      .set('Authorization', `Bearer ${tokenFor(role)}`)
      .send({ profitMargin: 30 });

    expect(res.status).toBe(403);
    expect(res.body).toMatchObject({ success: false, message: 'Insufficient permissions' });
  });

  it('admin update persists, returns the new config, and refreshes the read path', async () => {
    const put = await request(app)
      .put('/api/v1/settings')
      .set('Authorization', `Bearer ${tokenFor('admin')}`)
      .send({ profitMargin: 30 });

    expect(put.status).toBe(200);
    expect(put.body.success).toBe(true);
    expect(put.body.data.profitMargin).toBe(30);

    const doc = await Settings.findById('company').lean();
    expect(doc.profitMargin).toBe(30);

    // Follow-up GET reads the refreshed config.
    const get = await request(app)
      .get('/api/v1/settings')
      .set('Authorization', `Bearer ${tokenFor('designer')}`);
    expect(get.body.data.profitMargin).toBe(30);
  });

  it('admin partial nested update preserves sibling fields', async () => {
    const res = await request(app)
      .put('/api/v1/settings')
      .set('Authorization', `Bearer ${tokenFor('admin')}`)
      .send({ labourRates: { carpenter: 1500 } });

    expect(res.status).toBe(200);
    expect(res.body.data.labourRates.carpenter).toBe(1500);
    expect(res.body.data.labourRates.painter).toBe(DEFAULT_SETTINGS.labourRates.painter);
  });

  it('admin update with an invalid value returns 400 with field errors', async () => {
    const res = await request(app)
      .put('/api/v1/settings')
      .set('Authorization', `Bearer ${tokenFor('admin')}`)
      .send({ kerf: -1 });

    expect(res.status).toBe(400);
    expect(res.body).toMatchObject({ success: false, message: 'Validation failed' });
    expect(res.body.errors.length).toBeGreaterThan(0);
  });

  it('admin update with an empty body returns 400', async () => {
    const res = await request(app)
      .put('/api/v1/settings')
      .set('Authorization', `Bearer ${tokenFor('admin')}`)
      .send({});

    expect(res.status).toBe(400);
    expect(res.body.errors.join(' ')).toContain('At least one settings field is required');
  });

  it('admin update with only unknown keys returns 400 (stripped → empty)', async () => {
    const res = await request(app)
      .put('/api/v1/settings')
      .set('Authorization', `Bearer ${tokenFor('admin')}`)
      .send({ bogus: true });

    expect(res.status).toBe(400);
  });
});
