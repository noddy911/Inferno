import { success, created } from '../../../utils/api-response.js';
import { notFound, invalidInput } from '../../../shared/errors.js';
import { Client } from '../../persistence/mongoose/models/client.model.js';
import mongoose from 'mongoose';

/**
 * GET /clients — List clients with pagination and search.
 * Roles: all authenticated
 */
export async function listClientsHandler(req, res) {
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const pageSize = Math.min(100, Math.max(1, parseInt(req.query.pageSize, 10) || 20));
  const search = req.query.search?.trim() || '';

  const filter = { deletedAt: null };
  if (search) {
    filter.$or = [
      { name: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } },
      { phone: { $regex: search, $options: 'i' } },
    ];
  }

  const [items, total] = await Promise.all([
    Client.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * pageSize)
      .limit(pageSize)
      .lean(),
    Client.countDocuments(filter),
  ]);

  const formattedItems = items.map((c) => ({ ...c, id: c._id.toString() }));
  return success(res, 'Clients retrieved successfully', { items: formattedItems, total, page, pageSize });
}

/**
 * GET /clients/:id — Get a single client.
 * Roles: all authenticated
 */
export async function getClientByIdHandler(req, res) {
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    throw invalidInput('Invalid client ID');
  }
  const client = await Client.findOne({ _id: req.params.id, deletedAt: null }).lean();
  if (!client) throw notFound('Client not found');
  return success(res, 'Client retrieved successfully', { ...client, id: client._id.toString() });
}

/**
 * POST /clients — Create a new client.
 * Roles: admin, designer
 */
export async function createClientHandler(req, res) {
  const { name, phone, email, address, gstNumber, notes } = req.body;
  if (!name?.trim()) throw invalidInput('Client name is required');

  const client = await Client.create({ name: name.trim(), phone, email, address, gstNumber, notes });
  return created(res, 'Client created successfully', { ...client.toObject(), id: client._id.toString() });
}

/**
 * PUT /clients/:id — Update a client.
 * Roles: admin, designer
 */
export async function updateClientHandler(req, res) {
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    throw invalidInput('Invalid client ID');
  }
  const client = await Client.findOne({ _id: req.params.id, deletedAt: null });
  if (!client) throw notFound('Client not found');

  const { name, phone, email, address, gstNumber, notes } = req.body;
  if (name !== undefined) client.name = name.trim();
  if (phone !== undefined) client.phone = phone;
  if (email !== undefined) client.email = email;
  if (address !== undefined) client.address = address;
  if (gstNumber !== undefined) client.gstNumber = gstNumber;
  if (notes !== undefined) client.notes = notes;

  await client.save();
  return success(res, 'Client updated successfully', { ...client.toObject(), id: client._id.toString() });
}

/**
 * DELETE /clients/:id — Soft delete a client.
 * Roles: admin
 */
export async function deleteClientHandler(req, res) {
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    throw invalidInput('Invalid client ID');
  }
  const client = await Client.findOne({ _id: req.params.id, deletedAt: null });
  if (!client) throw notFound('Client not found');

  client.deletedAt = new Date();
  await client.save();
  return success(res, 'Client deleted successfully');
}
