# Phase 3 - Estimation & Quotation Engine: Technical Design

> Source of truth for Phase 3 implementation.
> Status: **Approved for implementation** — all open decisions resolved.

---

## 1. Scope

Phase 3 adds the intelligent estimation system on top of Phase 1 (authentication, complete):

- Material Master (persisted catalog)
- Measurement Engine (panel/area derivation from furniture recipes)
- Material Optimization Engine (sheet nesting + waste)
- Cost Estimation Engine (material + manufacturing + labour + additional, then profit/discount/GST pricing)
- BOQ Engine (grouped line items + Excel export)
- Quotation Engine (persisted document + PDF + lifecycle)
- Reports Engine (computed aggregations + Excel export)
- Settings (single-company configuration feeding every engine)
- AI Estimation Assistant (natural-language estimation)

**Phase 2 is deferred.** Phase 3's calculation endpoints are designed **stateless** (structured
JSON in, calculated results out) so they work and are testable without Phase 2. A
`seed-engines` script creates realistic sample Clients / Projects / Rooms / Furniture /
Materials so the full pipeline is demonstrable end-to-end. When Phase 2 is implemented later,
it only needs to persist and retrieve data and call the existing engines — **no engine
refactoring is required**.

---

## 2. Locked decisions

| # | Decision | Choice |
|---|---|---|
| 1 | Phase-2 dependency | Stateless engines now; `seed-engines` demo data; Phase 2 plugs in later unchanged |
| 2 | Panel recipes | Code-bundled, versioned JSON in `domain/measurement/recipes/` |
| 3 | Cutting algorithm | FFD shelf + residual refinement, 90° rotation, kerf default 3 mm (Settings-configurable) |
| 4 | Pricing model | Cost-plus markup: cost from `purchaseRate`; `marginBase = totalCost × (1 + profitMargin%)` (default 25%); discount pre-GST; GST default 18% on taxable; totals rounded to 2 dp at the end |
| 5 | Tenancy | Single company (one Settings document) |
| 6 | Materials | Single `materials` collection, `category` + `type` enums |
| 7 | Quotation lifecycle | `draft → sent → accepted | rejected`; revisions = new doc + new number + `revisionOf`; numbering `Q-YYYY-NNNN` via atomic counter |
| 8 | AI | Provider adapter (`openai`/`anthropic`/`gemini` via env) + deterministic mock fallback; Zod-validated structured output |
| 9 | RBAC | Permission matrix in §9 |
| 10 | Code layout | `domain/` + `adapters/` + `shared/`; Phase-1 `auth` untouched |

---

## 3. System architecture

### 3.1 Directory structure

```
backend/
├── domain/                          ← PURE business logic. No Express/Mongoose/JWT/Cloudinary/framework imports
│   ├── measurement/
│   │   ├── measure.service.js
│   │   ├── recipes/                  ← code-bundled versioned JSON (one per furniture category)
│   │   │   ├── wardrobe.json
│   │   │   ├── kitchen.json
│   │   │   ├── tv-unit.json
│   │   │   ├── bed.json
│   │   │   ├── dining.json
│   │   │   ├── vanity.json
│   │   │   ├── shoe-rack.json
│   │   │   ├── loft.json
│   │   │   ├── study-table.json
│   │   │   └── office-table.json
│   │   ├── recipes.js                ← loader + Zod validation of recipe files
│   │   ├── recipe.schema.js          ← Zod schema for recipes
│   │   └── dto.js                    ← domain types (JSDoc) for measurement I/O
│   ├── optimization/
│   │   ├── cut.service.js            ← FFD shelf + residual refinement
│   │   └── dto.js
│   ├── costing/
│   │   ├── cost.service.js           ← cost build-up
│   │   ├── pricing.service.js        ← margin / discount / GST / totals
│   │   └── dto.js
│   ├── boq/
│   │   ├── boq.service.js            ← grouped line-item assembly
│   │   └── dto.js
│   ├── quotation/
│   │   ├── quotation.service.js      ← room-wise assembly, totals snapshot, numbering, lifecycle
│   │   └── dto.js
│   ├── reports/
│   │   ├── report.aggregators.js     ← pure aggregations over DTO arrays
│   │   └── dto.js
│   └── ai/
│       ├── ai.service.js             ← provider dispatch + output validation
│       ├── providers/
│       │   ├── openai.provider.js
│       │   ├── anthropic.provider.js
│       │   ├── gemini.provider.js
│       │   └── mock.provider.js      ← keyword → heuristic furniture suggestion
│       ├── prompt-templates.js
│       └── dto.js
├── adapters/                         ← thin, framework-aware
│   ├── http/
│   │   ├── controllers/
│   │   ├── routes/
│   │   ├── validators/
│   │   └── dto/                      ← HTTP ↔ domain mapping
│   ├── persistence/
│   │   ├── mongoose/
│   │   │   ├── models/               ← Material, Quotation, BOQ, Settings, Counter, Client, Project, Room, Furniture
│   │   │   └── indexes.js            ← index definitions applied on startup
│   │   └── repositories/             ← DB access + Mongoose doc ↔ domain DTO mappers
│   └── services/                     ← orchestration: estimateProject, generateQuotation
├── shared/
│   ├── money.js                      ← integer minor-unit arithmetic
│   ├── units.js                      ← mm ↔ ft / sqft conversions
│   ├── errors.js                     ← DomainError types + codes
│   └── validators/                   ← shared domain-level Zod schemas (dims, counts, sku…)
└── auth/                             ← existing Phase 1 — UNTOUCHED (controllers/, services/, models/, …)
```

