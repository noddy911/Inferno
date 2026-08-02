# Phase 3 - Task List & Progress

> Companion to `docs/phase-3-design.md` (source of truth).
> Updated after **every** module. Each module stops for user approval before the next begins.

---

## Milestones

| Milestone | Modules | Status |
|---|---|---|
| M1 — Foundation: data + recipes | 1 | ✅ Complete (2026-08-01) |
| M2 — Core engines | 2, 3, 4 | ✅ Complete (2026-08-01) |
| M3 — Deliverables: BOQ + Quotation | 5, 6 | ✅ Complete (2026-08-01) |
| M4 — Reports + Settings | 7, 8 | ✅ Complete (2026-08-01) |
| M5 — AI Assistant | 9 | ✅ Complete (2026-08-01) |

---

## Implementation order & dependencies

```text
1. Seed Data & Recipes            (no dependencies — everything seeds from here)
2. Measurement Engine             (depends on 1: recipes)
3. Material Optimization Engine   (depends on 1: sheet sizes/kerf; consumed by 4)
4. Cost Estimation Engine         (depends on 2+3, 8 partially: rates/settings)
5. BOQ Engine                     (depends on 4)
6. Quotation Engine               (depends on 5, 8: settings for logo/terms)
7. Reports Engine                 (depends on 6: quotation/BOQ data)
8. Settings Integration           (independent; consumed by 4/6 — built here for completeness)
9. AI Estimation Assistant        (depends on 1–6: engines + persistence)
```

> Note on order: `8` is placed late in the sequence, but its Settings model + seed are created
> in Module 1 (engines read them as config). Modules 2–7 consume Settings **config** that is
> already seeded; the `GET/PUT /settings` HTTP surface lands in Module 8.

---

## Check that runs after EVERY module

```text
[ ] npm run lint           (backend) — no errors
[ ] npm test               (backend) — all unit tests pass
[ ] Build/import sanity    — server boots, no module-load errors
[ ] docs/phase-3-task-list.md — status + progress updated
```

> **Type-check mapping:** the project is JavaScript (Strict Mode) per `tech-stack.md` —
> there is no TypeScript compiler. "Type checking" is satisfied by ESLint strictness
> (recommended ruleset), JSDoc types on all public APIs (`shared/validators`), and the
> build/import sanity check. Introduced in Module 1.

---

## Module status

### Module 1 — Seed Data & Recipes ✅ Complete (2026-08-01)
- **Deliverables**
  - [x] `domain/measurement/recipe.schema.js` — Zod schema for recipes (formulas, tokens, materials)
  - [x] `domain/measurement/recipes.js` — loader + validation of all recipe files
  - [x] `domain/measurement/recipes/*.json` — 10 categories: wardrobe, kitchen, tv-unit, bed,
        dining, vanity, shoe-rack, loft, study-table, office-table
  - [x] Minimal Mongoose models under `adapters/persistence/mongoose/models/`:
        Client, Project, Room, Furniture, Material, Settings (per `database-schema.md`)
  - [x] `src/seed-engines.js` — idempotent seed: 2 clients, 2 projects, rooms, furniture,
        material catalog, settings
  - [x] Vitest harness + first tests (recipe schema validation, loader, seed idempotency)
- **Acceptance criteria**
  - [x] All 10 recipes load and pass Zod validation; formulas reference only allowed tokens
  - [x] Known material types (`board`, `backBoard`, `finish`, `hardware`, `glass`, `countertop`)
  - [x] `seed-engines` runs twice without duplicates (verified via mongodb-memory-server)
  - [x] lint + tests + boot/import pass
- **Testing checklist**
  - [x] Each recipe validates against `recipe.schema.js`
  - [x] Malformed recipe (bad token, unknown material, missing panels) is rejected
  - [x] `loadRecipes()` returns all 10 categories
  - [x] Seed idempotency (run twice → identical row counts)

