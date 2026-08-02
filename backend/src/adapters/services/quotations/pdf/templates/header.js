/**
 * Quotation header — company branding (logo + name + GSTIN), quotation number/date block,
 * and client/project parties. Leaves the cursor ready for the items table.
 */

import { CONTENT_X, CONTENT_WIDTH, date } from '../format.js';

const RIGHT_X = CONTENT_X + CONTENT_WIDTH; // right edge

export function renderHeader(ctx) {
  const { doc, quotation, company = {}, client = {}, project = {} } = ctx;

  // Company (left) / "QUOTATION" masthead (right).
  doc.font('Helvetica-Bold').fontSize(15).fillColor('#111827');
  if (company.companyName) doc.text(company.companyName, CONTENT_X, 48);

  if (ctx.logo) {
    try {
      doc.image(ctx.logo, CONTENT_X, 78, { fit: [80, 40] });
    } catch {
      /* non-fatal: a bad logo must not break the PDF */
    }
    doc.y = Math.max(doc.y, 132);
  }

  doc.font('Helvetica').fontSize(9).fillColor('#6b7280');
  if (company.gstNumber) doc.text(`GSTIN: ${company.gstNumber}`, CONTENT_X, doc.y + 4);

  doc.font('Helvetica-Bold').fontSize(20).fillColor('#0f766e').text('QUOTATION', RIGHT_X, 48, { align: 'right' });
  doc.font('Helvetica').fontSize(10).fillColor('#111827');
  doc.text(`No: ${quotation.quotationNumber ?? '—'}`, RIGHT_X, doc.y, { align: 'right' });
  doc.text(`Date: ${date(quotation.issuedAt)}`, RIGHT_X, doc.y, { align: 'right' });
  doc.text(`Valid until: ${date(quotation.validUntil)}`, RIGHT_X, doc.y, { align: 'right' });

  // Parties.
  const partiesY = Math.max(doc.y, 148);
  doc.font('Helvetica-Bold').fontSize(10).fillColor('#111827');
  doc.text('To:', CONTENT_X, partiesY);
  if (client.name) doc.text(client.name, CONTENT_X, doc.y);
  doc.font('Helvetica').fontSize(9).fillColor('#4b5563');
  if (client.address) doc.text(client.address, CONTENT_X, doc.y, { width: 230 });
  if (client.phone) doc.text(`Phone: ${client.phone}`, CONTENT_X, doc.y);

  doc.font('Helvetica-Bold').fontSize(10).fillColor('#111827');
  if (project.projectName) doc.text('Project:', RIGHT_X, partiesY, { align: 'right' });
  doc.font('Helvetica').fontSize(9).fillColor('#4b5563');
  if (project.projectName) doc.text(project.projectName, RIGHT_X, doc.y, { align: 'right', width: 220 });
  if (project.siteAddress) doc.text(project.siteAddress, RIGHT_X, doc.y, { align: 'right', width: 220 });

  const ruleY = Math.max(doc.y, 212);
  doc.moveTo(CONTENT_X, ruleY).lineTo(RIGHT_X, ruleY).lineWidth(0.75).strokeColor('#0f766e').stroke();
  doc.y = ruleY + 12;
}
