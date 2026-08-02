import mongoose from 'mongoose';

const { Schema } = mongoose;

/**
 * Company settings — single-company singleton (design §4.4).
 * One document with _id 'company'. Fields feed every calculation engine.
 */
export const DEFAULT_SETTINGS = Object.freeze({
  _id: 'company',
  companyName: 'Spaces & Panels Interiors',
  logo: null,
  gstNumber: '27ABCDE1234F1Z5',
  currency: 'INR',
  taxes: { outputGstRate: 18 },
  profitMargin: 25,
  sheetSizes: [
    { key: '8x4', width: 2440, height: 1220, rate: 0 },
    { key: '9x4', width: 2745, height: 1220, rate: 0 },
    { key: '10x4', width: 3050, height: 1220, rate: 0 },
  ],
  kerf: 3,
  labourRates: { carpenter: 1200, painter: 900, electrician: 1000, plumber: 1000, helper: 600 },
  manufacturingRates: { cutting: 150, cnc: 60, drilling: 8, assembly: 250, painting: 45, polishing: 20 },
  additionalCharges: { transport: 1500, packaging: 800, installation: 2000, misc: 500 },
  paymentTerms: '50% advance, 30% on material dispatch, 20% on completion',
  warranty: '5 years against manufacturing defects',
  // Quotation numbering (design §4.4 extension): prefix + format template are configurable.
  // Tokens: {prefix} {year} {seq}; seq is zero-padded to seqPadding digits.
  quotationNumbering: {
    prefix: 'QTN',
    format: '{prefix}-{year}-{seq}',
    seqPadding: 4,
    startFrom: 1,
  },
});

const settingsSchema = new Schema(
  {
    _id: { type: String, default: 'company' },
    companyName: { type: String, required: true, trim: true },
    logo: { type: String, default: null },
    gstNumber: { type: String, trim: true },
    currency: { type: String, default: 'INR' },
    taxes: {
      outputGstRate: { type: Number, min: 0, max: 100, default: 18 },
    },
    profitMargin: { type: Number, min: 0, max: 100, default: 25 },
    sheetSizes: [
      {
        _id: false,
        key: { type: String, required: true },
        width: { type: Number, min: 1, required: true },
        height: { type: Number, min: 1, required: true },
        rate: { type: Number, min: 0, default: 0 },
      },
    ],
    kerf: { type: Number, min: 0, default: 3 },
    labourRates: {
      carpenter: { type: Number, min: 0, default: 0 },
      painter: { type: Number, min: 0, default: 0 },
      electrician: { type: Number, min: 0, default: 0 },
      plumber: { type: Number, min: 0, default: 0 },
      helper: { type: Number, min: 0, default: 0 },
    },
    manufacturingRates: {
      cutting: { type: Number, min: 0, default: 0 },
      cnc: { type: Number, min: 0, default: 0 },
      drilling: { type: Number, min: 0, default: 0 },
      assembly: { type: Number, min: 0, default: 0 },
      painting: { type: Number, min: 0, default: 0 },
      polishing: { type: Number, min: 0, default: 0 },
    },
    additionalCharges: {
      transport: { type: Number, min: 0, default: 0 },
      packaging: { type: Number, min: 0, default: 0 },
      installation: { type: Number, min: 0, default: 0 },
      misc: { type: Number, min: 0, default: 0 },
    },
    paymentTerms: { type: String, default: '' },
    warranty: { type: String, default: '' },
    quotationNumbering: {
      prefix: { type: String, default: 'QTN', trim: true, maxlength: 10, match: /^[A-Z0-9-]+$/i },
      format: { type: String, default: '{prefix}-{year}-{seq}', maxlength: 60 },
      seqPadding: { type: Number, min: 1, max: 12, default: 4 },
      startFrom: { type: Number, min: 1, default: 1 },
    },
  },
  { timestamps: true }
);

export const Settings = mongoose.model('Settings', settingsSchema);
export default Settings;
