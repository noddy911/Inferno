import { success, created } from '../../../utils/api-response.js';
import { notFound, invalidInput } from '../../../shared/errors.js';
import { Project, PROJECT_STATUSES } from '../../persistence/mongoose/models/project.model.js';
import { Client } from '../../persistence/mongoose/models/client.model.js';
import mongoose from 'mongoose';

/**
 * GET /projects — List projects with pagination, optional filters.
 * Roles: all authenticated
 */
export async function listProjectsHandler(req, res) {
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const pageSize = Math.min(100, Math.max(1, parseInt(req.query.pageSize, 10) || 20));
  const search = req.query.search?.trim() || '';
  const status = req.query.status?.trim() || '';
  const clientId = req.query.clientId?.trim() || '';

  const filter = { deletedAt: null };
  if (search) {
    filter.$or = [{ projectName: { $regex: search, $options: 'i' } }];
  }
  if (status && PROJECT_STATUSES.includes(status)) {
    filter.status = status;
  }
  if (clientId && mongoose.Types.ObjectId.isValid(clientId)) {
    filter.clientId = clientId;
  }

  const [items, total] = await Promise.all([
    Project.find(filter)
      .populate('clientId', 'name email phone')
      .populate('designerId', 'name email')
      .sort({ createdAt: -1 })
      .skip((page - 1) * pageSize)
      .limit(pageSize)
      .lean(),
    Project.countDocuments(filter),
  ]);

  const formattedItems = items.map((p) => ({
    ...p,
    id: p._id.toString(),
    client: p.clientId ? { ...p.clientId, id: p.clientId._id?.toString() } : null,
    designer: p.designerId ? { ...p.designerId, id: p.designerId._id?.toString() } : null,
  }));

  return success(res, 'Projects retrieved successfully', { items: formattedItems, total, page, pageSize });
}

/**
 * GET /projects/:id — Get a single project.
 * Roles: all authenticated
 */
export async function getProjectByIdHandler(req, res) {
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    throw invalidInput('Invalid project ID');
  }
  const project = await Project.findOne({ _id: req.params.id, deletedAt: null })
    .populate('clientId', 'name email phone')
    .populate('designerId', 'name email')
    .lean();
  if (!project) throw notFound('Project not found');

  return success(res, 'Project retrieved successfully', {
    ...project,
    id: project._id.toString(),
    client: project.clientId ? { ...project.clientId, id: project.clientId._id?.toString() } : null,
    designer: project.designerId ? { ...project.designerId, id: project.designerId._id?.toString() } : null,
  });
}

/**
 * POST /projects — Create a new project.
 * Roles: admin, designer
 */
export async function createProjectHandler(req, res) {
  const { projectName, clientId, designerId, siteAddress, status, timeline, notes } = req.body;

  if (!projectName?.trim()) throw invalidInput('Project name is required');
  if (!clientId || !mongoose.Types.ObjectId.isValid(clientId)) {
    throw invalidInput('A valid client ID is required');
  }

  // Validate client exists
  const client = await Client.findOne({ _id: clientId, deletedAt: null });
  if (!client) throw notFound('Client not found');

  const project = await Project.create({
    projectName: projectName.trim(),
    clientId,
    designerId: designerId || null,
    siteAddress,
    status: status && PROJECT_STATUSES.includes(status) ? status : 'new',
    timeline: timeline ? new Date(timeline) : undefined,
    notes,
  });

  const populated = await Project.findById(project._id)
    .populate('clientId', 'name email phone')
    .populate('designerId', 'name email')
    .lean();

  return created(res, 'Project created successfully', {
    ...populated,
    id: populated._id.toString(),
    client: populated.clientId ? { ...populated.clientId, id: populated.clientId._id?.toString() } : null,
  });
}

/**
 * PUT /projects/:id — Update a project.
 * Roles: admin, designer
 */
export async function updateProjectHandler(req, res) {
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    throw invalidInput('Invalid project ID');
  }
  const project = await Project.findOne({ _id: req.params.id, deletedAt: null });
  if (!project) throw notFound('Project not found');

  const { projectName, clientId, designerId, siteAddress, status, timeline, notes } = req.body;

  if (projectName !== undefined) project.projectName = projectName.trim();
  if (clientId !== undefined) {
    if (!mongoose.Types.ObjectId.isValid(clientId)) throw invalidInput('Invalid client ID');
    const client = await Client.findOne({ _id: clientId, deletedAt: null });
    if (!client) throw notFound('Client not found');
    project.clientId = clientId;
  }
  if (designerId !== undefined) project.designerId = designerId || null;
  if (siteAddress !== undefined) project.siteAddress = siteAddress;
  if (status !== undefined) {
    if (!PROJECT_STATUSES.includes(status)) throw invalidInput(`Invalid status. Must be one of: ${PROJECT_STATUSES.join(', ')}`);
    project.status = status;
  }
  if (timeline !== undefined) project.timeline = timeline ? new Date(timeline) : null;
  if (notes !== undefined) project.notes = notes;

  await project.save();

  const populated = await Project.findById(project._id)
    .populate('clientId', 'name email phone')
    .populate('designerId', 'name email')
    .lean();

  return success(res, 'Project updated successfully', {
    ...populated,
    id: populated._id.toString(),
    client: populated.clientId ? { ...populated.clientId, id: populated.clientId._id?.toString() } : null,
  });
}

/**
 * DELETE /projects/:id — Soft delete a project.
 * Roles: admin
 */
export async function deleteProjectHandler(req, res) {
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    throw invalidInput('Invalid project ID');
  }
  const project = await Project.findOne({ _id: req.params.id, deletedAt: null });
  if (!project) throw notFound('Project not found');

  project.deletedAt = new Date();
  await project.save();
  return success(res, 'Project deleted successfully');
}
