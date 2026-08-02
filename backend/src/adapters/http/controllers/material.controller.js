import { success, created } from '../../../utils/api-response.js';
import * as materialService from '../../services/material/material.service.js';

/**
 * GET /materials — List active materials (paginated, sorted, filterable).
 * Roles: all authenticated roles (view only)
 */
export async function listMaterialsHandler(req, res) {
  const page = req.query.page ? parseInt(req.query.page, 10) : 1;
  const pageSize = req.query.pageSize ? parseInt(req.query.pageSize, 10) : 20;
  const { category, type, q, sort } = req.query;

  const result = await materialService.listMaterials({
    page,
    pageSize,
    category,
    type,
    q,
    sort,
  });

  return success(res, 'Materials retrieved successfully', result);
}

/**
 * GET /materials/:id — Get a single material by ID.
 * Roles: all authenticated roles
 */
export async function getMaterialByIdHandler(req, res) {
  const material = await materialService.getMaterialById(req.params.id);
  return success(res, 'Material retrieved successfully', material);
}

/**
 * POST /materials — Create a new material.
 * Roles: admin, designer
 */
export async function createMaterialHandler(req, res) {
  const material = await materialService.addMaterial(req.validated.body);
  return created(res, 'Material created successfully', material);
}

/**
 * PUT /materials/:id — Update an existing material.
 * Roles: admin, designer
 */
export async function updateMaterialHandler(req, res) {
  const material = await materialService.updateMaterial(req.params.id, req.validated.body);
  return success(res, 'Material updated successfully', material);
}

/**
 * DELETE /materials/:id — Soft delete a material.
 * Roles: admin
 */
export async function deleteMaterialHandler(req, res) {
  await materialService.deleteMaterial(req.params.id);
  return success(res, 'Material deleted successfully');
}
