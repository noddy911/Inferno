/**
 * Report aggregators — pure functions over normalized row arrays (design §7).
 *
 * Each `aggregate*` takes a row array + filters and returns a `ReportResult` with paise
 * totals. No I/O: the persistence adapter loads/normalizes, this layer only computes, and
 * the exporter only renders. Empty periods and empty filters always return zero totals —
 * never an error (design §10).
 *
 * `from`/`to` are inclusive; quotation rows filter on `issuedAt`, boq rows on `date`.
 * `statuses` defaults to confirmed business (`sent` + `accepted`).
 */

import { DEFAULT_REPORT_STATUSES } from './dto.js';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const sum = (values) => values.reduce((acc, v) => acc + v, 0);
const round = (value) => Math.round(value);
const pct = (part, whole) => (whole ? Number(((part / whole) * 100).toFixed(2)) : 0);

/** Normalized timestamp for a row (boq rows use `date`, quotation rows `issuedAt`). */
function rowTime(row) {
  return new Date(row.date ?? row.issuedAt).getTime();
}

/** Inclusive date-range filter. */
function withinPeriod(rows, { from, to }) {
  if (!from && !to) return rows;
  const start = from ? from.getTime() : -Infinity;
  const end = to ? to.getTime() : Infinity;
  return rows.filter((r) => {
    const t = rowTime(r);
    return t >= start && t <= end;
  });
}

/** Status filter — confirmed business by default. */
function byStatus(rows, statuses) {
  const allowed = statuses ?? DEFAULT_REPORT_STATUSES;
  return rows.filter((r) => allowed.includes(r.status));
}

/** 'YYYY-MM' key derived in UTC so grouping is timezone-stable. */
export function monthKey(date) {
  const d = new Date(date);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
}

/** 'Aug 2026' display label for a 'YYYY-MM' key. */
export function monthLabel(key) {
  const [year, month] = key.split('-').map(Number);
  return `${MONTHS[month - 1]} ${year}`;
}

/** Every month key in [from, to]; null when the range is open-ended. */
export function monthsInRange(from, to) {
  if (!from || !to) return null;
  const keys = [];
  const cur = new Date(Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), 1));
  const end = new Date(Date.UTC(to.getUTCFullYear(), to.getUTCMonth(), 1));
  while (cur <= end) {
    keys.push(monthKey(cur));
    cur.setUTCMonth(cur.getUTCMonth() + 1);
  }
  return keys;
}

/**
 * Sales report — revenue (billed total), GST, order count, avg order value.
 * @param {import('./dto.js').QuotationReportRow[]} rows
 * @param {{from?: Date, to?: Date, groupBy?: 'month'|'none', statuses?: string[]}} [filters]
 */
export function aggregateSales(rows, filters = {}) {
  const { from, to, groupBy = 'month' } = filters;
  const active = byStatus(withinPeriod(rows, { from, to }), filters.statuses);

  const total = {
    count: active.length,
    revenuePaise: sum(active.map((r) => r.summary.totalPaise)),
    gstPaise: sum(active.map((r) => r.summary.gstPaise)),
    avgOrderValuePaise: active.length ? round(sum(active.map((r) => r.summary.totalPaise)) / active.length) : 0,
  };

  let buckets = [];
  if (groupBy === 'month') {
    const map = new Map();
    for (const r of active) {
      const key = monthKey(r.issuedAt);
      const bucket =
        map.get(key) ?? { period: key, label: monthLabel(key), count: 0, revenuePaise: 0, gstPaise: 0 };
      bucket.count += 1;
      bucket.revenuePaise += r.summary.totalPaise;
      bucket.gstPaise += r.summary.gstPaise;
      map.set(key, bucket);
    }
    const wanted = monthsInRange(from, to);
    if (wanted) {
      for (const key of wanted) {
        if (!map.has(key)) map.set(key, { period: key, label: monthLabel(key), count: 0, revenuePaise: 0, gstPaise: 0 });
      }
    }
    buckets = [...map.values()].sort((a, b) => a.period.localeCompare(b.period));
  }

  return { type: 'sales', from, to, groupBy, total, rows: buckets };
}

/**
 * Profit report — cost / revenue / profit over the range.
 * @param {import('./dto.js').QuotationReportRow[]} rows
 * @param {{from?: Date, to?: Date, statuses?: string[]}} [filters]
 */
export function aggregateProfit(rows, filters = {}) {
  const { from, to } = filters;
  const active = byStatus(withinPeriod(rows, { from, to }), filters.statuses);

  const total = {
    quotations: active.length,
    costPaise: sum(active.map((r) => r.totals.totalCostPaise)),
    revenuePaise: sum(active.map((r) => r.summary.totalPaise)),
    profitPaise: sum(active.map((r) => r.totals.profitPaise)),
  };
  total.profitMarginPercent = pct(total.profitPaise, total.costPaise);

  return { type: 'profit', from, to, total, rows: [] };
}

