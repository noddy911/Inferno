import { success, created } from '../../../utils/api-response.js';
import { notFound, invalidInput } from '../../../shared/errors.js';
import { Room } from '../../persistence/mongoose/models/room.model.js';
import { Project } from '../../persistence/mongoose/models/project.model.js';
import mongoose from 'mongoose';

/**
 * GET /projects/:projectId/rooms — List rooms for a project.
 * Roles: all authenticated
 */
export async function listRoomsHandler(req, res) {
  const { projectId } = req.params;
  if (!mongoose.Types.ObjectId.isValid(projectId)) {
    throw invalidInput('Invalid project ID');
  }

  const project = await Project.findOne({ _id: projectId, deletedAt: null }).lean();
  if (!project) throw notFound('Project not found');

  const rooms = await Room.find({ projectId, deletedAt: null }).sort({ createdAt: 1 }).lean();
  const formattedRooms = rooms.map((r) => ({ ...r, id: r._id.toString() }));

  return success(res, 'Rooms retrieved successfully', formattedRooms);
}

/**
 * GET /projects/:projectId/rooms/:id — Get a single room.
 * Roles: all authenticated
 */
export async function getRoomByIdHandler(req, res) {
  const { projectId, id } = req.params;
  if (!mongoose.Types.ObjectId.isValid(projectId) || !mongoose.Types.ObjectId.isValid(id)) {
    throw invalidInput('Invalid ID');
  }

  const room = await Room.findOne({ _id: id, projectId, deletedAt: null }).lean();
  if (!room) throw notFound('Room not found');

  return success(res, 'Room retrieved successfully', { ...room, id: room._id.toString() });
}

/**
 * POST /projects/:projectId/rooms — Create a room within a project.
 * Roles: admin, designer
 */
export async function createRoomHandler(req, res) {
  const { projectId } = req.params;
  if (!mongoose.Types.ObjectId.isValid(projectId)) {
    throw invalidInput('Invalid project ID');
  }

  const project = await Project.findOne({ _id: projectId, deletedAt: null });
  if (!project) throw notFound('Project not found');

  const { name, width, length, height, wallFinish, floorFinish, ceilingFinish } = req.body;
  if (!name?.trim()) throw invalidInput('Room name is required');

  const room = await Room.create({
    projectId,
    name: name.trim(),
    width: width ? Number(width) : undefined,
    length: length ? Number(length) : undefined,
    height: height ? Number(height) : undefined,
    wallFinish,
    floorFinish,
    ceilingFinish,
  });

  return created(res, 'Room created successfully', { ...room.toObject(), id: room._id.toString() });
}

/**
 * PUT /projects/:projectId/rooms/:id — Update a room.
 * Roles: admin, designer
 */
export async function updateRoomHandler(req, res) {
  const { projectId, id } = req.params;
  if (!mongoose.Types.ObjectId.isValid(projectId) || !mongoose.Types.ObjectId.isValid(id)) {
    throw invalidInput('Invalid ID');
  }

  const room = await Room.findOne({ _id: id, projectId, deletedAt: null });
  if (!room) throw notFound('Room not found');

  const { name, width, length, height, wallFinish, floorFinish, ceilingFinish } = req.body;
  if (name !== undefined) room.name = name.trim();
  if (width !== undefined) room.width = width ? Number(width) : null;
  if (length !== undefined) room.length = length ? Number(length) : null;
  if (height !== undefined) room.height = height ? Number(height) : null;
  if (wallFinish !== undefined) room.wallFinish = wallFinish;
  if (floorFinish !== undefined) room.floorFinish = floorFinish;
  if (ceilingFinish !== undefined) room.ceilingFinish = ceilingFinish;

  await room.save();
  return success(res, 'Room updated successfully', { ...room.toObject(), id: room._id.toString() });
}

/**
 * DELETE /projects/:projectId/rooms/:id — Soft delete a room.
 * Roles: admin, designer
 */
export async function deleteRoomHandler(req, res) {
  const { projectId, id } = req.params;
  if (!mongoose.Types.ObjectId.isValid(projectId) || !mongoose.Types.ObjectId.isValid(id)) {
    throw invalidInput('Invalid ID');
  }

  const room = await Room.findOne({ _id: id, projectId, deletedAt: null });
  if (!room) throw notFound('Room not found');

  room.deletedAt = new Date();
  await room.save();
  return success(res, 'Room deleted successfully');
}