### Module 2 — Measurement Engine ✅ Complete (2026-08-01)
- **Deliverables**
  - [x] `shared/formula.js` — safe recursive-descent formula evaluator (no `eval`; decimals,
        `+ - * / ( )`, `ceil()`/`floor()`, identifiers validated against context)
  - [x] `domain/measurement/measure.service.js` — pure engine: `measureFurnitureItem` +
        `measureItems` (panels, edge band, hardware, paint/laminate/finish areas, volume)
        using recipes as config; sub-assembly scope for kitchens
  - [x] `domain/measurement/dto.js` — Zod input schemas + JSDoc types
  - [x] `faces` field added to `recipe.schema.js` panelSchema (0–2, default 1)
  - [x] Recipes updated with `faces` (doors/shutters `2`, backs `0`)
  - [x] Seed kitchen furniture moved to per-module counts (drawers:1, shelves:1)
- **Acceptance criteria**
  - [x] Correct panel derivation per recipe (wardrobe → sides/top-bottom/back/shelves/shutters/
        drawerBoxes/plinth; kitchen → baseCabinet/wallCabinet/countertop scaled by
        `ceil(width/600)`)
  - [x] Hardware counts derive from shelves/drawers/shutters (incl. sub-assembly aggregation)
  - [x] Output includes: panels, edgeBandM, hardware, paintArea, laminateArea, materialArea,
        area, volume, finishArea
  - [x] Unknown category → DomainError (`UNSUPPORTED_CATEGORY`); known-but-unregistered →
        `MISSING_RECIPE`
  - [x] `thk` token feeds default board thickness from config
- **Testing checklist**
  - [x] Wardrobe reference math (counts, dims, hardware, edge band 83.568 m, area/volume) exact
  - [x] Kitchen sub-assemblies (13 panels, module scaling, hardware 60/12/30/0/18, countertop
        excluded from material/finish areas)
  - [x] Quantity multiplier (×3 → panels/hardware/areas scale)
  - [x] Unknown category rejected; missing recipe rejected; dims ≤ 0 rejected; count < 0 rejected
  - [x] `measureItems` batch totals + empty-batch rejection
  - [x] lint 0 errors · 42 tests pass (4 files) · server boots with no module-load errors

### Module 3 — Material Optimization Engine ✅ Complete (2026-08-01)
- **Deliverables**
  - [x] `domain/optimization/cut.service.js` — shelf-based FFD + 90° rotation + kerf-aware
        placement + residual-refinement pass (re-homes orphaned panels into earlier sheets)
  - [x] `domain/optimization/dto.js` — Zod input schemas + JSDoc types
  - [x] `DEFAULT_SHEET_SIZES` (8x4/9x4/10x4) mirroring the seeded Settings catalogue
- **Acceptance criteria**
  - [x] Returns sheetKey, sheetSize, sheetCount, per-sheet layout (x/y/w/d/rotated),
        usedArea, wasteArea, wastePct, remainingMaterial (largest leftover rect)
  - [x] Oversized panel → DomainError `PANEL_EXCEEDS_SHEET` naming the panel; never auto-split
  - [x] `wastePct > 35%` → `nextSizeHint` with the next sheet size up
  - [x] Custom `sheetSizes` config accepted; unknown sheet key → DomainError
- **Testing checklist**
  - [x] Rotation: 100×2400 tall panels pack onto one 8x4 sheet rotated 90°; optimal-orientation
        panels are not rotated
  - [x] Kerf: default 3 mm; 1220×1220 + 1220×1220 → 2 sheets with kerf, 1 sheet with kerf 0
  - [x] Residual refinement: orphaned 400×500 re-homed into sheet 0's edge strip, sheet count
        2 → 1 (verified D at x=2003,y=0)
  - [x] wastePct + remainingMaterial exact (5.939% → largest leftover 2440×17)
  - [x] Oversized rejection (message names the panel)
  - [x] 2000-panel smoke test packs all panels fast (<5 s)
  - [x] lint 0 errors · 59 tests pass (5 files) · boot/import sanity OK

