import jsPDF from 'jspdf';
import autoTable, { CellHookData } from 'jspdf-autotable';
import { ImportControl, ImportControlResults } from '../types/importControl';

const fmtGBP   = (v: number) => v.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtGBP4  = (v: number) => v.toLocaleString('en-GB', { minimumFractionDigits: 4, maximumFractionDigits: 4 });
const fmtUSD   = (v: number) => v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtDate  = (iso: string) => {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('en-GB');
};
const INK   : [number, number, number] = [15, 23, 42];
const MUTED : [number, number, number] = [100, 116, 139];
const GREEN : [number, number, number] = [22, 163, 74];
const AMBER : [number, number, number] = [217, 119, 6];
const BLUE  : [number, number, number] = [37, 99, 235];
const VIOLET: [number, number, number] = [124, 58, 237];

interface Args {
  name: string;
  ic: ImportControl;
  results: ImportControlResults;
}

export function exportImportControlPdf({ name, ic, results }: Args) {
  // Landscape A4, two pages mirroring the source Import Control Sheet
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const pageWidth  = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 10;

  // ── Page 1 ─────────────────────────────────────────────────────────────────
  drawHeaderBand(doc, pageWidth, margin, name, ic);
  let y = 38;

  // Top-left: container info (label/value pairs)
  autoTable(doc, {
    startY: y,
    body: [
      ['Container Number',        ic.header.containerNumber || '—', 'Bill of Lading',        ic.header.billOfLading || '—',  'FOB',     ic.header.fobAgent || '—'],
      ['Load Number',             ic.header.loadNumber || '—',     'Purchase Order No',      ic.header.purchaseOrderNo || '—', 'Cleared', ic.header.cleared ? 'CLEARED' : 'PENDING'],
      ['Shipping Company',        ic.header.shippingCompany || '—', 'Transport Company',     ic.header.transportCompany || '—', 'Delivery to', ic.header.deliveryTo || '—'],
      ['Port of Arrival',         ic.header.portOfArrival || '—',  'Bulk PO',                ic.header.bulkPo || '—',          'Exchange Rate', ic.header.exchangeRateUSDGBP > 0 ? ic.header.exchangeRateUSDGBP.toFixed(4) : '—'],
      ['Arrival Date',            fmtDate(ic.header.arrivalDate) || '—', 'Collection from Port', fmtDate(ic.header.collectionDateFromPort) || '—', '% Container Fill (qty ordered)', `${results.percentageContainerFill.toFixed(2)}%`],
    ],
    theme: 'grid',
    styles: { font: 'helvetica', fontSize: 8, cellPadding: 1.6, lineColor: [220, 225, 232], lineWidth: 0.1, textColor: INK },
    columnStyles: {
      0: { fontStyle: 'bold', textColor: MUTED, cellWidth: 40 },
      1: { cellWidth: (pageWidth - margin * 2 - 120) / 3 + 8 },
      2: { fontStyle: 'bold', textColor: MUTED, cellWidth: 40 },
      3: { cellWidth: (pageWidth - margin * 2 - 120) / 3 + 8 },
      4: { fontStyle: 'bold', textColor: MUTED, cellWidth: 40 },
      5: { cellWidth: (pageWidth - margin * 2 - 120) / 3 + 8 },
    },
    margin: { left: margin, right: margin },
  });
  // @ts-expect-error: lastAutoTable
  y = doc.lastAutoTable.finalY + 4;

  // Two side-by-side blocks: cost stack (left) + clearance lines (right)
  const halfWidth = (pageWidth - margin * 2 - 4) / 2;

  const costBody = [
    ['Product cost Sterling',     `£${fmtGBP(results.productCostSterling)}`],
    ['Duty from HM Customs',       `£${fmtGBP(ic.costs.dutyFromHMCustoms)}`],
    ['Port Clearance Charges',     `£${fmtGBP(results.portClearanceCharges)}`],
    ['Hand ball',                  `£${fmtGBP(ic.costs.handball)}`],
    ['Packaging costs',            `£${fmtGBP(ic.costs.packagingCosts)}`],
    ['Insurance per container',    `£${fmtGBP(ic.costs.insurancePerContainer)}`],
    ['Thai duty on packaging',     `£${fmtGBP(ic.costs.thaiDutyOnPackaging)}`],
    ['Bag wastage G/L',            `£${fmtGBP(ic.costs.bagWastageGL)}`],
    ['Licence cost',               `£${fmtGBP(ic.costs.licenceCost)}`],
    ['* Additions LC',             `£${fmtGBP(ic.costs.additionsLC)}`],
    ['** Additions 2',             `£${fmtGBP(ic.costs.additions2)}`],
    ['Commissions',                `£${fmtGBP(ic.costs.commissions)}`],
  ];
  autoTable(doc, {
    startY: y,
    head: [['Container Cost Stack', '£']],
    body: [
      ...costBody,
      ['Total Container Cost', `£${fmtGBP(results.totalContainerCost)}`],
    ],
    theme: 'grid',
    styles: { font: 'helvetica', fontSize: 8, cellPadding: 1.4, lineColor: [220, 225, 232], lineWidth: 0.1, textColor: INK },
    headStyles: { fillColor: AMBER, textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8, halign: 'left' },
    columnStyles: {
      0: { fontStyle: 'bold', textColor: MUTED, cellWidth: halfWidth * 0.65 },
      1: { halign: 'right', fontStyle: 'bold', cellWidth: halfWidth * 0.35 },
    },
    didParseCell: (data: CellHookData) => {
      if (data.section === 'body' && data.row.index === costBody.length) {
        data.cell.styles.fillColor = [254, 243, 199];
        data.cell.styles.textColor = [120, 53, 15];
        data.cell.styles.fontSize = 9;
      }
    },
    margin: { left: margin, right: margin + halfWidth + 4 },
    tableWidth: halfWidth,
  });
  // @ts-expect-error: lastAutoTable
  const costY = doc.lastAutoTable.finalY;

  const clearanceBody = [
    ['EWL Charges',                `£${fmtGBP(ic.clearance.ewlCharges)}`],
    ['Terminal Fees',              `£${fmtGBP(ic.clearance.terminalFees)}`],
    ['Document Fees',              `£${fmtGBP(ic.clearance.documentFees)}`],
    ['Customs Clearance',          `£${fmtGBP(ic.clearance.customsClearance)}`],
    ['Freight blended adjustment', `£${fmtGBP(ic.clearance.freightBlendedAdjustment)}`],
    ['Free time storage extra',    `£${fmtGBP(ic.clearance.freeTimeStorageExtra)}`],
    ['Port Examination',           `£${fmtGBP(ic.clearance.portExamination)}`],
    ['Port Health',                `£${fmtGBP(ic.clearance.portHealth)}`],
    ['Ocean Freight £',            `£${fmtGBP(ic.clearance.oceanFreightGBP)}`],
    ['Ocean Freight $ (ref)',      `$${fmtUSD(ic.clearance.oceanFreightUSD)}`],
    ['Lo-Lo',                      `£${fmtGBP(ic.clearance.loLo)}`],
    ['Demurrage',                  `£${fmtGBP(ic.clearance.demurrage)}`],
    ['Vehicle Detention',          `£${fmtGBP(ic.clearance.vehicleDetention)}`],
    ['UK Transport',               `£${fmtGBP(ic.clearance.ukTransport)}`],
  ];
  autoTable(doc, {
    startY: y,
    head: [['Clearance Line Items', '£']],
    body: [
      ...clearanceBody,
      ['Total (£)', `£${fmtGBP(results.clearanceTotalGBP)}`],
    ],
    theme: 'grid',
    styles: { font: 'helvetica', fontSize: 8, cellPadding: 1.4, lineColor: [220, 225, 232], lineWidth: 0.1, textColor: INK },
    headStyles: { fillColor: AMBER, textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8, halign: 'left' },
    columnStyles: {
      0: { fontStyle: 'bold', textColor: MUTED, cellWidth: halfWidth * 0.65 },
      1: { halign: 'right', fontStyle: 'bold', cellWidth: halfWidth * 0.35 },
    },
    didParseCell: (data: CellHookData) => {
      if (data.section === 'body' && data.row.index === clearanceBody.length) {
        data.cell.styles.fillColor = [254, 243, 199];
        data.cell.styles.textColor = [120, 53, 15];
        data.cell.styles.fontSize = 9;
      }
    },
    margin: { left: margin + halfWidth + 4, right: margin },
    tableWidth: halfWidth,
  });
  // @ts-expect-error: lastAutoTable
  const clearY = doc.lastAutoTable.finalY;
  y = Math.max(costY, clearY) + 4;

  // Bottom: summary stats + per-product cost table
  if (y > pageHeight - 50) { doc.addPage(); drawHeaderBand(doc, pageWidth, margin, name, ic); y = 38; }

  // Stat strip
  drawStatStrip(doc, margin, y, pageWidth - margin * 2, [
    { label: 'Total Container Cost',  value: `£${fmtGBP(results.totalContainerCost)}` },
    { label: 'Total Cases',           value: results.totalCases.toLocaleString('en-GB') },
    { label: 'Container Weight (t)',  value: results.containerWeightTonnes.toFixed(4) },
    { label: '% Container Fill',      value: `${results.percentageContainerFill.toFixed(2)}%` },
    { label: 'Total Cost of Extras',  value: `£${fmtGBP(results.totalCostOfExtras)}` },
    { label: 'Price per Kilo',        value: `£${fmtGBP4(results.pricePerKilo)}` },
  ]);
  y += 16;

  // Per-product summary table
  autoTable(doc, {
    startY: y,
    head: [['Product', 'Case Price', 'Total Product Value', 'Cumulative Total', 'Sales Price', 'Margin %']],
    body: ic.products.map((p, i) => {
      const r = results.perProduct[i];
      return [
        `${p.productCode || '—'}  ${p.productDescription || ''}`.trim(),
        `£${fmtGBP4(r?.costPerCase ?? 0)}`,
        `£${fmtGBP(r?.totalProductValue ?? 0)}`,
        `£${fmtGBP(r?.cumulativeTotal ?? 0)}`,
        p.salesPricePerCase > 0 ? `£${fmtGBP(p.salesPricePerCase)}` : '—',
        r && p.salesPricePerCase > 0 ? `${r.marginPercent.toFixed(2)}%` : '—',
      ];
    }),
    theme: 'grid',
    styles: { font: 'helvetica', fontSize: 8, cellPadding: 1.8, lineColor: [220, 225, 232], lineWidth: 0.1, textColor: INK },
    headStyles: { fillColor: GREEN, textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8, halign: 'left' },
    columnStyles: {
      0: { cellWidth: 90 },
      1: { halign: 'right', cellWidth: 30 },
      2: { halign: 'right', cellWidth: 36 },
      3: { halign: 'right', cellWidth: 36 },
      4: { halign: 'right', cellWidth: 30 },
      5: { halign: 'right', cellWidth: 26, fontStyle: 'bold' },
    },
    didParseCell: (data: CellHookData) => {
      if (data.section === 'body' && data.column.index === 5) {
        const r = results.perProduct[data.row.index];
        if (r) {
          data.cell.styles.textColor = r.marginPercent >= 20 ? [22, 163, 74] : r.marginPercent >= 10 ? [202, 138, 4] : [220, 38, 38];
        }
      }
    },
    margin: { left: margin, right: margin },
  });

  // ── Page 2 — per-product detail ────────────────────────────────────────────
  doc.addPage();
  drawHeaderBand(doc, pageWidth, margin, name, ic);
  y = 38;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(...VIOLET);
  doc.text('PER-PRODUCT DETAIL', margin, y + 4);
  y += 8;

  // 2 columns × N rows — like PDF page 2's "1st Product / 2nd Product" side-by-side
  const productHalf = (pageWidth - margin * 2 - 4) / 2;
  for (let pair = 0; pair < Math.ceil(ic.products.length / 2); pair++) {
    const left  = ic.products[pair * 2];
    const right = ic.products[pair * 2 + 1];
    const lr    = results.perProduct[pair * 2];
    const rr    = results.perProduct[pair * 2 + 1];

    if (left) {
      drawProductDetailBlock(doc, margin, y, productHalf, pair * 2, left, lr, ic.header.exchangeRateUSDGBP);
    }
    if (right) {
      drawProductDetailBlock(doc, margin + productHalf + 4, y, productHalf, pair * 2 + 1, right, rr, ic.header.exchangeRateUSDGBP);
    }
    y += 70;
    if (y > pageHeight - 50 && pair < Math.ceil(ic.products.length / 2) - 1) {
      doc.addPage();
      drawHeaderBand(doc, pageWidth, margin, name, ic);
      y = 38;
    }
  }

  // ── Footer on all pages ────────────────────────────────────────────────────
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(7);
    doc.setTextColor(...MUTED);
    doc.text(`Generated ${new Date().toLocaleString('en-GB')} · Confidential commercial data`, margin, pageHeight - 6);
    doc.text(`Page ${i} of ${totalPages}`, pageWidth - margin, pageHeight - 6, { align: 'right' });
  }

  const safeName = (name || 'import_control').replace(/[^a-z0-9_\- ]/gi, '').trim().replace(/\s+/g, '_');
  const dateSlug = new Date().toISOString().slice(0, 10);
  doc.save(`${safeName || 'import_control'}_${dateSlug}.pdf`);
}

