import { Material } from '../mongoose/models/material.model.js';

/**
 * Material Repository — manages database access for the Material Master (design §4.1).
 * Considers soft deletion and handles querying, pagination, and updates.
 */

/**
 * Query active materials with filtering, sorting, and pagination.
 * @param {object} params
 * @param {number} [params.page=1]
 * @param {number} [params.pageSize=20]
 * @param {string} [params.category]
 * @param {string} [params.type]
 * @param {string} [params.q]
 * @param {string} [params.sort] - Field name, optional prefix "-" for desc (e.g. "-purchaseRate" or "name")
 * @returns {Promise<{ items: any[], total: number, page: number, pageSize: number }>}
 */
export async function findMaterials({ page = 1, pageSize = 20, category, type, q, sort }) {
  const filter = { isActive: true, deletedAt: null };

  if (category) {
    filter.category = category;
  }
  if (type) {
    filter.type = type;
  }
  if (q) {
    const searchRegex = new RegExp(q.trim(), 'i');
    filter.$or = [
      { name: searchRegex },
      { sku: searchRegex },
    ];
  }

  const query = Material.find(filter);

  // Sorting
  if (sort) {
    query.sort(sort);
  } else {
    query.sort({ createdAt: -1 }); // Default new-first
  }

  // Pagination
  const skip = (page - 1) * pageSize;
  query.skip(skip).limit(pageSize);

  const [items, total] = await Promise.all([
    query.lean(),
    Material.countDocuments(filter),
  ]);

  return {
    items,
    total,
    page,
    pageSize,
  };
}

/**
 * Fetch a single active material by ID.
 * @param {string} id
 * @returns {Promise<any | null>}
 */
export async function findMaterialById(id) {
  return Material.findOne({ _id: id, isActive: true, deletedAt: null }).lean();
}

/**
 * Fetch a single active material by SKU.
 * @param {string} sku
 * @returns {Promise<any | null>}
 */
export async function findMaterialBySku(sku) {
  return Material.findOne({ sku: sku.toUpperCase(), isActive: true, deletedAt: null }).lean();
}

/**
 * Create a new material.
 * @param {object} data
 * @returns {Promise<any>}
 */
export async function createMaterial(data) {
  return Material.create(data);
}

/**
 * Update an existing material.
 * @param {string} id
 * @param {object} data
 * @returns {Promise<any | null>}
 */
export async function updateMaterial(id, data) {
  return Material.findOneAndUpdate(
    { _id: id, isActive: true, deletedAt: null },
    { $set: data },
    { returnDocument: 'after', runValidators: true }
  ).lean();
}

/**
 * Soft delete a material.
 * @param {string} id
 * @returns {Promise<any | null>}
 */
export async function softDeleteMaterial(id) {
  return Material.findOneAndUpdate(
    { _id: id, isActive: true, deletedAt: null },
    { $set: { isActive: false, deletedAt: new Date() } },
    { returnDocument: 'after' }
  ).lean();
}