### Module 4 — Cost Estimation Engine ✅ Complete (2026-08-01)
- **Deliverables**
  - [x] `shared/money.js` — minor-unit (integer paise) math: `toMinor`/`toMajor`, `pctOf`,
        `mulOf`, `sumOf`; single round-half-up per line, 2 dp only at the boundary
  - [x] `domain/costing/dto.js` — Zod input schemas + JSDoc types; parent-level
        `DEFAULT_*` catalogues (manufacturing/labour rates, quantities/days) mirroring the
        seeded Settings singleton but defined in-domain (no mongoose imports)
  - [x] `domain/costing/pricing.service.js` — cost-plus pricing + `PRICING_BOUNDS`
  - [x] `domain/costing/cost.service.js` — four-component breakdown + `estimateCost` +
        `deriveLabourDays` heuristic
- **Acceptance criteria**
  - [x] Material (purchaseRate) + manufacturing + labour + additional → totalCost
  - [x] Cost-plus: marginBase = cost × (1 + margin%); discount (flat/%) pre-GST; GST on
        taxable; total = taxable + gst
  - [x] Line-item breakdown returned (`lines.material/manufacturing/labour/additional`,
        `totals.*`)
- **Testing checklist**
  - [x] All four cost components sum correctly (reference: material 2142000 + mfg 348400 +
        labour 690000 + additional 213608 = 3,394,008 paise)
  - [x] Both discount types (flat ₹5000; 10% of marginBase)
  - [x] GST on discounted taxable (rounded once, round-half-up)
  - [x] Rounding (2 dp, single round, no drift — `totalPaise === taxablePaise + gstPaise`)
  - [x] Margin/GST/discount-% bounds rejected (`PRICING_BOUNDS`); negative rates/counts via schema
  - [x] `deriveLabourDays` heuristic (carpenter = ceil(area/25), painter = ceil(area/50),
        helper = 1.5× carpenter, electrician when furniture units > 0)
  - [x] lint 0 errors · **80 tests pass (7 files)** · boot/import sanity OK

### Module 5 — BOQ Engine ✅ Complete (2026-08-01)
- **Deliverables**
  - [x] `domain/boq/dto.js` — Zod input/output schemas + JSDoc types; `wasteQty` defaults 0
        so a plain cost breakdown maps directly onto a BOQ
  - [x] `domain/boq/boq.service.js` — `buildBoq(input)`: groups by `materialId`, sums
        quantity/wasteQty, `totalQty = quantity + wasteQty`, prices each line
        (`amountPaise = round(totalQty × ratePaise)`, single round-half-up); sorted
        category → type → name; empty input → zero-total BOQ + "no items" note, not an error
  - [x] `shared/errors.js` — `BOQ_RATE_CONFLICT` DomainError (same SKU, two rates → throw)
  - [x] `adapters/persistence/mongoose/models/boq.model.js` — one doc per quotation,
        items embedded (design §4.3); registered in models/index.js
  - [x] `adapters/services/boq-exporter.js` — ExcelJS workbook/buffer renderer; money
        columns 2-dp; empty BOQ → headers + "No data" + zero totals row
  - [x] `exceljs@^4.4.0` added to dependencies
- **Acceptance criteria**
  - [x] Grouped line items: materialId/name/category/type, unit, quantity, wasteQty, totalQty,
        rate, amount (+ `ratePaise`/`amountPaise` exact paise)
  - [x] `totalQty = quantity + wasteQty`; empty input → zero-total BOQ, not error
  - [x] Excel export produces a valid workbook (PK-magic bytes, buffer round-trips via ExcelJS)
