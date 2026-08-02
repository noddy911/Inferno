import mongoose from 'mongoose';
import { MATERIAL_TYPES } from '../../../../domain/measurement/recipe.schema.js';

const { Schema } = mongoose;

/**
 * Material Master. Single collection with category + type enums (design §4.1).
 * `MATERIAL_TYPES` is the shared enum from the measurement domain.
 */
const materialSchema = new Schema(
  {
    sku: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
      match: /^[A-Z0-9-]{3,20}$/,
    },
    name: { type: String, required: true, trim: true, maxlength: 120 },
    category: { type: String, enum: MATERIAL_TYPES, required: true },
    type: { type: String, required: true, trim: true },
    brand: { type: String, trim: true },
    thickness: { type: Number, min: 0 },
    sheetSize: {
      width: { type: Number, min: 1 },
      height: { type: Number, min: 1 },
    },
    unit: {
      type: String,
      enum: ['sqft', 'sqm', 'rft', 'pc', 'set', 'sheet'],
      required: true,
    },
    purchaseRate: { type: Number, min: 0, required: true },
    sellingRate: { type: Number, min: 0, required: true },
    gst: { type: Number, min: 0, max: 100, default: 0 },
    supplier: { type: String, trim: true },
    isActive: { type: Boolean, default: true },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

materialSchema.index({ category: 1, type: 1 });
materialSchema.index({ isActive: 1 });
materialSchema.index({ name: 1 });

// SKU uniqueness must ignore soft-deleted rows for future reuse, but Phase 3 keeps
// deleted materials out of new estimates rather than re-creating the same SKU.

export const Material = mongoose.model('Material', materialSchema);
export default Material;
