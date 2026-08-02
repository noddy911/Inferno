import mongoose from 'mongoose';

const { Schema } = mongoose;

/**
 * Project (persistence only in Phase 3 — used by seed-engines and later Phase 2 CRUD).
 * Status enum is provisional for seeding; Phase 2 owns the definitive workflow.
 */
export const PROJECT_STATUSES = ['new', 'design', 'in-progress', 'completed', 'cancelled'];

const projectSchema = new Schema(
  {
    clientId: { type: Schema.Types.ObjectId, ref: 'Client', required: true },
    designerId: { type: Schema.Types.ObjectId, ref: 'User' },
    projectName: { type: String, required: true, trim: true, maxlength: 160 },
    siteAddress: { type: String, trim: true },
    status: { type: String, enum: PROJECT_STATUSES, default: 'new' },
    timeline: { type: Date },
    notes: { type: String },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

projectSchema.index({ clientId: 1, createdAt: -1 });
projectSchema.index({ projectName: 'text' });

export const Project = mongoose.model('Project', projectSchema);
export default Project;
