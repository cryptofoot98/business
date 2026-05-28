import jsPDF from 'jspdf';
import autoTable, { CellHookData } from 'jspdf-autotable';
import {
  CostingModelProduct, CostingModelContainer, CostingScenario, ScenarioSummary, CostingSettings,
} from '../types/costing';
import {
  PRODUCT_CATEGORIES, AGENT_PORT_RATES, BAO_BUN_ADDITIONAL_DUTY_PER_100KG,
} from '../data/costingRates';

// Scenario column tints — must match the on-screen palette in MainCostingsTab.SCENARIO_PALETTE
// Format: RGB array for jspdf
const COLUMN_HEADER_RGB: [number, number, number][] = [
  [124, 58, 237],   // violet
  [79, 70, 229],    // indigo
  [13, 148, 136],   // teal
  [245, 158, 11],   // amber
  [225, 29, 72],    // rose
];
const COLUMN_TINT_RGB: [number, number, number][] = [
  [245, 240, 254],
  [240, 240, 255],
  [240, 251, 250],
  [255, 250, 240],
  [254, 240, 244],
];

const SECTION_BLUE   : [number, number, number] = [37, 99, 235];   // Product Details
const SECTION_AMBER  : [number, number, number] = [217, 119, 6];   // Container Details
const SECTION_VIOLET : [number, number, number] = [124, 58, 237];  // Scenarios
const SECTION_GREEN  : [number, number, number] = [22, 163, 74];   // Summary
const MUTED          : [number, number, number] = [100, 116, 139]; // slate-500
const INK            : [number, number, number] = [15, 23, 42];    // slate-900

const fmtGBP  = (v: number) => v.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtGBP4 = (v: number) => v.toLocaleString('en-GB', { minimumFractionDigits: 4, maximumFractionDigits: 4 });
const fmtNum  = (v: number) => v.toLocaleString('en-GB');

function categoryLabel(c: string): string {
  return PRODUCT_CATEGORIES.find(x => x.value === c)?.label ?? c;
}
function agentLabel(a: string, settings: CostingSettings): string {
  return settings.agentPortRates[a as keyof typeof settings.agentPortRates]?.label
    ?? AGENT_PORT_RATES[a as keyof typeof AGENT_PORT_RATES]?.label
    ?? a;
}

interface ExportArgs {
  name: string;                  // Calculation name from save form, else "Untitled"
  product: CostingModelProduct;
  container: CostingModelContainer;
  scenarios: CostingScenario[];
  results: ScenarioSummary[];
  settings: CostingSettings;
}

