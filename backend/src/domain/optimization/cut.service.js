/**
 * Material Optimization (Cutting) Engine — pure domain service.
 *
 * Shelf-based first-fit-decreasing (FFD) nesting with 90° rotation, kerf-aware
 * placement, and a residual-refinement pass that re-hosts orphaned panels into the
 * leftover strips of earlier sheets. Deterministic, polynomial-time approximation —
 * it never splits a panel (splitting changes joinery), never uses randomness, and
 * throws a DomainError naming the panel when a panel cannot fit the sheet in either
 * orientation.
 *
 * Algorithm (design §5.3):
 *   1. Sort panels by their longest side, descending.
 *   2. Place into horizontal shelves; a panel starts a new shelf when it cannot fit the
 *      current shelf's remaining width.
 *   3. Try both orientations; prefer the one with the smaller residual width.
 *   4. Each cut reserves `kerf` (default 3 mm) between panels; a shelf's height is the
 *      tallest panel in it.
 *   5. Residual refinement: panels stranded alone on a shelf/sheet are re-homed into
 *      right-edge strips of earlier sheets, freeing whole sheets when possible.
 *   6. Report waste (1 − used/sheetArea) and the largest leftover rectangle.
 */

import { invalidInput, panelExceedsSheet } from '../../shared/errors.js';
import { cutInputSchema } from './dto.js';

/** Default sheet catalogue — mirrors the seeded Settings sheetSizes (design §4.4). */
export const DEFAULT_SHEET_SIZES = Object.freeze([
  { key: '8x4', width: 2440, height: 1220 },
  { key: '9x4', width: 2745, height: 1220 },
  { key: '10x4', width: 3050, height: 1220 },
]);

/** Above this waste percentage the result suggests the next sheet size up. */
export const WASTE_HINT_THRESHOLD = 35;

const labelOf = (p) => p.label ?? `${Math.round(p.w)}×${Math.round(p.d)}`;

/**
 * Nest a batch of panels onto standard sheets.
 * @param {import('./dto.js').CutInput} input
 * @returns {import('./dto.js').CutResult}
 */
export function cutPanels(input) {
  const { panels, sheetKey, kerf, sheetSizes } = cutInputSchema.parse(input);
  const sizes = sheetSizes && sheetSizes.length ? sheetSizes : DEFAULT_SHEET_SIZES;
  const sheet = sizes.find((s) => s.key === sheetKey);
  if (!sheet) throw invalidInput(`Unknown sheet size "${sheetKey}"`, { sheetKey });

  const sheetW = sheet.width;
  const sheetH = sheet.height;

  // A panel must fit in at least one orientation — never auto-split (design §5.3).
  for (const p of panels) {
    const fits = (p.w <= sheetW && p.d <= sheetH) || (p.d <= sheetW && p.w <= sheetH);
    if (!fits) throw panelExceedsSheet(labelOf(p), { width: sheetW, height: sheetH });
  }

  const sheets = pack(panels, sheetW, sheetH, kerf);
  const refined = refineSheets(sheets, sheetW, sheetH, kerf);

  const sheetArea = sheetW * sheetH;
  const totalSheetArea = refined.length * sheetArea;
  const usedArea = panels.reduce((sum, p) => sum + p.w * p.d, 0);
  const wasteArea = Math.max(0, totalSheetArea - usedArea);
  const wastePct = (wasteArea / totalSheetArea) * 100;

  const largest = largestLeftoverAcrossSheets(refined, sheetW, sheetH, kerf);

  // `origW/origD` are internal bookkeeping for the rotation flag; strip from output.
  const toPlacedPanel = (p) => {
    delete p.origW;
    delete p.origD;
    return p;
  };

  return {
    sheetKey,
    sheetSize: { key: sheet.key, width: sheetW, height: sheetH },
    sheetCount: refined.length,
    layout: refined.map((s) => ({
      sheet: s.sheetIndex,
      panels: s.shelves.flatMap((sh) => sh.panels).map(toPlacedPanel),
    })),
    usedArea: usedArea / 1_000_000,
    wasteArea: wasteArea / 1_000_000,
    wastePct: Number(wastePct.toFixed(4)),
    remainingMaterial: largest,
    nextSizeHint: nextSizeHint(sheetKey, sizes, wastePct),
  };
}

