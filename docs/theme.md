# Theme — Interior Quotation Platform

Design language for the platform's UI. The goal is a **calm, premium, editorial** feel —
appropriate for interior design firms — that stays legible and professional across light/dark
mode. Values below are the source of truth; they are applied to the shadcn/Tailwind v4 token
system in `frontend/src/app/globals.css` and the fonts in `frontend/src/app/layout.jsx`.

---

## 1. Brand personality

| Trait        | Direction                                                  |
| ------------ | ---------------------------------------------------------- |
| Tone         | Calm, confident, understated luxury — never flashy          |
| Inspiration  | Warm materials (linen, oak, clay), refined type, soft light |
| Feel         | Editorial SaaS for professionals (designers, sales)         |
| Avoid        | Neon gradients, playful multicolor, heavy glassmorphism     |

The palette leans on **warm neutrals** with a single **deep-teal brand accent**. Teal reads
trustworthy + creative (interior + AI) and stays comfortable against warm gray backgrounds in
both themes.

---

## 2. Color system

All values are `oklch(...)` (perceptual, theme-aware, already the format used by shadcn base).
Chroma/lightness were tuned so text-on-surface pairs meet **WCAG AA (≥ 4.5:1)**.

### 2.1 Brand primary — Deep Teal

| Stop        | Light mode                          | Dark mode                            | Usage                              |
| ----------- | ----------------------------------- | ------------------------------------ | ---------------------------------- |
| `--primary` | `oklch(0.47 0.10 196)`              | `oklch(0.78 0.085 196)`              | Buttons, links, active nav, focus  |
| on-primary  | `oklch(0.985 0.003 196)` (white)    | `oklch(0.20 0.03 196)` (deep teal)   | Text/icons on primary surfaces     |
| soft        | `oklch(0.95 0.025 196)`             | `oklch(0.27 0.04 196)`               | Active sidebar item, teal badges   |
| hover       | `oklch(0.42 0.10 196)`              | `oklch(0.82 0.08 196)`               | Button hover state                 |

### 2.2 Warm neutrals

Light mode:

| Token               | Value                            | Usage                              |
| ------------------- | -------------------------------- | ---------------------------------- |
| `--background`      | `oklch(0.985 0.004 70)`          | App canvas (soft warm paper)       |
| `--foreground`      | `oklch(0.22 0.015 45)`           | Primary text (warm near-black)     |
| `--card`            | `oklch(0.998 0.002 70)`          | Cards, popovers, sheets            |
| `--popover`         | `oklch(0.998 0.002 70)`          | Dropdowns, popovers                |
| `--muted`           | `oklch(0.955 0.007 70)`          | Secondary surfaces, table zebra    |
| `--muted-foreground`| `oklch(0.53 0.015 45)`           | Secondary text, placeholders       |
| `--accent`          | `oklch(0.945 0.012 196)`         | Hover surfaces, selected rows      |
| `--accent-foreground`| `oklch(0.30 0.06 196)`          | Text on accent surfaces            |
| `--border`          | `oklch(0.91 0.006 70)`           | Card/form borders                  |
| `--input`           | `oklch(0.90 0.006 70)`           | Form input borders                 |
| `--ring`            | `oklch(0.47 0.10 196)` (primary) | Focus rings                        |

Dark mode:

| Token                | Value                           | Usage                              |
| -------------------- | ------------------------------- | ---------------------------------- |
| `--background`       | `oklch(0.19 0.01 45)`           | App canvas (warm charcoal)         |
| `--foreground`       | `oklch(0.955 0.004 70)`         | Primary text (warm white)          |
| `--card`             | `oklch(0.225 0.012 45)`         | Cards, popovers, sheets            |
| `--popover`          | `oklch(0.225 0.012 45)`         | Dropdowns, popovers                |
| `--muted`            | `oklch(0.27 0.012 45)`          | Secondary surfaces                 |
| `--muted-foreground` | `oklch(0.71 0.01 60)`           | Secondary text                     |
| `--accent`           | `oklch(0.29 0.03 196)`          | Hover surfaces                     |
| `--accent-foreground`| `oklch(0.90 0.03 196)`          | Text on accent surfaces            |
| `--border`           | `oklch(1 0 0 / 10%)`            | Card/form borders                  |
| `--input`            | `oklch(1 0 0 / 15%)`            | Form input borders                 |
| `--ring`             | `oklch(0.72 0.085 196)`         | Focus rings                        |

### 2.3 Semantic status

| Token         | Light mode                          | Dark mode                           | Usage                          |
| ------------- | ----------------------------------- | ----------------------------------- | ------------------------------ |
| `--success`   | `oklch(0.57 0.13 155)`              | `oklch(0.72 0.12 155)`              | Paid, verified, positive       |
| `--warning`   | `oklch(0.66 0.14 70)`               | `oklch(0.80 0.13 75)`               | Pending, needs attention       |
| `--destructive`| `oklch(0.577 0.245 27.325)`        | `oklch(0.704 0.191 22.216)`         | Errors, delete, declined       |
| `--info`      | `oklch(0.62 0.12 235)`              | `oklch(0.74 0.10 235)`              | Guidance, notifications        |