export function exportCostingPdf({ name, product, container, scenarios, results, settings }: ExportArgs) {
  // Landscape A4 — 297 × 210 mm. Up to 5 scenarios fit comfortably.
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const pageWidth  = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 12;

  // ── Header ──────────────────────────────────────────────────────────────────
  doc.setFillColor(15, 23, 42);
  doc.rect(0, 0, pageWidth, 22, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text('FOOD IMPORT COSTING', margin, 10);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(180, 198, 212);
  doc.text(`Costing Model · 5-scenario comparison`, margin, 16);

  const dateStr = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  doc.setFontSize(8);
  doc.text(dateStr, pageWidth - margin, 10, { align: 'right' });
  doc.setFontSize(10);
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.text(name, pageWidth - margin, 16, { align: 'right' });

  // ── Helper to draw a section heading bar ────────────────────────────────────
  const drawSectionHeader = (y: number, title: string, accent: [number, number, number]) => {
    doc.setFillColor(...accent);
    doc.rect(margin, y, 4, 6, 'F');
    doc.setTextColor(...accent);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text(title.toUpperCase(), margin + 6, y + 4.5);
  };

  let cursorY = 28;

  // ── 1. Product Details (blue) ──────────────────────────────────────────────
  drawSectionHeader(cursorY, 'Product Details', SECTION_BLUE);
  cursorY += 8;

  autoTable(doc, {
    startY: cursorY,
    head: [['Field', 'Value', 'Field', 'Value']],
    body: [
      ['Product Code',  product.productCode || '—',           'Description',          product.description || '—'],
      ['Meat / Category', categoryLabel(product.productCategory), 'Supplier',          product.supplier || '—'],
      ['Bags per Case', fmtNum(product.bagsPerCase),          'Case Weight (kg)',     fmtGBP(product.caseWeightKg)],
      ['Price USD/tonne', `$${fmtGBP(product.priceUSDPerTonne)}`, '', ''],
    ],
    theme: 'grid',
    styles: { font: 'helvetica', fontSize: 8, cellPadding: 1.6, lineColor: [220, 225, 232], lineWidth: 0.1, textColor: INK },
    headStyles: { fillColor: SECTION_BLUE, textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8 },
    columnStyles: {
      0: { fontStyle: 'bold', textColor: MUTED, cellWidth: 36 },
      1: { cellWidth: (pageWidth - margin * 2) / 2 - 36 },
      2: { fontStyle: 'bold', textColor: MUTED, cellWidth: 36 },
      3: { cellWidth: (pageWidth - margin * 2) / 2 - 36 },
    },
    margin: { left: margin, right: margin },
  });
  // @ts-expect-error: jsPDF augments doc with lastAutoTable at runtime
  cursorY = doc.lastAutoTable.finalY + 6;

  // ── 2. Container Details (amber) ───────────────────────────────────────────
  drawSectionHeader(cursorY, 'Container Details', SECTION_AMBER);
  cursorY += 8;

  const insurance = container.insuranceAuto
    ? `Auto (${(0.0025 * 100).toFixed(2)}% of product cost)`
    : `Manual £${fmtGBP(container.insuranceManualGBP)}/FCL`;
  const addDuty = product.productCategory === 'bao_bun'
    ? `£${BAO_BUN_ADDITIONAL_DUTY_PER_100KG}/100kg of container weight`
    : 'N/A (Bao Bun only)';

  autoTable(doc, {
    startY: cursorY,
    head: [['Field', 'Value', 'Field', 'Value']],
    body: [
      ['Clearance Type', container.clearanceType === 'licence' ? 'Licence' : 'Full Duty', 'Container Weight (kg)', fmtGBP(container.containerWeightKg)],
      ['Retail',         container.retail   ? 'Yes' : 'No',  'Handball',          container.handball ? 'Yes' : 'No'],
      ['Insurance',      insurance,                          'Additional Duty',   addDuty],
    ],
    theme: 'grid',
    styles: { font: 'helvetica', fontSize: 8, cellPadding: 1.6, lineColor: [220, 225, 232], lineWidth: 0.1, textColor: INK },
    headStyles: { fillColor: SECTION_AMBER, textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8 },
    columnStyles: {
      0: { fontStyle: 'bold', textColor: MUTED, cellWidth: 36 },
      1: { cellWidth: (pageWidth - margin * 2) / 2 - 36 },
      2: { fontStyle: 'bold', textColor: MUTED, cellWidth: 36 },
      3: { cellWidth: (pageWidth - margin * 2) / 2 - 36 },
    },
    margin: { left: margin, right: margin },
  });
  // @ts-expect-error: lastAutoTable
  cursorY = doc.lastAutoTable.finalY + 6;

  // ── 3. Costing Scenarios (violet, per-column colour-coded) ─────────────────
  drawSectionHeader(cursorY, 'Costing Scenarios', SECTION_VIOLET);
  cursorY += 8;

  const scenarioHead = [
    'Field',
    ...scenarios.map(s => s.label),
  ];
  const scenarioBody: string[][] = [
    ['Sales Currency',         ...scenarios.map(s => s.salesCurrency)],
    ['€ → £ Rate',             ...scenarios.map(s => s.eurGbpRate.toFixed(3))],
    ['Sales Price / Case',     ...scenarios.map(s => `${s.salesCurrency === 'GBP' ? '£' : '€'}${fmtGBP(s.salesPricePerCase)}`)],
    ['$ → £ Rate',             ...scenarios.map(s => s.exchangeRateUSDGBP.toFixed(3))],
    ['Cases / Container',      ...scenarios.map(s => fmtNum(s.casesPerContainer))],
    ['Incoterms',              ...scenarios.map(s => s.incoterms)],
    ['Freight Cost',           ...scenarios.map(s => `$${fmtGBP(s.freightCostUSD)}`)],
    ['Customs Agent / Port',   ...scenarios.map(s => agentLabel(s.agentPort, settings))],
    ['Transport £/Container',  ...scenarios.map(s => `£${fmtGBP(s.transportCostGBP)}`)],
    ['Licence Cost £/kg',      ...scenarios.map(s => `£${s.licenceCostPerKgGBP.toFixed(2)}`)],
  ];

  autoTable(doc, {
    startY: cursorY,
    head: [scenarioHead],
    body: scenarioBody,
    theme: 'grid',
    styles: { font: 'helvetica', fontSize: 8, cellPadding: 1.6, lineColor: [220, 225, 232], lineWidth: 0.1, textColor: INK },
    headStyles: { fillColor: SECTION_VIOLET, textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8, halign: 'center' },
    columnStyles: {
      0: { fontStyle: 'bold', textColor: MUTED, fillColor: [248, 250, 252], cellWidth: 44 },
    },
    didParseCell: (data: CellHookData) => {
      // Tint each scenario column with its palette colour; tint the header darker.
      if (data.column.index === 0) return;
      const palIdx = data.column.index - 1;
      if (data.section === 'head' && palIdx >= 0 && palIdx < COLUMN_HEADER_RGB.length) {
        data.cell.styles.fillColor = COLUMN_HEADER_RGB[palIdx];
      }
      if (data.section === 'body' && palIdx >= 0 && palIdx < COLUMN_TINT_RGB.length) {
        data.cell.styles.fillColor = COLUMN_TINT_RGB[palIdx];
        data.cell.styles.halign = 'right';
      }
    },
    margin: { left: margin, right: margin },
  });
  // @ts-expect-error: lastAutoTable
  cursorY = doc.lastAutoTable.finalY + 6;

  // New page if summary would overflow
  if (cursorY > pageHeight - 70) {
    doc.addPage();
    cursorY = margin + 4;
  }

  // ── 4. Summary (green) ─────────────────────────────────────────────────────
  drawSectionHeader(cursorY, 'Summary — Cost Breakdown & Margin', SECTION_GREEN);
  cursorY += 8;

  const summaryHead = ['Costing Scenario', ...scenarios.map(s => s.label)];
  type Row = { label: string; values: string[]; emphasis?: 'total' | 'margin' };
  const summaryRows: Row[] = [
    { label: 'Product Cost £',              values: results.map(r => fmtGBP(r.productCostGBP)) },
    { label: 'Duty',                        values: results.map(r => fmtGBP(r.dutyGBP)) },
    { label: 'Freight',                     values: results.map(r => fmtGBP(r.freightGBP)) },
    { label: 'Port Clearance + Transport',  values: results.map(r => fmtGBP(r.portClearanceTransportGBP)) },
    { label: 'Licence Cost',                values: results.map(r => fmtGBP(r.licenceCostGBP)) },
    { label: 'Handball',                    values: results.map(r => fmtGBP(r.handballGBP)) },
    { label: 'Currency / Insurance / Add 2', values: results.map(r => fmtGBP(r.currencyInsuranceAdditions2GBP)) },
    { label: 'Additions 1',                 values: results.map(r => fmtGBP(r.additions1GBP)) },
    { label: 'Additional Duty',             values: results.map(r => fmtGBP(r.additionalDutyGBP)) },
    { label: 'Insurance',                   values: results.map(r => fmtGBP(r.insurancePerFCLGBP)) },
    { label: 'Total Cost',                  values: results.map(r => fmtGBP(r.totalCostGBP)),     emphasis: 'total' },
    { label: 'Cost / Case',                 values: results.map(r => fmtGBP(r.costPerCaseGBP)),   emphasis: 'total' },
    { label: 'Cost / KG',                   values: results.map(r => fmtGBP4(r.costPerKgGBP)),    emphasis: 'total' },
    { label: 'Gross Margin %',              values: results.map(r => `${r.gmPercent.toFixed(1)}%`), emphasis: 'margin' },
  ];

  const summaryBody = summaryRows.map(r => [r.label, ...r.values]);

  autoTable(doc, {
    startY: cursorY,
    head: [summaryHead],
    body: summaryBody,
    theme: 'grid',
    styles: { font: 'helvetica', fontSize: 8, cellPadding: 1.8, lineColor: [220, 225, 232], lineWidth: 0.1, textColor: INK },
    headStyles: { fillColor: SECTION_GREEN, textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8, halign: 'center' },
    columnStyles: {
      0: { fontStyle: 'bold', textColor: MUTED, fillColor: [240, 253, 244], cellWidth: 50 },
    },
    didParseCell: (data: CellHookData) => {
      const palIdx = data.column.index - 1;
      // Per-column header tinting
      if (data.section === 'head' && data.column.index > 0 && palIdx < COLUMN_HEADER_RGB.length) {
        data.cell.styles.fillColor = COLUMN_HEADER_RGB[palIdx];
      }
      // Per-row emphasis on totals & margin
      const row = summaryRows[data.row.index];
      if (data.section === 'body' && row) {
        if (data.column.index > 0) {
          data.cell.styles.halign = 'right';
          // Subtle column tint
          if (palIdx < COLUMN_TINT_RGB.length) {
            data.cell.styles.fillColor = COLUMN_TINT_RGB[palIdx];
          }
        }
        if (row.emphasis === 'total') {
          data.cell.styles.fontStyle = 'bold';
          data.cell.styles.textColor = [20, 83, 45];
          if (data.column.index === 0) data.cell.styles.fillColor = [22, 163, 74];
          if (data.column.index === 0) data.cell.styles.textColor = [255, 255, 255];
        }
        if (row.emphasis === 'margin') {
          data.cell.styles.fontStyle = 'bold';
          data.cell.styles.fontSize = 10;
          if (data.column.index === 0) {
            data.cell.styles.fillColor = SECTION_GREEN;
            data.cell.styles.textColor = [255, 255, 255];
          } else {
            const pct = results[palIdx]?.gmPercent ?? 0;
            data.cell.styles.textColor = pct >= 20 ? [22, 163, 74] : pct >= 10 ? [202, 138, 4] : [220, 38, 38];
          }
        }
      }
    },
    margin: { left: margin, right: margin },
  });

  // ── Footer (page numbers + small disclaimer) ───────────────────────────────
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(7);
    doc.setTextColor(...MUTED);
    doc.text(
      `Generated ${new Date().toLocaleString('en-GB')} · Confidential commercial data`,
      margin, pageHeight - 6,
    );
    doc.text(`Page ${i} of ${totalPages}`, pageWidth - margin, pageHeight - 6, { align: 'right' });
  }

  // ── Save ────────────────────────────────────────────────────────────────────
  const safeName = (name || 'costing').replace(/[^a-z0-9_\- ]/gi, '').trim().replace(/\s+/g, '_');
  const dateSlug = new Date().toISOString().slice(0, 10);
  doc.save(`${safeName || 'costing'}_${dateSlug}.pdf`);
}
