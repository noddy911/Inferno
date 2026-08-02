import mongoose from 'mongoose';

const { Schema } = mongoose;

/**
 * Room (persistence only in Phase 3). Dimensions in millimetres (docs/phase-3-design.md §5.1).
 */
const roomSchema = new Schema(
  {
    projectId: { type: Schema.Types.ObjectId, ref: 'Project', required: true },
    name: { type: String, required: true, trim: true, maxlength: 100 },
    width: { type: Number, min: 1 },
    length: { type: Number, min: 1 },
    height: { type: Number, min: 1 },
    wallFinish: { type: String, trim: true },
    floorFinish: { type: String, trim: true },
    ceilingFinish: { type: String, trim: true },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

roomSchema.index({ projectId: 1 });

export const Room = mongoose.model('Room', roomSchema);
export default Room;