- **Testing checklist**
  - [x] Line grouping correct (duplicate SKU across lines → one line; qty 6+4, waste 1+0.5)
  - [x] Waste inclusion (totalQty = quantity + wasteQty exactly)
  - [x] Fractional sqft quantities not rounded; fractional rate rounds once (63.08 → 25232 paise)
  - [x] Rate conflict rejected (`BOQ_RATE_CONFLICT`, 409 via error-handler); structured
        payload with `details.{materialId,rates,sources[]}`; negative qty/rate rejected via
        schema; `source` provenance never leaks into output lines
  - [x] Deterministic (same input → identical output)
  - [x] Empty input → zero totals + explicit note, no error
  - [x] Export workbook rows match items (incl. TOTAL row = Σ amount); empty workbook valid
  - [x] lint 0 errors · **96 tests pass (9 files)** · boot/import sanity OK (cost → boq →
        xlsx chain, model compiles)

### Module 6 — Quotation Engine ✅ Complete (2026-08-01)
- **Deliverables**
  - [x] `domain/quotation/numbering.service.js` — configurable numbering: `{prefix} {year} {seq}`
        tokens, zero-padding, per-(prefix, year) counter keys; invalid formats rejected
  - [x] `domain/quotation/dto.js` — `quotationNumberingSchema`, `roomTotalSchema`,
        `quotationConfigSchema` (paymentTerms/warranty/notes/validUntilDays/signatureUrl/
        issuedAt/revisionOf), pricing + item + input schemas, `QuotationResult` typedef
  - [x] `domain/quotation/quotation.service.js` — `buildQuotation` freezes the complete
        pricing snapshot (summary/totals/rooms/items) + lifecycle state machine
        (`draft → sent → accepted|rejected`, `rejected → revised`); only `draft` mutable;
        revisions are new docs linked via `revisionOf`
  - [x] `adapters/persistence/mongoose/models/quotation.model.js` (unique `quotationNumber`,
        rupee snapshot fields, lifecycle fields) + `counter.model.js` (atomic `$inc` sequence)
  - [x] `adapters/persistence/repositories/quotation-number.repository.js` — atomic
        `findOneAndUpdate({$inc})` upsert per counter key; raw slot + `startFrom` offset so a
        fresh counter starts exactly at `startFrom`; unique index as backstop
  - [x] `adapters/persistence/repositories/quotation.repository.js` — paise→rupee mapping +
        `createQuotationWithBoq` (quotation + BOQ written atomically in one session)
  - [x] `adapters/services/quotations/generate-quotation.js` — orchestration: grouped BOQ
        (aborts + logs `BOQ_RATE_CONFLICT` with full provenance) → snapshot → atomic number →
        transaction persist; joins an outer session or opens its own
  - [x] `adapters/services/quotations/pdf/*` — PDFKit A4 renderer + modular `(ctx)=>void`
        templates (header/items/totals/terms/footer), reusable `drawTable` with auto page
        breaks, `bufferPages` footer "Page X of Y"; best-effort logo/signature loading
  - [x] `settings.model.js` extended with `quotationNumbering` (`prefix`/`format`/`seqPadding`/
        `startFrom`); seeded in `DEFAULT_SETTINGS`
  - [x] `pdfkit@^0.19.1` added to dependencies
  - [ ] HTTP endpoints + validators (`adapters/http/`) — **deferred**, see deviation #9
- **Acceptance criteria**
  - [x] Configurable numbering via Settings: default `QTN-2026-0001`; prefixes QTN/EST;
        formats like `{prefix}/{year}/{seq}`; `startFrom` honoured; per-year reset
  - [x] Unique numbers under concurrency (25 parallel counter calls + 10 parallel full
        generates → no duplicates; atomic `$inc` + unique index backstop)
  - [x] Complete pricing snapshot persisted at generate time (summary/totals/rooms in rupees);
        later material price changes never mutate a historical quotation
  - [x] PDF generated with logo/branding, GST, discounts, payment terms, warranty, notes,
        signatures; multi-page BOQ breaks correctly; empty quotation still renders
  - [x] Revision-ready: `revisionOf` carried on the snapshot; revision = new doc + new number
