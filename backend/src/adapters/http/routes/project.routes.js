import { Router } from 'express';
import { Project } from '../../persistence/mongoose/models/project.model.js';
import { Client } from '../../persistence/mongoose/models/client.model.js';
import { success } from '../../../utils/api-response.js';
import { authenticate } from '../../../middleware/auth.middleware.js';

const router = Router();

router.get('/projects', authenticate, async (req, res) => {
  const items = await Project.find().lean();
  const formattedItems = items.map((item) => ({
    ...item,
    id: item._id.toString(),
  }));
  return success(res, 'Projects retrieved successfully', formattedItems);
});

router.get('/clients', authenticate, async (req, res) => {
  const items = await Client.find().lean();
  const formattedItems = items.map((item) => ({
    ...item,
    id: item._id.toString(),
  }));
  return success(res, 'Clients retrieved successfully', formattedItems);
});

export default router;