### 3.2 Architectural invariants

1. **Domain exports pure functions/classes only.** Inputs DTOs in, returns DTOs out.
   Deterministic. No I/O. No Express / Mongoose / JWT / Cloudinary / framework imports.
2. **Controllers** parse + validate (Zod) and call services. Never compute.
3. **Repositories** are the only code that imports Mongoose models.
4. **HTTP DTOs** (`adapters/http/dto/`) convert request bodies → domain DTOs → response
   envelopes. **Domain DTOs** (`domain/*/dto.js`) are the single source of truth shared by
   REST, CLI scripts, unit tests, and AI workflows.
5. **Errors**: `shared/errors.js` defines domain errors (`DomainError` with `code`).
   `adapters/http` maps them to HTTP status codes through the existing `AppError` /
   `errorHandler` middleware (auth module).
6. Adapters may reuse existing Phase-1 middleware (`authenticate`, `authorize`, `validate`)
   and utils (`AppError`, `api-response`). Domain must not import them.

### 3.3 Engine contract

Every engine is a pure function:

```js
resultDTO = engine(inputDTO, configDTO)
```

- `inputDTO` — the thing being computed (furniture items, panels, measurement result…).
- `configDTO` — the parameters that tune the computation (recipes, sheet sizes, kerf, prices,
  profitMargin, gstRate…).
- `resultDTO` — a fully resolved result with per-line breakdown, so the UI/BOQ/PDF can show
  *why* a total is what it is.

Same inputs + same config → identical outputs. This is what makes the engines reusable from
REST, CLI, unit tests, and the AI workflow, and what guarantees no refactoring when Phase 2
arrives.

---

## 4. Data model (persisted)

Common fields on every collection: `_id`, `createdAt`, `updatedAt` (timestamps). Soft delete
where noted. All models live in `adapters/persistence/mongoose/models/`.

### 4.1 `materials` (Material Master)

```
{
  sku: string, unique, uppercase, required          // e.g. "BD-PLY-12", ^[A-Z0-9-]{3,20}$
  name: string, required                            // "12mm BWP Plywood"
  category: enum ['board','finish','hardware','countertop','other'], required, indexed
  type: enum per category, required, indexed         // board: plywood|mdf|hdhmr|particle|block
                                                      // finish: laminate|acrylic|veneer|pu|duco|membrane
                                                      // hardware: hinge|channel|handle|lock|connector
                                                      // countertop: granite|quartz|marble
                                                      // other: glass|mirror|aluminium
  brand: string, optional
  thickness: number (mm), optional                   // null for hardware/countertop where N/A
  sheetSize: { width, height } (mm), optional        // boards/laminates, e.g. 2440×1220
  unit: enum ['sqft','sqm','rft','pc','set','sheet'], required
  purchaseRate: number ≥ 0, required                 // cost basis
  sellingRate: number ≥ 0, required                  // list price (future / display)
  gst: number 0–100, default 0                       // input GST % for costing
  supplier: string, optional
  isActive: bool, default true
  deletedAt: date|null                               // soft delete
}
```