- **Testing checklist**
  - [x] Numbering format + padding + counter keys + invalid config rejected (`numbering.service`)
  - [x] Snapshot invariants (taxable = subtotal − discount; total = taxable + gst; empty flag)
        + lifecycle transitions + mutability (`quotation.service`)
  - [x] Number repository: startFrom, custom prefix/format, per-year reset,
        25-parallel → all unique + dense (`quotation-number.repository`)
  - [x] Generate orchestration: persisted rupee snapshot + BOQ mirror, 10-parallel unique
        numbers (replica-set transactions), `BOQ_RATE_CONFLICT` abort + structured log with
        project/material/rates/sources (`generate-quotation`)
  - [x] PDF buffer validity (`%PDF`/`%%EOF`), multi-page long BOQ, empty quotation,
        best-effort image loading (`render-quotation`)
  - [x] lint 0 errors · **132 tests pass (14 files)** · boot/import sanity OK
        (generate → repositories → models → PDF chain, all import cleanly)

### Module 7 — Reports Engine ✅ Complete (2026-08-01)
- **Deliverables**
  - [x] `domain/reports/dto.js` — Zod `reportFiltersSchema` (from/to Dates, `groupBy: month|none`, clientId/projectId, statuses), `REPORT_TYPES`, `DEFAULT_REPORT_STATUSES` (`sent`+`accepted`), JSDoc typedefs
  - [x] `domain/reports/report.aggregators.js` — pure aggregators over normalized paise row arrays: `aggregateSales` (count/revenue/gst/avg-order + monthly buckets, fills empty months, `groupBy:'none'`), `aggregateProfit` (cost/revenue/profit + margin), `aggregateLabour` (total + per-trade, zero-spend trades filtered), `aggregateMaterial` (per-material quantity/waste/totalQty/amount), `aggregateClient`/`aggregateProject` (newest-first detail rows); UTC month keys (`monthKey`/`monthLabel`/`monthsInRange`)
  - [x] `adapters/persistence/repositories/report.repository.js` — loads + normalizes quotation/boq docs into report rows (rupees→paise, labourByTrade for 5 fixed trades, boq flatMaps `items`, `date: generatedAt ?? createdAt`)
  - [x] `adapters/services/reports/report.service.js` — validates type/filters, loads rows, dispatches via `AGGREGATORS`; unknown type → `invalidInput` with `{type, allowed}`
  - [x] `adapters/services/reports/report-exporter.js` — ExcelJS workbook per report type (shared `tableWorkbook` scaffold: title→subtitle→header→rows/'No data'→totals; money cells `#,##0.00`; never re-rounds the aggregator's paise) + `reportToBuffer`
  - [ ] HTTP endpoints — **deferred**, see deviation #11
- **Acceptance criteria**
  - [x] sales/material/profit/labour/client/project reports with from/to/groupBy
  - [x] Empty period → zeros, not error (aggregators + repository + exporter all handle empty input)
  - [x] Excel export works (valid workbook, PK magic, round-trips via ExcelJS)
- **Testing checklist**
  - [x] Each aggregator over fixture DTOs (`report.aggregators.test.js`)
  - [x] Grouping by month (bucket fill incl. empty months, `groupBy:'none'`)
  - [x] Empty period → zero totals, no error
  - [x] DB-backed end-to-end via report.service.test.js: 4 quotations (draft excluded, period/status/project filters), 2 boq docs, all 6 report types, Excel round-trip, 'No data' row + zero totals on empty export
  - [x] lint 0 errors · **158 tests pass (16 files)** · boot/import sanity OK
        (report chain: aggregators → repository → service → exporter, plus generate-quotation imports cleanly)

### Module 8 — Settings Integration ✅ Complete (2026-08-01)
- **Deliverables**
  - [x] `shared/ttl-cache.js` — generic in-memory TTL cache (injectable clock, lazy expiry, 5-min default) backing the read-through cache
  - [x] `domain/settings/dto.js` — Zod `settingsSchema` (full config) + `settingsUpdateSchema` (partial, ≥1 field, nested patches, strips unknown keys); reuses the quotation domain's `quotationNumberingSchema` (DRY, one numbering source of truth)
  - [x] `adapters/persistence/repositories/settings.repository.js` — singleton upsert: ensure-with-`$setOnInsert` then `$set` patch (separate commands — Mongo forbids parent+child or same-path across `$set`/`$setOnInsert`); dotted-path flattening so partial nested updates preserve sibling fields
  - [x] `adapters/services/settings/settings.service.js` — `createSettingsService` factory + process singleton; read-through `getSettings()` (5-min TTL, creates the singleton from defaults on first use) + `updateSettings` (validate → persist → refresh cache) + `invalidateSettingsCache`
  - [x] `adapters/http/` — **first Phase-3 REST surface**: `routes/settings.routes.js` + `controllers/settings.controller.js` (reuses Phase-1 `authenticate`/`authorize`/`validate` per design §3.2 #6); wired into `routes/index.js`; Swagger scan extended to `src/adapters/http/routes/*.js`
- **Acceptance criteria**
  - [x] Admin updates; others read-only — `PUT /settings` behind `authenticate` + `authorize('admin')`; `GET /settings` for any role (design §9 matrix: designer/sales view)
  - [x] Cache invalidates on PUT — service refreshes the cached config on write; follow-up GET returns the new value; `invalidateSettingsCache` forces a refetch
  - [x] All engines receive settings config — `getSettings()` is the canonical read-through source orchestrators (Phase-2 / CLI / AI) feed into engines; engines already consume config DTOs per design §3.3
- **Testing checklist**
  - [x] GET returns the singleton (empty DB → created from `DEFAULT_SETTINGS`; `_id`/`__v`/timestamps never leak)
  - [x] PUT validates + persists + invalidates/refreshes cache (incl. direct-DB-write + `invalidateSettingsCache` + TTL-expiry refetch)
  - [x] RBAC: 401 unauthenticated, 403 non-admin (designer/sales/client), 200 admin; invalid body → 400 with field errors; empty / unknown-only body → 400
  - [x] Partial nested update preserves siblings (`labourRates.carpenter` only); full `quotationNumbering` block validated via the shared schema
  - [x] lint 0 errors · **205 tests pass (20 files)** · boot/import sanity OK
        (cache → dto → repository → service → controller → route → app, all import cleanly)

### Module 9 — AI Estimation Assistant ✅ Complete (2026-08-01)
- **Deliverables**
  - [x] `domain/ai/dto.js` — `aiEstimateInputSchema` (prompt 3–2000 chars, §10), `aiSuggestionSchema` (rooms → furniture, category constrained to the recipe catalogue, counts defaulted), `aiApplyInputSchema` (projectId + suggestion + `measure` flag)
  - [x] `domain/ai/providers/*.js` — `mock` (deterministic keyword → template, always schema-valid) + `openai`/`anthropic`/`gemini` thin SDK adapters (lazy `import()` — SDKs only installed when actually used, §15; missing key → throw → mock fallback)
  - [x] `domain/ai/prompt-templates.js` — `buildEstimatePrompt(user)` static system prompt describing the exact JSON contract (mirrors `aiSuggestionSchema`); output never injected as code
  - [x] `domain/ai/ai.service.js` — `createAiService` factory + process singleton; dispatch by `AI_PROVIDER` env or override, 20 s timeout (§11), `parseSuggestion` Zod-validates raw output BEFORE anything is persisted/measured; provider error/timeout/missing key → deterministic mock + log; malformed/out-of-schema output → `INVALID_INPUT`
  - [x] `adapters/persistence/repositories/ai.repository.js` — `createRoomsWithFurniture` persists Room + Furniture docs, returns ids
  - [x] `adapters/services/ai/ai-apply.service.js` — re-validates, verifies the project exists (`NOT_FOUND`), persists rooms/furniture, optionally runs `measureItems` over the persisted furniture to seed the cost pipeline
  - [x] `adapters/http/routes/ai.routes.js` + controller — `POST /ai/estimate`, `POST /ai/apply` (admin + designer per RBAC §9); wired into `routes/index.js`; Swagger tag + schemas
  - [x] `env.js` — `AI_PROVIDER`/`AI_TIMEOUT_MS` + per-provider keys/models; `.env.example` updated
- **Acceptance criteria**
  - [x] Mock provider: keyword → furniture suggestion; output Zod-validated before materialization
  - [x] `ai/apply` persists rooms/furniture and can trigger BOQ/quotation — full generate is Phase-2 `estimateProject` orchestration (needs material resolution); apply produces the measured estimate that engine consumes (see deviation #13)
  - [x] Missing API key → mock fallback, logged (`ai:<provider>:fallback:mock` with reason)
- **Testing checklist**
  - [x] Mock keyword heuristics (11 keyword prompts → correct category; deterministic; always schema-valid)
  - [x] Output-schema rejection — malformed JSON, valid-JSON-wrong-shape, and out-of-catalogue category all `INVALID_INPUT`
  - [x] Provider dispatch by env/override; unknown provider → default; throw → mock fallback (logged); timeout → mock fallback (logged)
  - [x] Apply persistence (DB-backed: rooms+furniture count, ids, category/roomId links), `measure: true` → measurement totals, `NOT_FOUND` project, invalid suggestion
  - [x] HTTP contract (supertest): 401 unauthenticated, 403 sales/client, 400 invalid prompt/suggestion, 404 unknown project, 200 estimate + apply
  - [x] lint 0 errors · **255 tests pass (25 files)** · boot/import sanity OK (env → dto → providers → service → repository → apply → routes → app; swagger spec compiles; mock estimate runs)

---

## Consistency deviations (tracked)

| # | Deviation | Reason |
|---|---|---|
| 1 | `materials.type` added beyond `database-schema.md` | Phase-3 sub-types (plywood/mdf/laminate/…) |
| 2 | `quotations` extended (rooms, totals, lifecycle fields) | Phase-3 PDF contents + lifecycle |
| 3 | `boq` items embedded with wasteQty/totalQty | Phase-3 "waste" requirement; atomic read with quotation |
| 4 | `settings` extended (sheetSizes, kerf, manufacturingRates, additionalCharges, paymentTerms, warranty) | Phase-3 settings requirements |
| 5 | `reports` collection not persisted — computed on demand | Derivable data; avoids staleness; history collection addable later |
| 6 | Added `GET /reports/project` + `/export?format=xlsx` | Phase-3 requires project report + Excel |
| 7 | `/search`, `/uploads` deferred | Phase-2 scope |
| 8 | Dashboard deferred to Phase 3+ (no `/dashboard` endpoint) | Metrics need quotation/material data |
| 9 | Quotation HTTP endpoints (`POST /quotations`, `GET /quotations/:id/pdf`, …) deferred | Module 6 scope = engine + persistence + PDF; REST surface lands with the Phase-2 CRUD layer (same as BOQ/reports exports) |
| 10 | `quotations.costs` snapshot added (material/manufacturing/labour/additional + `labourByTrade` in rupees) | Labour report needs persisted per-trade labour costs; sourced from the estimate at generate time so historical reports never recompute |
| 11 | Report HTTP endpoints (`GET /reports/*`, `/export?format=xlsx`) deferred | Module 7 scope = aggregation + Excel export; REST surface lands with the Phase-2 CRUD layer (same as BOQ/quotation endpoints, deviations #6/#9) |
| 12 | `adapters/http/` established in Module 8 (settings `GET/PUT`) | Module 8's task list explicitly requires the settings REST surface + RBAC (design §8.5 references `PUT /settings`), so settings is the exception to the deferred-HTTP pattern — it sets the `adapters/http` structure Phase 2 will extend. All other engine endpoints remain deferred (#9/#11). |
| 13 | `POST /ai/apply` persists rooms/furniture + optional measurement, but does not itself generate a BOQ/quotation | Full generate needs Phase-2 material resolution (`estimateProject` orchestration); apply returns the measured estimate that pipeline consumes. AI `estimate`/`apply` HTTP endpoints ARE built (task list requires them, like settings #12). |
