import { success } from '../../../utils/api-response.js';
import { buildReport } from '../../services/reports/report.service.js';
import { reportToBuffer } from '../../services/reports/report-exporter.js';

/**
 * GET /reports/:type — Get report statistics (Sales, Material, Profit, Labour, Client, Project).
 */
export async function getReportHandler(req, res) {
  const { type } = req.params;
  const { from, to, groupBy, clientId, projectId } = req.validated.query;

  const result = await buildReport(type, {
    from,
    to,
    groupBy,
    clientId,
    projectId,
  });

  return success(res, 'Report retrieved successfully', result);
}

/**
 * GET /reports/:type/export — Export report as an Excel file.
 */
export async function exportReportHandler(req, res) {
  const { type } = req.params;
  const { from, to, groupBy, clientId, projectId } = req.validated.query;

  const report = await buildReport(type, {
    from,
    to,
    groupBy,
    clientId,
    projectId,
  });

  const buffer = await reportToBuffer(report);

  res.setHeader(
    'Content-Type',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  );
  res.setHeader(
    'Content-Disposition',
    `attachment; filename=Report_${type}_${new Date().toISOString().slice(0, 10)}.xlsx`
  );

  return res.send(buffer);
}