Indexes: `sku` (unique), `{category, type}`, `{isActive}`, `{name}`.

### 4.2 `quotations`

```
{
  quotationNumber: string, unique                    // "Q-2026-0001"
  projectId: ObjectId, indexed
  clientId: ObjectId, indexed                        // denormalized for reporting + search
  status: enum ['draft','sent','accepted','rejected','revised'], default 'draft'
  summary: {
    subtotal, discountType ('percent'|'flat'), discountValue, discount,
    taxable, gstRate, gst, total
  }
  totals: { totalCost, profit, profitPercent, marginBase }   // snapshot — immutable after 'sent'
  rooms: [{ roomId, name, roomTotal }]               // room-wise cost for the PDF
  paymentTerms: string
  warranty: string
  signatureUrl: string|null                          // Cloudinary URL
  issuedAt: date
  validUntil: date|null
  revisionOf: ObjectId|null                          // link to prior revision
}
```

Totals are **snapshotted** at generate time; later project edits never mutate a sent
quotation. Room-wise totals are embedded so the PDF needs no recomputation. Revisions create
a new document linked via `revisionOf`.

### 4.3 `boq`

```
{
  quotationId: ObjectId, indexed
  projectId: ObjectId, indexed
  items: [{
    materialId, materialName, category, type,
    unit, quantity, wasteQty, totalQty, rate, amount
  }]
  generatedAt: date
}
```

One document per quotation; items embedded (read atomically with the quotation).

### 4.4 `settings` (single-company singleton)

```
{
  _id: 'company'
  companyName: string
  logo: string|null                                 // Cloudinary URL
  gstNumber: string
  currency: 'INR'
  taxes: { outputGstRate: 18 }
  profitMargin: 25                                  // %
  sheetSizes: [
    { key:'8x4',  width:2440, height:1220, rate },
    { key:'9x4',  width:2745, height:1220, rate },
    { key:'10x4', width:3050, height:1220, rate }
  ]
  kerf: 3                                           // saw blade loss, mm
  labourRates: { carpenter, painter, electrician, plumber, helper }   // ₹/day
  manufacturingRates: { cutting, cnc, drilling, assembly, painting, polishing } // ₹/unit or ₹/sqft
  additionalCharges: { transport, packaging, installation, misc }     // flat ₹ or % (flag)
  paymentTerms: string
  warranty: string
}
```

### 4.5 Minimal entity models (for seeding only)

Minimal Mongoose models for `Client`, `Project`, `Room`, `Furniture` per `database-schema.md`
— **persistence only, no CRUD APIs**. Phase 2 will own and extend them later.

---

## 5. Calculation engine design

### 5.1 Units & precision conventions

- **All linear dimensions in mm** internally (rooms and furniture). Areas converted to
  `sqft`/`sqm` only at display. Sheet goods specified in mm (2440×1220) because cutting is done in mm.
- **Money in integer minor units (paise)** inside engines to avoid float drift; formatted to
  2 dp at the boundary. Rates stored as numbers, converted to minor units inside engines.
- **GST rounding**: GST computed on the discounted taxable value; totals rounded once at the
  end (round-half-up), not per line.

### 5.2 Measurement Engine

Input: `[{ category, width, height, depth, shelves, drawers, shutters, quantity }]`.
Output per item (plus room/request totals):

```
{
  panels: [{ name, w, d, thickness, materialType }],
  edgeBandM: number,
  hardware: { hinges, channels, handles, locks, connectors },
  paintArea, laminateArea, materialArea, area, volume
}
```

The core is a **per-category construction recipe** — the components a standard unit breaks
into, expressed as formulas over W/H/D and the count fields (`shelves`, `drawers`, `shutters`).

**Recipe format** (`domain/measurement/recipe.schema.js`):

```json
{
  "category": "wardrobe",
  "panels": [
    { "name": "side",      "count": 2,      "w": "height",      "d": "depth",      "material": "board" },
    { "name": "topBottom", "count": 2,      "w": "width",       "d": "depth",      "material": "board" },
    { "name": "back",      "count": 1,      "w": "width",       "d": "height",     "material": "backBoard" },
    { "name": "shelf",     "count": "$shelves", "w": "width-2t", "d": "depth",     "material": "board" },
    { "name": "shutter",   "count": "$shutters", "w": "height",  "d": "width/shutters", "material": "board" },
    { "name": "drawerBox", "count": "$drawers",  "w": "width",   "d": "depth",     "material": "board" }
  ],
  "hardware": {
    "hinges":    "shutters*3",
    "channels":  "drawers*2",
    "handles":   "shutters+drawers",
    "locks":     "shutters",
    "connectors": "0"
  },
  "edgeBand": ["side", "shelf", "shutter", "drawerBox"],
  "finish": "exterior"
}
```

