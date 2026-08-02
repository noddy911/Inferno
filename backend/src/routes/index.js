import { Router } from 'express';
import healthRoutes from './health.routes.js';
import authRoutes from './auth.routes.js';
import settingsRoutes from '../adapters/http/routes/settings.routes.js';
import aiRoutes from '../adapters/http/routes/ai.routes.js';

const router = Router();

router.use(healthRoutes);
router.use(authRoutes);
router.use(settingsRoutes);
router.use(aiRoutes);

export default router;