/** @param {string} sheetKey @param {Array<{key:string,width:number,height:number}>} sizes */
function nextSizeHint(sheetKey, sizes, wastePct) {
  if (wastePct <= WASTE_HINT_THRESHOLD) return null;
  const idx = sizes.findIndex((s) => s.key === sheetKey);
  if (idx === -1 || idx === sizes.length - 1) return null;
  const next = sizes[idx + 1];
  return { sheetKey: next.key, width: next.width, height: next.height };
}

/**
 * Primary shelf-based FFD pass. Returns sheets each holding `shelves` (horizontal bands)
 * of placed panels. Sheet `usedHeight` tracks the bottom of the last shelf band.
 */
function pack(panels, sheetW, sheetH, kerf) {
  const sorted = [...panels].sort((a, b) => {
    const am = Math.max(a.w, a.d);
    const bm = Math.max(b.w, b.d);
    return bm - am || labelOf(a).localeCompare(labelOf(b));
  });

  /** @type {Array<{sheetIndex:number,width:number,height:number,shelves:Array,usedHeight:number}>} */
  const sheets = [];
  let current = null;
  let shelf = null;

  const startSheet = () => {
    current = {
      sheetIndex: sheets.length,
      width: sheetW,
      height: sheetH,
      shelves: [],
      usedHeight: 0,
    };
    sheets.push(current);
  };

  const newShelf = (topY) => {
    const s = { topY, x: 0, maxH: 0, panels: [] };
    current.shelves.push(s);
    return s;
  };

  const bestFit = (pw, pd, x0, topY) => {
    const opts = [];
    for (const t of [
      { pw, pd, rotated: false },
      { pw: pd, pd: pw, rotated: true },
    ]) {
      if (x0 + t.pw <= sheetW + 1e-9 && topY + t.pd <= sheetH + 1e-9) {
        opts.push({ ...t, residual: sheetW - (x0 + t.pw) });
      }
    }
    if (!opts.length) return null;
    // Prefer the orientation with the smaller residual width; ties → non-rotated.
    opts.sort((a, b) => a.residual - b.residual || a.rotated - b.rotated);
    return opts[0];
  };

  const place = (p, o) => {
    shelf.panels.push({
      label: labelOf(p),
      origW: p.w,
      origD: p.d,
      x: shelf.x,
      y: shelf.topY,
      w: o.pw,
      d: o.pd,
      rotated: o.pw !== p.w, // rotated ⇔ placed width is the original height
    });
    shelf.x += o.pw + kerf;
    shelf.maxH = Math.max(shelf.maxH, o.pd);
  };

  for (const p of sorted) {
    if (!current) {
      startSheet();
      shelf = newShelf(0);
    }

    // 1. Try the current shelf.
    let o = bestFit(p.w, p.d, shelf.x, shelf.topY);
    if (o) {
      place(p, o);
      continue;
    }

    // 2. Try a new shelf in the current sheet.
    const newTop = shelf.panels.length ? shelf.topY + shelf.maxH + kerf : 0;
    o = bestFit(p.w, p.d, 0, newTop);
    if (o) {
      current.usedHeight = shelf.topY + shelf.maxH;
      shelf = newShelf(newTop);
      place(p, o);
      continue;
    }

    // 3. Open a new sheet (the oversized pre-check guarantees a fit here).
    current.usedHeight = shelf.topY + shelf.maxH;
    startSheet();
    shelf = newShelf(0);
    place(p, bestFit(p.w, p.d, 0, 0));
  }

  if (current && shelf) current.usedHeight = shelf.topY + shelf.maxH;
  return sheets;
}

