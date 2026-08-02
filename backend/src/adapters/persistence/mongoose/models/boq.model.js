import mongoose from 'mongoose';

const { Schema } = mongoose;

/**
 * BOQ — one document per quotation, items embedded (design §4.3).
 * Items mirror the domain BOQ lines so the repository maps 1:1 (rate/amount are the
 * display rupees; the domain keeps paise internally and the repository converts at write).
 */
const boqItemSchema = new Schema(
  {
    _id: false,
    materialId: { type: String, required: true, trim: true },
    materialName: { type: String, required: true, trim: true },
    category: { type: String, trim: true },
    type: { type: String, trim: true },
    unit: { type: String, required: true, trim: true },
    quantity: { type: Number, min: 0, required: true },
    wasteQty: { type: Number, min: 0, default: 0 },
    totalQty: { type: Number, min: 0, required: true },
    rate: { type: Number, min: 0, required: true },
    amount: { type: Number, min: 0, required: true },
  },
  { _id: false }
);

const boqSchema = new Schema(
  {
    quotationId: { type: Schema.Types.ObjectId, ref: 'Quotation', default: null, index: true },
    projectId: { type: Schema.Types.ObjectId, ref: 'Project', required: true, index: true },
    items: { type: [boqItemSchema], default: [] },
    generatedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

export const Boq = mongoose.model('Boq', boqSchema);
export default Boq;
