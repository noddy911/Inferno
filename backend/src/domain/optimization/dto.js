/**
 * Material Optimization (Cutting) Engine DTOs.
 *
 * The engine is pure and stateless: `cutPanels(input)` → sheet layout + waste figures.
 * Panels are individual cut pieces (already aggregated/expanded by the caller — the BOQ
 * orchestrator groups measurement output by material+thickness and expands counts before
 * calling this engine). `sheetSizes` is optional config mirroring the Settings singleton;
 * it defaults to 8x4 / 9x4 / 10x4.
 *
 * The engine never auto-splits a panel — an oversized piece throws a DomainError naming it.
 */

import { z } from 'zod';

/** One rectangular cut piece. Dimensions in mm. */
export const panelInputSchema = z.object({
  w: z.number().positive().max(20000),
  d: z.number().positive().max(20000),
  label: z.string().min(1).max(80).optional(),
});

/** A sheet size the shop can procure, keyed like `8x4`. */
export const sheetSizeSchema = z.object({
  key: z.string().min(1).max(20),
  width: z.number().positive().max(20000),
  height: z.number().positive().max(20000),
});

/** Engine input. `kerf` is the saw blade thickness reserved between panels (default 3 mm). */
export const cutInputSchema = z.object({
  panels: z.array(panelInputSchema).min(1).max(10000),
  sheetKey: z.string().min(1).max(20),
  kerf: z.number().min(0).max(50).default(3),
  sheetSizes: z.array(sheetSizeSchema).optional(),
});

/**
 * @typedef {z.infer<typeof panelInputSchema>} PanelInput
 * @typedef {z.infer<typeof sheetSizeSchema>} SheetSize
 * @typedef {z.infer<typeof cutInputSchema>} CutInput
 */

/**
 * One placed panel inside a sheet layout. Coordinates are from the sheet's top-left.
 * @typedef {object} PlacedPanel
 * @property {string} label
 * @property {number} x mm from the sheet left edge
 * @property {number} y mm from the sheet top
 * @property {number} w placed width (mm) — after rotation this may be the input `d`
 * @property {number} d placed depth/height (mm) — after rotation this may be the input `w`
 * @property {boolean} rotated whether the piece was rotated 90°
 */

/**
 * A leftover rectangle, in mm, from the sheet's top-left corner.
 * @typedef {object} LeftoverRect
 * @property {number} x
 * @property {number} y
 * @property {number} w
 * @property {number} h
 */

/**
 * @typedef {object} CutResult
 * @property {string} sheetKey requested sheet size key
 * @property {SheetSize} sheetSize resolved dimensions
 * @property {number} sheetCount number of sheets consumed
 * @property {Array<{sheet:number, panels: PlacedPanel[]}>} layout one entry per sheet
 * @property {number} usedArea sqm of actual panel area
 * @property {number} wasteArea sqm of sheet area not turned into panels (incl. kerf)
 * @property {number} wastePct waste as a percentage of total sheet area (0–100)
 * @property {LeftoverRect|null} remainingMaterial largest usable leftover rectangle
 * @property {{sheetKey:string,width:number,height:number}|null} nextSizeHint present when
 *   wastePct > 35% and a larger sheet size exists
 */
