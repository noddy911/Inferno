import mongoose from 'mongoose';

const { Schema } = mongoose;

/**
 * Client (persistence only in Phase 3 — used by seed-engines and later Phase 2 CRUD).
 * Fields per docs/database-schema.md.
 */
const clientSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 120 },
    phone: { type: String, trim: true },
    email: { type: String, trim: true, lowercase: true },
    address: { type: String, trim: true },
    gstNumber: { type: String, trim: true, uppercase: true },
    notes: { type: String },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

clientSchema.index({ name: 1 });
clientSchema.index({ email: 1 });
clientSchema.index({ phone: 1 });

export const Client = mongoose.model('Client', clientSchema);
export default Client;