// ── Header band drawn on every page ───────────────────────────────────────────

function drawHeaderBand(doc: jsPDF, pageWidth: number, margin: number, name: string, ic: ImportControl) {
  doc.setFillColor(15, 23, 42);
  doc.rect(0, 0, pageWidth, 22, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text('IMPORT CONTROL SHEET', margin, 10);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(180, 198, 212);
  doc.text('Post-arrival container reconciliation', margin, 16);

  doc.setFontSize(8);
  doc.text(new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }), pageWidth - margin, 10, { align: 'right' });
  doc.setFontSize(10);
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.text(name || ic.header.containerNumber || 'Untitled', pageWidth - margin, 16, { align: 'right' });
}

// ── Stat strip ────────────────────────────────────────────────────────────────

function drawStatStrip(doc: jsPDF, x: number, y: number, w: number, stats: { label: string; value: string }[]) {
  const cellW = w / stats.length;
  stats.forEach((s, i) => {
    const cx = x + i * cellW;
    doc.setFillColor(240, 253, 244);
    doc.rect(cx, y, cellW - 1, 14, 'F');
    doc.setDrawColor(187, 247, 208);
    doc.setLineWidth(0.2);
    doc.rect(cx, y, cellW - 1, 14, 'S');
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(...MUTED);
    doc.text(s.label.toUpperCase(), cx + 2, y + 4);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(20, 83, 45);
    doc.text(s.value, cx + 2, y + 11);
  });
}

