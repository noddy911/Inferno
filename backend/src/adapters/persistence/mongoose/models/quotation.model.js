import mongoose from 'mongoose';

const { Schema } = mongoose;

/**
 * Quotation — the persisted pricing snapshot (design §4.2).
 * `summary`/`totals`/`rooms` are frozen at generate time; later material price changes never
 * mutate a sent quotation. Items live in the companion `boq` doc (read atomically).
 * `quotationNumber` has a unique index as a backstop to the atomic counter.
 *
 * Money is stored as 2-dp rupee display values (converted from paise by the repository).
 */
const summarySchema = new Schema(
  {
    _id: false,
    subtotal: { type: Number, min: 0, required: true },
    discountType: { type: String, enum: ['flat', 'percent', null], default: null },
    discountValue: { type: Number, min: 0, default: 0 },
    discount: { type: Number, min: 0, default: 0 },
    taxable: { type: Number, min: 0, required: true },
    gstRate: { type: Number, min: 0, max: 100, required: true },
    gst: { type: Number, min: 0, required: true },
    total: { type: Number, min: 0, required: true },
  },
  { _id: false }
);

const totalsSchema = new Schema(
  {
    _id: false,
    totalCost: { type: Number, min: 0, required: true },
    profit: { type: Number, min: 0, required: true },
    profitPercent: { type: Number, default: 0 },
    marginBase: { type: Number, min: 0, required: true },
  },
  { _id: false }
);

const labourTradeSchema = new Schema(
  {
    _id: false,
    carpenter: { type: Number, min: 0, default: 0 },
    painter: { type: Number, min: 0, default: 0 },
    electrician: { type: Number, min: 0, default: 0 },
    plumber: { type: Number, min: 0, default: 0 },
    helper: { type: Number, min: 0, default: 0 },
  },
  { _id: false }
);

/** Cost-component snapshot (₹), for reports (labour/material/profit). */
const costsSchema = new Schema(
  {
    _id: false,
    material: { type: Number, min: 0, default: 0 },
    manufacturing: { type: Number, min: 0, default: 0 },
    labour: { type: Number, min: 0, default: 0 },
    additional: { type: Number, min: 0, default: 0 },
    labourByTrade: { type: labourTradeSchema, default: () => ({}) },
  },
  { _id: false }
);

const roomSchema = new Schema(
  {
    _id: false,
    roomId: { type: Schema.Types.ObjectId, ref: 'Room', required: true },
    name: { type: String, required: true, trim: true },
    roomTotal: { type: Number, min: 0, required: true }, // priced room total, ₹
  },
  { _id: false }
);

const quotationSchema = new Schema(
  {
    quotationNumber: { type: String, required: true, unique: true, trim: true },
    projectId: { type: Schema.Types.ObjectId, ref: 'Project', required: true, index: true },
    clientId: { type: Schema.Types.ObjectId, ref: 'Client', required: true, index: true },
    status: {
      type: String,
      enum: ['draft', 'sent', 'accepted', 'rejected', 'revised'],
      default: 'draft',
      index: true,
    },
    summary: { type: summarySchema, required: true },
    totals: { type: totalsSchema, required: true },
    rooms: { type: [roomSchema], default: [] },
    costs: { type: costsSchema, default: () => ({}) },
    paymentTerms: { type: String, default: '' },
    warranty: { type: String, default: '' },
    notes: { type: String, default: '' },
    signatureUrl: { type: String, default: null },
    issuedAt: { type: Date, required: true },
    validUntil: { type: Date, default: null },
    revisionOf: { type: Schema.Types.ObjectId, ref: 'Quotation', default: null, index: true },
  },
  { timestamps: true }
);

quotationSchema.index({ status: 1, createdAt: 1 });

export const Quotation = mongoose.model('Quotation', quotationSchema);
export default Quotation;
