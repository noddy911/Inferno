import { Router } from 'express';
import { authenticate, authorize } from '../../../middleware/auth.middleware.js';
import * as ClientController from '../controllers/client.controller.js';
import * as ProjectController from '../controllers/project.controller.js';

/**
 * @openapi
 * tags:
 *   - name: Clients
 *     description: Client management
 *   - name: Projects
 *     description: Project management
 */

const router = Router();

// ─────────────────────────────────────────────────────────────────
//  CLIENT ROUTES
// ─────────────────────────────────────────────────────────────────

/**
 * @openapi
 * /clients:
 *   get:
 *     tags: [Clients]
 *     summary: List clients
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: pageSize
 *         schema: { type: integer, default: 20 }
 *       - in: query
 *         name: search
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Clients retrieved successfully
 */
router.get('/clients', authenticate, ClientController.listClientsHandler);

/**
 * @openapi
 * /clients/{id}:
 *   get:
 *     tags: [Clients]
 *     summary: Get client by ID
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Client retrieved successfully
 *       404:
 *         description: Client not found
 */
router.get('/clients/:id', authenticate, ClientController.getClientByIdHandler);

/**
 * @openapi
 * /clients:
 *   post:
 *     tags: [Clients]
 *     summary: Create a client
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name]
 *             properties:
 *               name: { type: string }
 *               phone: { type: string }
 *               email: { type: string }
 *               address: { type: string }
 *               gstNumber: { type: string }
 *               notes: { type: string }
 *     responses:
 *       201:
 *         description: Client created successfully
 */
router.post('/clients', authenticate, authorize('admin', 'designer'), ClientController.createClientHandler);

/**
 * @openapi
 * /clients/{id}:
 *   put:
 *     tags: [Clients]
 *     summary: Update a client
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Client updated successfully
 */
router.put('/clients/:id', authenticate, authorize('admin', 'designer'), ClientController.updateClientHandler);

/**
 * @openapi
 * /clients/{id}:
 *   delete:
 *     tags: [Clients]
 *     summary: Soft delete a client
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Client deleted successfully
 */
router.delete('/clients/:id', authenticate, authorize('admin'), ClientController.deleteClientHandler);

// ─────────────────────────────────────────────────────────────────
//  PROJECT ROUTES
// ─────────────────────────────────────────────────────────────────

/**
 * @openapi
 * /projects:
 *   get:
 *     tags: [Projects]
 *     summary: List projects
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: pageSize
 *         schema: { type: integer, default: 20 }
 *       - in: query
 *         name: search
 *         schema: { type: string }
 *       - in: query
 *         name: status
 *         schema: { type: string, enum: [new, design, in-progress, completed, cancelled] }
 *       - in: query
 *         name: clientId
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Projects retrieved successfully
 */
router.get('/projects', authenticate, ProjectController.listProjectsHandler);

/**
 * @openapi
 * /projects/{id}:
 *   get:
 *     tags: [Projects]
 *     summary: Get project by ID
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Project retrieved successfully
 *       404:
 *         description: Project not found
 */
router.get('/projects/:id', authenticate, ProjectController.getProjectByIdHandler);

/**
 * @openapi
 * /projects:
 *   post:
 *     tags: [Projects]
 *     summary: Create a project
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [projectName, clientId]
 *             properties:
 *               projectName: { type: string }
 *               clientId: { type: string }
 *               designerId: { type: string }
 *               siteAddress: { type: string }
 *               status: { type: string, enum: [new, design, in-progress, completed, cancelled] }
 *               timeline: { type: string, format: date }
 *               notes: { type: string }
 *     responses:
 *       201:
 *         description: Project created successfully
 */
router.post('/projects', authenticate, authorize('admin', 'designer'), ProjectController.createProjectHandler);

/**
 * @openapi
 * /projects/{id}:
 *   put:
 *     tags: [Projects]
 *     summary: Update a project
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Project updated successfully
 */
router.put('/projects/:id', authenticate, authorize('admin', 'designer'), ProjectController.updateProjectHandler);

/**
 * @openapi
 * /projects/{id}:
 *   delete:
 *     tags: [Projects]
 *     summary: Soft delete a project
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Project deleted successfully
 */
router.delete('/projects/:id', authenticate, authorize('admin'), ProjectController.deleteProjectHandler);

export default router;
