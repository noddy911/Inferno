/**
 * Report orchestration — validates the report type + filters, loads normalized rows from the
 * persistence layer, and delegates to the pure aggregator. Returns a `ReportResult` (paise)
 * ready for the JSON envelope or the Excel exporter. No HTTP here — reusable from REST, CLI,
 * tests, or AI workflows.
 */

import { invalidInput } from '../../../shared/errors.js';
import { reportFiltersSchema, REPORT_TYPES } from '../../../domain/reports/dto.js';
import {
  aggregateSales,
  aggregateProfit,
  aggregateLabour,
  aggregateMaterial,
  aggregateClient,
  aggregateProject,
} from '../../../domain/reports/report.aggregators.js';
import { loadQuotationRows, loadBoqRows } from '../../persistence/repositories/report.repository.js';

const AGGREGATORS = Object.freeze({
  sales: aggregateSales,
  profit: aggregateProfit,
  labour: aggregateLabour,
  material: aggregateMaterial,
  client: aggregateClient,
  project: aggregateProject,
});

/**
 * @param {'sales'|'profit'|'labour'|'material'|'client'|'project'} type
 * @param {import('../../../domain/reports/dto.js').ReportResult} [filters]
 * @returns {Promise<import('../../../domain/reports/dto.js').ReportResult>}
 */
export async function buildReport(type, filters = {}) {
  if (!REPORT_TYPES.includes(type)) {
    throw invalidInput(`Unknown report type: "${type}".`, { type, allowed: REPORT_TYPES });
  }
  const parsed = reportFiltersSchema.parse(filters);

  let rows;
  if (type === 'material') {
    rows = await loadBoqRows({ from: parsed.from, to: parsed.to });
  } else {
    rows = await loadQuotationRows({
      from: parsed.from,
      to: parsed.to,
      clientId: parsed.clientId,
      projectId: parsed.projectId,
    });
  }
  return AGGREGATORS[type](rows, parsed);
}