// ── Per-product detail block (PDF page 2 style) ───────────────────────────────

function drawProductDetailBlock(
  doc: jsPDF, x: number, y: number, w: number, idx: number,
  p: ImportControl['products'][number], r: ImportControlResults['perProduct'][number] | undefined,
  fx: number,
) {
  const ordinal = ['1st', '2nd', '3rd', '4th'][idx] ?? `${idx + 1}th`;
  doc.setDrawColor(124, 58, 237);
  doc.setFillColor(245, 240, 254);
  doc.roundedRect(x, y, w, 64, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(...VIOLET);
  doc.text(`${ordinal} Product`, x + 3, y + 5);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(...INK);
  doc.text(`${p.productCode || '—'}`, x + 30, y + 5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(...MUTED);
  const desc = (p.productDescription || '').slice(0, 64);
  doc.text(desc, x + 3, y + 10);

  // 2-column grid of label/values
  const rowH = 6;
  let ry = y + 14;
  const lcol = x + 3;
  const vcol = x + w / 2 - 4;
  const lcol2 = x + w / 2 + 4;
  const vcol2 = x + w - 3;

  const left: [string, string][] = [
    ['PO Cost ($)',            `$${fmtUSD(p.poCostUSD)}`],
    ['Product Cost ($)',       `$${fmtUSD(p.productCostUSD)}`],
    ['Case Count',             p.caseCount.toLocaleString('en-GB')],
    ['Case Weight (kg)',       p.caseWeight ? p.caseWeight.toFixed(2) : '—'],
    ['Quantity (PO)',          p.quantity.toLocaleString('en-GB')],
    ['Exchange Rate',          fx > 0 ? fx.toFixed(4) : '—'],
  ];
  const right: [string, string][] = [
    ['Total Weight (tonnes)',  r ? r.totalWeightTonnes.toFixed(4) : '—'],
    ['Product Cost (£)',       r ? `£${fmtGBP(r.productCostGBP)}` : '—'],
    ['Net Price / Case',       r ? `£${fmtGBP(r.netPricePerCase)}` : '—'],
    ['Cost / Case (loaded)',   r ? `£${fmtGBP(r.costPerCase)}` : '—'],
    ['Sales Price / Case',     p.salesPricePerCase > 0 ? `£${fmtGBP(p.salesPricePerCase)}` : '—'],
    ['Margin %',               r && p.salesPricePerCase > 0 ? `${r.marginPercent.toFixed(2)}%` : '—'],
  ];

  doc.setFontSize(7);
  for (let i = 0; i < 6; i++) {
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...MUTED);
    doc.text(left[i][0], lcol, ry);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...INK);
    doc.text(left[i][1], vcol, ry, { align: 'right' });

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...MUTED);
    doc.text(right[i][0], lcol2, ry);
    doc.setFont('helvetica', 'bold');
    if (i === 5 && r && p.salesPricePerCase > 0) {
      const c = r.marginPercent >= 20 ? GREEN : r.marginPercent >= 10 ? [202, 138, 4] as [number, number, number] : [220, 38, 38] as [number, number, number];
      doc.setTextColor(...c);
    } else {
      doc.setTextColor(...INK);
    }
    doc.text(right[i][1], vcol2, ry, { align: 'right' });

    ry += rowH;
  }
  // Reset for next block
  void BLUE;
}
