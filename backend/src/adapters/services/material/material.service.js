import { TTLCache } from '../../../shared/ttl-cache.js';
import { invalidInput, notFound, invalidState } from '../../../shared/errors.js';
import { materialSchema, materialUpdateSchema } from '../../../domain/materials/dto.js';
import * as materialRepository from '../../persistence/repositories/material.repository.js';

const SKU_CACHE_PREFIX = 'sku:';
const DEFAULT_TTL_MS = 5 * 60 * 1000;

export function createMaterialService({ ttlMs = DEFAULT_TTL_MS, clock = Date.now } = {}) {
  const cache = new TTLCache({ ttlMs, clock });

  /** Read-through cache for resolving material by SKU (heavily used during estimation). */
  async function resolveMaterialBySku(sku) {
    const uppercaseSku = sku.toUpperCase();
    const cacheKey = `${SKU_CACHE_PREFIX}${uppercaseSku}`;
    const cached = cache.get(cacheKey);
    if (cached !== undefined) return cached;

    const material = await materialRepository.findMaterialBySku(uppercaseSku);
    if (material) {
      cache.set(cacheKey, material);
    }
    return material;
  }

  /** Get materials list with filtering and pagination. */
  async function listMaterials(params) {
    return materialRepository.findMaterials(params);
  }

  /** Get material by ID. */
  async function getMaterialById(id) {
    const material = await materialRepository.findMaterialById(id);
    if (!material) {
      throw notFound('Material not found');
    }
    return material;
  }

  /** Create a new material. */
  async function addMaterial(data) {
    const parsed = materialSchema.safeParse(data);
    if (!parsed.success) {
      const errors = parsed.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`);
      throw invalidInput('Invalid material data', { errors });
    }

    // Check SKU uniqueness
    const existing = await materialRepository.findMaterialBySku(parsed.data.sku);
    if (existing) {
      throw invalidState(`Material SKU "${parsed.data.sku}" already exists`);
    }

    const material = await materialRepository.createMaterial(parsed.data);
    return material;
  }

  /** Update an existing material. */
  async function updateMaterial(id, updateData) {
    const parsed = materialUpdateSchema.safeParse(updateData);
    if (!parsed.success) {
      const errors = parsed.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`);
      throw invalidInput('Invalid material update data', { errors });
    }

    const current = await materialRepository.findMaterialById(id);
    if (!current) {
      throw notFound('Material not found');
    }

    // If SKU is being updated, check it doesn't collide
    if (parsed.data.sku && parsed.data.sku !== current.sku) {
      const existing = await materialRepository.findMaterialBySku(parsed.data.sku);
      if (existing) {
        throw invalidState(`Material SKU "${parsed.data.sku}" already exists`);
      }
    }

    const updated = await materialRepository.updateMaterial(id, parsed.data);
    
    // Invalidate SKU caches
    cache.delete(`${SKU_CACHE_PREFIX}${current.sku}`);
    if (parsed.data.sku) {
      cache.delete(`${SKU_CACHE_PREFIX}${parsed.data.sku.toUpperCase()}`);
    }

    return updated;
  }

  /** Soft delete a material. */
  async function deleteMaterial(id) {
    const current = await materialRepository.findMaterialById(id);
    if (!current) {
      throw notFound('Material not found');
    }

    const deleted = await materialRepository.softDeleteMaterial(id);
    
    // Invalidate SKU cache
    cache.delete(`${SKU_CACHE_PREFIX}${current.sku}`);

    return deleted;
  }

  return {
    listMaterials,
    getMaterialById,
    resolveMaterialBySku,
    addMaterial,
    updateMaterial,
    deleteMaterial,
    invalidateCache: () => cache.clear(),
  };
}

export const materialService = createMaterialService();
export const {
  listMaterials,
  getMaterialById,
  resolveMaterialBySku,
  addMaterial,
  updateMaterial,
  deleteMaterial,
  invalidateCache,
} = materialService;