/**
 * Labour report — total labour cost + per-trade breakdown from the cost snapshot.
 * @param {import('./dto.js').QuotationReportRow[]} rows
 * @param {{from?: Date, to?: Date, statuses?: string[]}} [filters]
 */
export function aggregateLabour(rows, filters = {}) {
  const { from, to } = filters;
  const active = byStatus(withinPeriod(rows, { from, to }), filters.statuses);

  const byTrade = new Map();
  for (const r of active) {
    for (const [trade, paise] of Object.entries(r.costs?.labourByTradePaise ?? {})) {
      byTrade.set(trade, (byTrade.get(trade) ?? 0) + paise);
    }
  }
  const detail = [...byTrade.entries()]
    .filter(([, amountPaise]) => amountPaise > 0)
    .map(([trade, amountPaise]) => ({ trade, amountPaise }))
    .sort((a, b) => b.amountPaise - a.amountPaise);

  return {
    type: 'labour',
    from,
    to,
    total: { labourPaise: sum(detail.map((r) => r.amountPaise)), quotations: active.length },
    rows: detail,
  };
}

/**
 * Material report — usage + spend per material across BOQs in the range.
 * @param {import('./dto.js').BoqReportRow[]} rows
 * @param {{from?: Date, to?: Date}} [filters]
 */
export function aggregateMaterial(rows, filters = {}) {
  const { from, to } = filters;
  const active = withinPeriod(rows, { from, to });

  const byMaterial = new Map();
  for (const r of active) {
    const cur =
      byMaterial.get(r.materialId) ??
      {
        materialId: r.materialId,
        materialName: r.materialName,
        category: r.category,
        type: r.type,
        unit: r.unit,
        quantity: 0,
        wasteQty: 0,
        totalQty: 0,
        amountPaise: 0,
        quotations: 0,
      };
    cur.quantity += r.quantity;
    cur.wasteQty += r.wasteQty;
    cur.totalQty += r.totalQty;
    cur.amountPaise += r.amountPaise;
    cur.quotations += 1;
    byMaterial.set(r.materialId, cur);
  }

  const detail = [...byMaterial.values()].sort((a, b) => b.amountPaise - a.amountPaise);

  return {
    type: 'material',
    from,
    to,
    total: { lineItems: detail.length, amountPaise: sum(detail.map((r) => r.amountPaise)) },
    rows: detail,
  };
}

/**
 * Client report — quotations for one client in the range.
 * @param {import('./dto.js').QuotationReportRow[]} rows
 * @param {{clientId: string, from?: Date, to?: Date, statuses?: string[]}} filters
 */
export function aggregateClient(rows, filters = {}) {
  const { clientId, from, to } = filters;
  const active = byStatus(withinPeriod(rows, { from, to }), filters.statuses).filter(
    (r) => r.clientId === clientId
  );

  const detail = active
    .map((r) => ({
      quotationId: r.quotationId,
      quotationNumber: r.quotationNumber,
      issuedAt: r.issuedAt,
      status: r.status,
      totalPaise: r.summary.totalPaise,
      profitPaise: r.totals.profitPaise,
    }))
    .sort((a, b) => rowTime(b) - rowTime(a));

  return {
    type: 'client',
    clientId,
    from,
    to,
    total: {
      count: active.length,
      revenuePaise: sum(active.map((r) => r.summary.totalPaise)),
      profitPaise: sum(active.map((r) => r.totals.profitPaise)),
    },
    rows: detail,
  };
}

/**
 * Project report — quotations for one project (all time unless statuses override).
 * @param {import('./dto.js').QuotationReportRow[]} rows
 * @param {{projectId: string, statuses?: string[]}} filters
 */
export function aggregateProject(rows, filters = {}) {
  const { projectId } = filters;
  const active = byStatus(rows, filters.statuses).filter((r) => r.projectId === projectId);

  const detail = active
    .map((r) => ({
      quotationId: r.quotationId,
      quotationNumber: r.quotationNumber,
      issuedAt: r.issuedAt,
      status: r.status,
      totalPaise: r.summary.totalPaise,
      profitPaise: r.totals.profitPaise,
    }))
    .sort((a, b) => rowTime(b) - rowTime(a));

  return {
    type: 'project',
    projectId,
    total: {
      count: active.length,
      revenuePaise: sum(active.map((r) => r.summary.totalPaise)),
      profitPaise: sum(active.map((r) => r.totals.profitPaise)),
    },
    rows: detail,
  };
}
