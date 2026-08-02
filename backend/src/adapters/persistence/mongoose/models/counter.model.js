import mongoose from 'mongoose';

const { Schema } = mongoose;

/**
 * Atomic sequence counter (design §6). One doc per key, e.g. `quotation:QTN:2026`.
 * Incremented with `findOneAndUpdate({ $inc })` so concurrent generates can never hand out
 * the same sequence (and therefore the same quotation number). Keys are scoped by prefix +
 * year so each prefix has its own sequence and each year starts fresh from `startFrom`.
 */
const counterSchema = new Schema(
  {
    _id: { type: String, required: true },
    seq: { type: Number, default: 0 },
  },
  { versionKey: false }
);

export const Counter = mongoose.model('Counter', counterSchema);
export default Counter;
