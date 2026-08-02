import mongoose from 'mongoose';
import { FURNITURE_CATEGORIES } from '../../../../domain/measurement/recipe.schema.js';

const { Schema } = mongoose;

/**
 * Furniture item (persistence only in Phase 3). Dimensions in millimetres.
 * `category` mirrors the measurement recipes; `quantity` is the repetition count
 * the measurement engine multiplies by (design §4.5 / §5.2).
 */
const furnitureSchema = new Schema(
  {
    roomId: { type: Schema.Types.ObjectId, ref: 'Room', required: true },
    category: { type: String, enum: FURNITURE_CATEGORIES, required: true, index: true },
    name: { type: String, trim: true },
    width: { type: Number, min: 1 },
    height: { type: Number, min: 1 },
    depth: { type: Number, min: 1 },
    shelves: { type: Number, min: 0, default: 0 },
    drawers: { type: Number, min: 0, default: 0 },
    shutters: { type: Number, min: 0, default: 0 },
    quantity: { type: Number, min: 1, default: 1 },
    materialId: { type: Schema.Types.ObjectId, ref: 'Material' },
    finish: { type: String, trim: true },
    hardware: { type: String, trim: true },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

furnitureSchema.index({ roomId: 1 });

export const Furniture = mongoose.model('Furniture', furnitureSchema);
export default Furniture;
