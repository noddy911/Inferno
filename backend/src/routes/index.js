import { Router } from 'express';
import healthRoutes from './health.routes.js';
import authRoutes from './auth.routes.js';
import settingsRoutes from '../adapters/http/routes/settings.routes.js';
import aiRoutes from '../adapters/http/routes/ai.routes.js';
import materialRoutes from '../adapters/http/routes/material.routes.js';
import calculationRoutes from '../adapters/http/routes/calculation.routes.js';
import boqRoutes from '../adapters/http/routes/boq.routes.js';
import quotationRoutes from '../adapters/http/routes/quotation.routes.js';
import reportRoutes from '../adapters/http/routes/report.routes.js';
import projectRoutes from '../adapters/http/routes/project.routes.js';

const router = Router();

router.use(healthRoutes);
router.use(authRoutes);
router.use(settingsRoutes);
router.use(aiRoutes);
router.use(materialRoutes);
router.use(calculationRoutes);
router.use(boqRoutes);
router.use(quotationRoutes);
router.use(reportRoutes);
router.use(projectRoutes);

export default router;