/**
 * Residual refinement: a panel that landed alone on a shelf of a later sheet is re-homed
 * into a right-edge strip of an earlier sheet when it fits, freeing its original
 * shelf/sheet. Deterministic: candidates are processed smallest-first, each against the
 * smallest fitting strip of the earliest possible sheet, recomputing strips live so two
 * relocations can never overlap. Sheets left empty are dropped.
 */
function refineSheets(sheets, sheetW, sheetH, kerf) {
  if (sheets.length <= 1) return sheets;

  /** @type {Array<{sheet:object, shelf:object, panel:object}>} */
  const candidates = [];
  for (const sheet of sheets) {
    if (sheet.sheetIndex === 0) continue;
    for (const sh of sheet.shelves) {
      if (sh.panels.length === 1) candidates.push({ sheet, shelf: sh, panel: sh.panels[0] });
    }
  }
  candidates.sort(
    (a, b) =>
      a.panel.w * a.panel.d - b.panel.w * b.panel.d ||
      labelOf(a.panel).localeCompare(labelOf(b.panel))
  );

  for (const cand of candidates) {
    let best = null;

    for (let si = 0; si < cand.sheet.sheetIndex; si++) {
      const target = sheets[si];
      for (const sh of target.shelves) {
        const last = sh.panels[sh.panels.length - 1];
        if (!last) continue;
        const rx = last.x + last.w + kerf;
        const rw = sheetW - rx;
        if (rw <= 0) continue;

        const normal = cand.panel.w <= rw && cand.panel.d <= sh.maxH;
        const rotated = cand.panel.d <= rw && cand.panel.w <= sh.maxH;
        if (!normal && !rotated) continue;

        const area = rw * sh.maxH;
        if (!best || area < best.area) {
          best = { shelf: sh, x: rx, topY: sh.topY, area, rotated: rotated && !normal };
        }
      }
    }
    if (!best) continue;

    const pw = best.rotated ? cand.panel.d : cand.panel.w;
    const pd = best.rotated ? cand.panel.w : cand.panel.d;
    best.shelf.panels.push({
      label: cand.panel.label,
      origW: cand.panel.origW,
      origD: cand.panel.origD,
      x: best.x,
      y: best.topY,
      w: pw,
      d: pd,
      rotated: pw !== cand.panel.origW,
    });
    best.shelf.x = best.x + pw + kerf;
    best.shelf.maxH = Math.max(best.shelf.maxH, pd);
    cand.shelf.panels = []; // free the original slot
  }

  // Drop empty shelves and empty sheets; re-index survivors.
  const kept = [];
  for (const sheet of sheets) {
    sheet.shelves = sheet.shelves.filter((sh) => sh.panels.length > 0);
    if (!sheet.shelves.length) continue;
    const last = sheet.shelves[sheet.shelves.length - 1];
    sheet.usedHeight = last.topY + last.maxH;
    kept.push(sheet);
  }
  kept.forEach((s, i) => {
    s.sheetIndex = i;
  });
  return kept;
}

/**
 * Largest usable leftover rectangle across all sheets. Only right-edge strips of each
 * shelf band plus the full-width strip below the last shelf are considered (per design
 * §5.3 "largest usable leftover rect" — the shelf structure bounds the search).
 */
function largestLeftoverAcrossSheets(sheets, sheetW, sheetH, kerf) {
  /** @type {{x:number,y:number,w:number,h:number}|null} */
  let best = null;
  const consider = (r) => {
    if (r.w > 0 && r.h > 0 && (!best || r.w * r.h > best.w * best.h)) best = r;
  };

  for (const sheet of sheets) {
    for (const sh of sheet.shelves) {
      const last = sh.panels[sh.panels.length - 1];
      if (!last) continue;
      const rx = last.x + last.w + kerf;
      consider({ x: rx, y: sh.topY, w: sheetW - rx, h: sh.maxH });
    }
    consider({ x: 0, y: sheet.usedHeight, w: sheetW, h: sheetH - sheet.usedHeight });
  }
  return best;
}