`--success` / `--warning` / `--info` are new tokens (added alongside shadcn's defaults) used by
badges, status pills, and chart legends. They each need a matching `-foreground` (dark text on
light chips in dark mode, white text in light mode).

### 2.4 Chart palette

Tuned for the dashboard/BOQ visualizations (max 5 data series; dark mode uses lighter variants):

1. Teal `oklch(0.55 0.10 196)`
2. Emerald `oklch(0.60 0.13 155)`
3. Gold `oklch(0.70 0.13 85)`
4. Terracotta `oklch(0.58 0.11 30)`
5. Slate blue `oklch(0.60 0.12 260)`

---

## 3. Typography

- **Body / UI — Geist Sans** (already wired as `--font-geist-sans`). Workhorse for everything:
  text, labels, tables, buttons.
- **Headings — Fraunces (variable serif)**, loaded via `next/font/google`, mapped to
  `--font-heading`. Gives an editorial, atelier feel for page titles and the login/hero brand.
  (Swap to Geist if a cleaner SaaS look is preferred — only the `--font-heading` mapping changes.)
- Monospace — Geist Mono for numbers/measurements, measurement formatting, and code.

### Type scale

| Role            | Size / weight                          | Tracking   | Notes                          |
| --------------- | -------------------------------------- | ---------- | ------------------------------ |
| Display         | `text-4xl` → `text-6xl`, `font-semibold` | `tracking-tight` | Landing/auth hero, `font-heading` |
| H1 (page title) | `text-3xl`, `font-semibold`            | `tracking-tight` | `font-heading`                 |
| H2 (section)    | `text-2xl`, `font-semibold`            | `tracking-tight` | `font-heading`                 |
| H3 (card)       | `text-lg`, `font-medium`               | —            | Geist                         |
| Body            | `text-sm`/`text-base`, `font-normal`   | —            | `leading-6` (1.5)              |
| Small / caption | `text-xs`, `text-muted-foreground`     | —            | Helper, timestamps             |
| Label / overline| `text-xs`, uppercase, `font-medium`    | `tracking-wider` | Form labels, table headers   |
| Numeric         | Geist Mono, `tabular-nums`             | —            | Prices, areas, quantities      |

---

## 4. Shape & elevation

- **Radius**: keep shadcn base `--radius: 0.625rem`. Cards/inputs use `radius-lg`, small
  controls (badges, chips) `radius-sm`/`radius-md`.
- **Shadows**: theme-aware via `color-mix()` so they work in both modes. Define three
  elevations as Tailwind theme tokens:

| Elevation | Token name        | Value (light/dark-adaptive)                          | Used for                  |
| --------- | ----------------- | ---------------------------------------------------- | ------------------------- |
| 1         | `--shadow-elev-1` | `0 1px 2px` + `0 2px 8px`, ~8% foreground             | Cards, inputs             |
| 2         | `--shadow-elev-2` | `0 4px 16px`, ~12% foreground                          | Dropdowns, popovers, sheet|
| 3         | `--shadow-elev-3` | `0 12px 40px`, ~18% foreground                         | Modals, toasts            |

---

## 5. Dark mode

- Applied via the `.dark` class on `<html>` (next-themes already does this).
- Rules: never pure black — warm charcoal backgrounds; borders are translucent white
  (`1 0 0 / 10%`) instead of black-based; primary inverts to a **lighter** teal so buttons stay
  readable; status colors lighten.
- Reduced-motion preference: disable transform transitions.

---

## 6. Component conventions

- **Buttons** — primary: `bg-primary text-primary-foreground`, hover `primary-soft→strong`;
  secondary: `bg-secondary text-secondary-foreground`; outline: `border` + transparent;
  ghost: transparent, `hover:bg-accent`; destructive: `bg-destructive text-white`.
- **Cards** — `bg-card border rounded-lg shadow-[elev-1]`; header = title (H3) + optional
  description, content padded `p-6`; `space-y` between stacked cards.
- **Sidebar** — `bg-sidebar border-r`; active item = `bg-[primary-soft] text-primary` in light,
  `bg-sidebar-primary text-sidebar-primary-foreground` in dark; inactive hover `bg-accent`.
  Brand wordmark in header, version footnote at bottom.
- **Forms** — labels: overline style (uppercase, `tracking-wider`, `text-muted-foreground`);
  inputs: `bg-transparent border-input rounded-md focus-visible:ring-2 ring-ring`;
  errors: `text-destructive text-xs mt-1`; validation via Zod messages.
- **Badges / status pills** — tinted chips: `bg-[status-soft] text-[status-foreground]`,
  e.g. `success` = green chip; `warning` = amber chip.
- **Tables** — header row: overline (uppercase `text-xs text-muted-foreground`); rows:
  `border-b`; hover row: `bg-accent/50`; numeric cells: Geist Mono `tabular-nums`.
- **Empty states** — centered icon (muted), H3 title, body copy in `text-muted-foreground`,
  optional primary action button.
- **Toasts** — Sonner, `richColors` **off**, theme-aware, top-right.

---

## 7. Accessibility

- All text/background pairs ≥ **4.5:1** (AA) for normal text, ≥ 3:1 for large text.
- Focus-visible: 2px `--ring` outline with 2px offset on every interactive control.
- Never convey state by color alone — pair status colors with an icon or label.
- Touch targets ≥ 40px (44px preferred).
- Respect `prefers-reduced-motion`.

---

## 8. Token mapping → implementation

Everything above is already expressible in the current stack:

1. `frontend/src/app/globals.css` — replace `:root` / `.dark` custom-property values with the
   tables in §2; add `--success/-warning/-info` (+ soft/foreground pairs) and chart tokens;
   add `--shadow-elev-1..3`; map `--font-heading` in `@theme inline` (§3).
2. `frontend/src/app/layout.jsx` — add Fraunces to `next/font/google`, expose it as
   `--font-heading` (§3).
3. Component classes use the existing shadcn utilities (`bg-primary`, `text-muted-foreground`,
   `shadow-[--shadow-elev-2]`, `font-heading`) — no structural changes needed.

## 9. Non-goals (for now)

- No custom animations/motion library; Tailwind + CSS transitions only.
- No light/dark asymmetric layout changes — only color/typography tokens.
- Chart lib (Recharts or similar) deferred to Phase 2; palette reserved in §2.4.