Formula tokens allowed: `width`, `height`, `depth`, `shelves`, `drawers`, `shutters`,
`quantity`, `thk` (board thickness), and arithmetic (`+ - * /`). `$name` refers to an input
count field. Material types referenced must be known (`board`, `backBoard`, `finish`,
`hardware`, `glass`, `countertop`).

Example, **Wardrobe** (W×H×D, S shelves, M drawers, P shutters):

| Component | Count | Panel size (mm) | Material |
|---|---|---|---|
| Sides | 2 | H × D | board |
| Top / Bottom | 2 | W × D | board |
| Back | 1 | W × H | backBoard (3–6 mm) |
| Shelves | S | (W − 2·thk) × D | board |
| Shutters | P | H × (W / P) | board + finish |
| Drawer boxes | M | box sides/front/bottom | board |

Derived counts: hinges ≈ `P × 3`, channels = `M × 2`, handles = `P + M`, locks optional.
Edge band = Σ exposed front edges of sides, shelves, doors, drawer fronts.
Laminate area = exterior faces + shelf interiors. Paint area = exposed faces when finish is PU/Duco.

**Kitchen** is modeled as sub-assemblies (`baseCabinet`, `wallCabinet`, `countertop`,
`sinkUnit`), each with its own recipe — this is what makes the kitchen "modular" and gives the
AI a target structure. Recipes are code-bundled and versioned (decision #2).

Measurement works even with no Material Master: it returns areas/panels/hardware counts;
materials are resolved only in the Cost Engine.

### 5.3 Material Optimization (Cutting) Engine

Input: `{ panels:[{w,d,label}], sheetKey, kerf? }`.
Output:

```
{ sheetKey, sheetCount,
  layout: [{ sheet, panels:[{ label, x, y, w, d, rotated }] }],
  usedArea, wasteArea, wastePct,
  remainingMaterial: largest usable leftover rect }
```

**Algorithm: shelf-based first-fit-decreasing (FFD) with 90° rotation + residual refinement.**
1. Sort panels by height descending.
2. Place into horizontal shelves; a panel starts a new shelf if it doesn't fit the current one.
3. Try both orientations (w×d vs d×w); prefer the one with less residual width.
4. Each cut reserves `kerf` (default 3 mm) on the edges between panels; shelf height = tallest
   panel in the shelf.
5. **Residual refinement pass**: re-check best-fit orientation per shelf and reuse leftover
   rectangles for small panels to recover ~1–3% utilization.
6. Report waste (`1 − used/sheetArea`) and the largest leftover rectangle.

Deterministic, polynomial-time approximation. Any panel larger than the sheet in both
orientations → `DomainError` naming the panel (never auto-split — splitting changes joinery).
Multiple furniture items of the same category aggregate their panels before nesting so all
rooms pack together. `wastePct > 35%` → response includes a hint suggesting the next sheet
size up.

Sheet sizes (Settings-configurable): `8x4 = 2440×1220`, `9x4 = 2745×1220`, `10x4 = 3050×1220` mm.

### 5.4 Cost Estimation Engine

Pipeline:
1. **Material cost** = Σ(quantity × purchaseRate). Quantities come from measurement output:
   board panels → sheets after cutting (material qty = sheets × sheet price, or sqft),
   laminate → sqft, hardware → counts × pc, countertop → rft, glass/mirror → sqft.
2. **Manufacturing cost** = Σ(op rate × quantity): cutting per sheet, CNC per sqft/min,
   drilling per hole, assembly per unit, painting per sqft, polishing per sqft (Settings rates).
3. **Labour cost** = Σ(labour type rate/day × days). Days derived from room size / furniture
   counts via simple rules (e.g., carpenter days ≈ board sqft / 100), configurable.
4. **Additional** = transport, packaging, installation, misc — each flat ₹ or % (flag).
5. **Total Cost** = 1 + 2 + 3 + 4.
6. **Pricing** (cost-plus markup, decision #4):
   - `marginBase = totalCost × (1 + profitMargin%)`
   - `taxable = marginBase − discount` (discount = % of marginBase or flat)
   - `gst = taxable × outputGstRate%`
   - `total = taxable + gst`

Output: full line-item breakdown + `{ totalCost, profit, profitPercent, discount, taxable,
gstRate, gst, total }`. Every line item returned, not just totals.

The engine takes inline `MaterialPrice[]`; the adapter resolves `materialId` → DTO when the
call comes from a persisted project. Engine stays pure.

---

## 6. Business logic (service orchestration)

- **BOQ generate (`projectId`)**: load project → rooms → furniture → material prices → run
  measure → cut → cost → produce grouped line items (`quantity + wasteQty`) → persist BOQ.
- **Quotation generate (`projectId`)**: same pipeline, but keeps **per-room cost**, applies
  quotation-level discount/paymentTerms/warranty/signature, **snapshots totals**, assigns next
  `quotationNumber`, persists `quotations` + `boq` in a **Mongo multi-document transaction**
  (both succeed or neither), then renders the PDF.
- **Quotation number**: `Q-YYYY-NNNN`, N from an atomic counter
  (`findOneAndUpdate($inc)` on a `counters` doc) — safe under concurrency.
- **Status rules**: only `draft` can be edited/recalculated; `draft → sent`;
  `sent → accepted | rejected`; `rejected` may spawn a `revised` quotation (new number,
  `revisionOf` link). Delete allowed only for `draft`/`rejected`.
- **Reports**: read-only aggregation over `quotations` + `boq`.
- **AI**: provider-adapter pattern; never injects prompt output as code; output structure
  validated with Zod before any materialization.

---

## 7. API endpoints

Base `/api/v1`, all authenticated, all Zod-validated, all documented in Swagger.

| Method & path | Purpose | Roles |
|---|---|---|
| `GET /materials` | list, paginate, filter `category`, `type`, `q`, `sort` | all |
| `GET /materials/:id` | get one | all |
| `POST /materials` | create | admin, designer |
| `PUT /materials/:id` | update | admin, designer |
| `DELETE /materials/:id` | soft delete | admin |
| `POST /measurements/calculate` | **stateless** measure furniture | admin, designer |
| `POST /cutting/calculate` | **stateless** nest panels | admin, designer |
| `POST /cost-estimation/calculate` | **stateless** cost + price | admin, designer, sales |
| `POST /boq/generate` | build BOQ from project | admin, designer, sales |
| `GET /boq/:id` | get BOQ | admin, designer, sales |
| `GET /boq/:id/export?format=xlsx` | Excel | admin, designer, sales |
| `POST /quotations/generate` | build quotation + PDF | admin, designer, sales |
| `GET /quotations` | list, filter `status`/`clientId`/`from`/`to`, paginate | admin, designer, sales |
| `GET /quotations/:id` | get one (with rooms + totals) | admin, designer, sales |
| `PUT /quotations/:id` | update status / fields (recalc only while draft) | admin, designer, sales |
| `DELETE /quotations/:id` | delete draft/rejected only | admin |
| `GET /quotations/:id/pdf` | download PDF | admin, designer, sales |
| `GET /reports/sales` | `from,to,groupBy=month` | admin, sales |
| `GET /reports/material` | `from,to` | admin, designer |
| `GET /reports/profit` | `from,to` | admin |
| `GET /reports/labour` | `from,to` | admin |
| `GET /reports/client` | `clientId,from,to` | admin, sales |
| `GET /reports/project` | `projectId` | admin, designer |
| `GET /reports/:type/export?format=xlsx` | Excel for any report | matching role |
| `GET /settings` | read company config | all |
| `PUT /settings` | update | admin |
| `POST /ai/estimate` | NL → structured furniture suggestion | admin, designer |
| `POST /ai/apply` | materialize suggestion into project | admin, designer |

Pagination contract: `?page=1&pageSize=20`; response `data: { items, total, page, pageSize }`.

Stateless POSTs accept full JSON DTOs and require no DB read (except `cost-estimation`, which
may accept inline material prices or ids resolved by the adapter).

---

## 8. Data flow

1. **Standalone estimate**: `/measurements/calculate` (furniture DTO) → measure →
   `/cutting/calculate` (panels) → `/cost-estimation/calculate` (result + material prices +
   settings) → response. No DB writes.
2. **Project-driven BOQ/Quotation**: project + rooms + furniture (DB) → materials + settings
   (DB, cached) → measure → cut → cost → persist (transaction) → Excel/PDF (on-demand).
3. **Reports**: quotations/boq (DB) → aggregation → response; export re-renders same shape to Excel.
4. **AI**: prompt → provider → **validated JSON suggestion** → `/ai/apply` writes
   rooms/furniture (Phase-2 adapters) → pipeline (2) → optional BOQ/quotation.
5. **Settings**: read-through cache (5-min TTL); invalidated on `PUT /settings`.

---

## 9. RBAC matrix

| Capability | Admin | Designer | Sales | Client |
|---|---|---|---|---|
| Materials CRUD | ✓ | ✓ (view/edit, no delete) | view | — |
| Run measurement/cutting/cost | ✓ | ✓ | cost only | — |
| Generate BOQ / Quotation / PDF | ✓ | ✓ | ✓ | — |
| Reports | ✓ | material/project | sales/client | — |
| Settings | ✓ | view | view | — |
| AI estimate/apply | ✓ | ✓ | — | — |
| Delete (any entity) | ✓ | — | — | — |

---

## 10. Validation rules & edge cases

**Validation (Zod):**
- Materials: sku `^[A-Z0-9-]{3,20}$` unique; category/type in enums; rates ≥ 0; gst 0–100;
  sheetSize positive; unit in enum.
- Measurement: dims > 0; shelves/drawers/shutters integers ≥ 0; `quantity` 1–100; category known.
- Cutting: every panel w,d > 0 and ≤ sheet dims; kerf ≥ 0 < min panel dim; ≤ 2000 panels/request.
- Cost: profitMargin 0–100; discount ≥ 0, if % then ≤ 100 and ≤ subtotal after conversion;
  gst 0–100; material ids exist & active.
- Quotation: project exists; signatureUrl must be a Cloudinary URL (or omitted); status
  transitions enforced in service.
- AI: prompt 3–2000 chars.

**Edge cases:**
- Empty project / zero rooms / zero furniture → BOQ + quotation with zero totals and an
  explicit "no items" note, not an error.
- Panel bigger than any sheet → 400 naming the panel (never auto-split).
- Furniture item exceeding 2440 mm height → recipe must support or reject clearly.
- Waste % > 35 → response hints the next sheet size up.
- Discount > taxable after conversion → 400.
- Float drift → integer minor-unit arithmetic; single round at end.
- `quotationNumber` collisions → atomic `$inc` counter.
- Regeneration after `sent` → blocked (must create a revision).
- Material deactivated mid-project → error pinpoints the item + material.
- Same material resolved to two rates in one BOQ → `BOQ_RATE_CONFLICT` (409). **Never
  auto-pick a rate** — the conflict is a pricing-data bug and must fail fast so it is fixed
  at the source. The error carries `details: { materialId, rates, sources[] }` where each
  source is the project/room/furniture/panel that produced the line.
- Reports over an empty period → zeros, not errors.
- AI provider timeout / missing key → deterministic mock response (heuristic kitchen/wardrobe
  template), logged.
- Excel/PDF of empty BOQ → valid file with headers + "no data".

### 10.1 Troubleshooting — `BOQ_RATE_CONFLICT`

**What it means.** While grouping BOQ lines, the same `materialId` (SKU) appeared on two or
more lines with **different rates**. The engine throws `DomainError('BOQ_RATE_CONFLICT')`
instead of silently choosing a rate.

**Response payload** (via `error-handler.js`):

```json
{
  "success": false,
  "code": "BOQ_RATE_CONFLICT",
  "message": "Material \"BD-PLY-18\" resolved to different rates (2050, 2200). ...",
  "details": {
    "materialId": "BD-PLY-18",
    "rates": [2050, 2200],
    "sources": [
      { "projectId": "p1", "roomId": "r1", "furnitureId": "f1", "panel": "Wardrobe shelf" },
      { "projectId": "p1", "roomId": "r2", "furnitureId": "f2", "panel": "Kitchen drawer box" }
    ]
  }
}
```

**Possible causes.**

| Cause | How to diagnose | Recommended fix |
|---|---|---|
| Material price edited mid-project | `sources` shows the same SKU across rooms with different `rate`; check `materials.purchaseRate` history | Re-set one price; project-wide repricing should be an explicit bulk operation, not per-line drift |
| Two catalog rows share a SKU (soft-deleted + recreated) | Query `materials` for the SKU; a unique index normally prevents this | Enforce SKU uniqueness across active + soft-deleted rows, or assign a new SKU |
| Price resolver fallback (e.g. category default) collides with a real catalog price | `rates` differ by a round number; one came from a default mapping | Make fallback resolution explicit and logged; never mix fallback + real prices in one BOQ |
| Local override on one furniture item | Only one source carries the odd rate | Remove the per-item override, or promote it to a quotation-level discount |
| Data race (two writes updating rate concurrently) | Timestamps of the two `materials` updates | Serialize material price updates (single admin path) |

**Design rule.** The BOQ engine never resolves, discounts, or averages rates — it fails fast.
Pricing inconsistencies are corrected at the source (`materials`), not papered over in the BOQ.

---

## 11. Performance considerations

- Indexes: `materials{sku}` unique; `materials{category,type}`, `{isActive}`;
  `quotations{projectId}`, `{clientId}`, `{status,createdAt}`; `boq{quotationId}`, `{projectId}`.
- Pagination + projection on every list; never return full documents where summaries suffice.
- Reports: aggregation pipelines `$match` first (date/status), then `$group`; range filters hit an index.
- Settings + materials cached in-memory (5-min TTL) — read on every estimate.
- Quotation totals snapshotted → no re-aggregation when reading a sent quotation.
- PDF on demand, cached by `quotationId + updatedAt`.
- Pure engines → trivially parallelizable per room; request-size caps prevent abuse.
- Multi-doc transactions only for quotation + BOQ write (rare, low contention).
- AI calls synchronous with 20s timeout; BullMQ/async flagged as future.

---

## 12. Testing strategy

Vitest unit suites for **every** engine (`backend/src/domain/**/*.test.js`):

- **measurement**: each of the 10 recipes resolves correctly; formula tokens; hardware counts;
  edge band; finish areas; unknown category rejected.
- **optimization**: rotation; kerf; residual refinement; waste %; oversized-panel rejection;
  sheet-size suggestion; many-panels performance smoke test.
- **costing**: both discount types; GST; rounding; minor-unit drift; profit margin bounds.
- **boq**: grouping; waste included in totalQty; empty input.
- **quotation**: numbering sequence; lifecycle transitions; rejection of invalid transitions.
- **reports**: each aggregator over fixture DTO arrays; empty period; grouping.
- **ai**: mock provider heuristics; output-schema rejection; provider dispatch.

Plus `adapters/http` contract tests (status codes, envelope, RBAC) once HTTP endpoints land.

---

## 13. seed-engines script

`backend/src/seed-engines.js` (idempotent). Creates:
- 2 clients (e.g., "Villa Sunlight", "The Baker Residence")
- 2 projects with designers, site addresses, timelines, statuses
- Rooms: master bedroom, kids room, modular kitchen, living room
- Furniture across categories (wardrobe, bed, kitchen base/wall units, TV unit, dining, vanity)
- A realistic material catalog: boards (plywood/MDF/HDHMR), finishes (laminate/acrylic/PU),
  hardware (hinges/channels/handles), countertops (granite/quartz), glass
- The single Settings document

Then (once engines exist) runs the full measure → cut → cost pipeline and prints a computed
BOQ + quotation for end-to-end verification.

---

## 14. Phase-2 integration contract

Phase 2 later implements its own CRUD repositories under the same
`adapters/persistence/repositories/` + `adapters/http/` structure and calls the existing
`estimateProject` / `generateQuotation` orchestration services. Engines and their DTOs are
untouched — this is the port/adapter boundary.

---

## 15. New dependencies

- `exceljs` — BOQ + report export (approved in tech-stack).
- `pdfkit` — quotation PDF (approved in tech-stack).
- AI: one of `openai` / `@anthropic-ai/sdk` / `@google/generative-ai` behind the adapter
  (only installed when `AI_PROVIDER` is set; `mock` is the default).
- No `multer` needed — logo/signature uploads via Cloudinary signed URL (Phase 2/3 UI).
