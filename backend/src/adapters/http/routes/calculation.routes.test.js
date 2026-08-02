import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import express from 'express';
import request from 'supertest';
import mongoose from 'mongoose';
import { signAccessToken } from '../../../utils/token.js';
import { errorHandler } from '../../../middleware/error-handler.js';
import calculationRoutes from './calculation.routes.js';

const tokenFor = (role) =>
  signAccessToken({ id: new mongoose.Types.ObjectId().toString(), role });

const app = express();
app.use(express.json());
app.use('/api/v1', calculationRoutes);
app.use(errorHandler);

describe('Stateless Calculation APIs', () => {
  describe('POST /api/v1/measurements/calculate', () => {
    it('calculates furniture measurements correctly', async () => {
      const payload = {
        boardThickness: 18,
        items: [
          {
            category: 'wardrobe',
            width: 1000,
            height: 2000,
            depth: 600,
            shelves: 3,
            drawers: 2,
            shutters: 2,
            quantity: 1,
          },
        ],
      };

      const res = await request(app)
        .post('/api/v1/measurements/calculate')
        .set('Authorization', `Bearer ${tokenFor('designer')}`)
        .send(payload);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.items).toHaveLength(1);
      expect(res.body.data.totals).toBeDefined();
      expect(res.body.data.items[0].panels.length).toBeGreaterThan(0);
    });

    it('rejects invalid category with 400', async () => {
      const payload = {
        items: [
          {
            category: 'spaceship',
            width: 1000,
            height: 2000,
            depth: 600,
          },
        ],
      };

      const res = await request(app)
        .post('/api/v1/measurements/calculate')
        .set('Authorization', `Bearer ${tokenFor('admin')}`)
        .send(payload);

      expect(res.status).toBe(400);
    });
  });

  describe('POST /api/v1/cutting/calculate', () => {
    it('nests panels correctly onto sheets', async () => {
      const payload = {
        sheetKey: '8x4',
        kerf: 3,
        panels: [
          { w: 600, d: 400, label: 'Panel A' },
          { w: 1200, d: 600, label: 'Panel B' },
        ],
      };

      const res = await request(app)
        .post('/api/v1/cutting/calculate')
        .set('Authorization', `Bearer ${tokenFor('designer')}`)
        .send(payload);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.sheetCount).toBeGreaterThan(0);
      expect(res.body.data.layout).toBeDefined();
    });

    it('throws 400 for oversized panels', async () => {
      const payload = {
        sheetKey: '8x4', // 2440 x 1220
        panels: [{ w: 5000, d: 3000, label: 'Oversized Panel' }],
      };

      const res = await request(app)
        .post('/api/v1/cutting/calculate')
        .set('Authorization', `Bearer ${tokenFor('designer')}`)
        .send(payload);

      expect(res.status).toBe(400);
      expect(res.body.code).toBe('PANEL_EXCEEDS_SHEET');
    });
  });

  describe('POST /api/v1/cost-estimation/calculate', () => {
    it('estimates cost break-down and pricing', async () => {
      const payload = {
        materialLines: [
          {
            key: 'BD-PLY-18',
            label: '18mm Plywood',
            unit: 'sheet',
            quantity: 3,
            rate: 2000,
          },
        ],
        profitMargin: 25,
        outputGstRate: 18,
      };

      const res = await request(app)
        .post('/api/v1/cost-estimation/calculate')
        .set('Authorization', `Bearer ${tokenFor('sales')}`)
        .send(payload);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.totals.costPaise).toBe(600000); // 3 * 2000 * 100 paise
      expect(res.body.data.pricing.totalPaise).toBeDefined();
    });

    it('rejects pricing out of bounds', async () => {
      const payload = {
        profitMargin: 150, // Max is 100
      };

      const res = await request(app)
        .post('/api/v1/cost-estimation/calculate')
        .set('Authorization', `Bearer ${tokenFor('designer')}`)
        .send(payload);

      expect(res.status).toBe(400);
    });
  });
});
