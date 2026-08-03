import { Router } from 'express';
import { authenticate, authorize } from '../../../middleware/auth.middleware.js';
import * as RoomController from '../controllers/room.controller.js';

/**
 * @openapi
 * tags:
 *   - name: Rooms
 *     description: Rooms within a project
 */

const router = Router({ mergeParams: true });

/**
 * @openapi
 * /projects/{projectId}/rooms:
 *   get:
 *     tags: [Rooms]
 *     summary: List rooms for a project
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: projectId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Rooms retrieved successfully
 *       404:
 *         description: Project not found
 */
router.get('/', authenticate, RoomController.listRoomsHandler);

/**
 * @openapi
 * /projects/{projectId}/rooms/{id}:
 *   get:
 *     tags: [Rooms]
 *     summary: Get a room by ID
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: projectId
 *         required: true
 *         schema: { type: string }
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Room retrieved successfully
 *       404:
 *         description: Room not found
 */
router.get('/:id', authenticate, RoomController.getRoomByIdHandler);

/**
 * @openapi
 * /projects/{projectId}/rooms:
 *   post:
 *     tags: [Rooms]
 *     summary: Create a room in a project
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: projectId
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name]
 *             properties:
 *               name: { type: string }
 *               width: { type: number, description: Width in mm }
 *               length: { type: number, description: Length in mm }
 *               height: { type: number, description: Height in mm }
 *               wallFinish: { type: string }
 *               floorFinish: { type: string }
 *               ceilingFinish: { type: string }
 *     responses:
 *       201:
 *         description: Room created successfully
 */
router.post('/', authenticate, authorize('admin', 'designer'), RoomController.createRoomHandler);

/**
 * @openapi
 * /projects/{projectId}/rooms/{id}:
 *   put:
 *     tags: [Rooms]
 *     summary: Update a room
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: projectId
 *         required: true
 *         schema: { type: string }
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Room updated successfully
 */
router.put('/:id', authenticate, authorize('admin', 'designer'), RoomController.updateRoomHandler);

/**
 * @openapi
 * /projects/{projectId}/rooms/{id}:
 *   delete:
 *     tags: [Rooms]
 *     summary: Soft delete a room
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: projectId
 *         required: true
 *         schema: { type: string }
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Room deleted successfully
 */
router.delete('/:id', authenticate, authorize('admin', 'designer'), RoomController.deleteRoomHandler);

export default router;
