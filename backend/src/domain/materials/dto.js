import { z } from 'zod';

export const materialCategoryEnum = z.enum(['board', 'finish', 'hardware', 'countertop', 'other']);
export const materialUnitEnum = z.enum(['sqft', 'sqm', 'rft', 'pc', 'set', 'sheet']);

export const materialSchema = z.object({
  sku: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z0-9-]{3,20}$/, {
      message: 'SKU must be 3-20 characters, alphanumeric, and may contain hyphens.',
    }),
  name: z.string().trim().min(1).max(120),
  category: materialCategoryEnum,
  type: z.string().trim().min(1).max(50),
  brand: z.string().trim().max(120).optional(),
  thickness: z.number().min(0).optional(),
  sheetSize: z
    .object({
      width: z.number().min(1),
      height: z.number().min(1),
    })
    .optional(),
  unit: materialUnitEnum,
  purchaseRate: z.number().min(0),
  sellingRate: z.number().min(0),
  gst: z.number().min(0).max(100).default(0),
  supplier: z.string().trim().max(120).optional(),
  isActive: z.boolean().default(true),
});

export const materialUpdateSchema = materialSchema.partial().refine(
  (value) => Object.keys(value).length > 0,
  {
    message: 'At least one field must be updated.',
    path: ['body'],
  }
);

/**
 * @typedef {z.infer<typeof materialSchema>} MaterialDto
 * @typedef {z.infer<typeof materialUpdateSchema>} MaterialUpdateDto
 */
