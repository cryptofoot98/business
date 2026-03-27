import { PackingResult, PackedBox } from '../types';

export function getPracticalCount(result: PackingResult): number {
  return result.totalCount;
}

interface GridData {
  rows: number[];
  cols: number[];
  grid: number[][];
  total: number;
}

function buildGrid(boxes: PackedBox[], bL: number, bW: number): GridData {
  const rowMap = new Map<number, Map<number, number>>();
  const rowSet = new Set<number>();
  const colSet = new Set<number>();

  for (const box of boxes) {
    const row = Math.round(box.x / bL);
    const col = Math.round(box.y / bW);
    rowSet.add(row);
    colSet.add(col);
    if (!rowMap.has(row)) rowMap.set(row, new Map());
    const colMap = rowMap.get(row)!;
    colMap.set(col, (colMap.get(col) ?? 0) + 1);
  }

  const rows = Array.from(rowSet).sort((a, b) => a - b);
  const cols = Array.from(colSet).sort((a, b) => a - b);
  const grid = rows.map(r => cols.map(c => rowMap.get(r)?.get(c) ?? 0));

  return { rows, cols, grid, total: boxes.length };
}

function formatDateEn(d: Date): string {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
}

export function printLoadPlan(result: PackingResult, unit: string): void {
  const today = new Date();
  const isReefer = result.container.category === 'Reefer';
  const totalCartons = result.totalCount;
  const volPct = (result.volumeUtilization * 100).toFixed(1);
  const wtPct = (result.weightUtilization * 100).toFixed(1);
  const totalGrossKg = result.totalGrossWeight.toFixed(3);
  const totalNetKg = result.totalNetWeight.toFixed(3);

  const productsByName = result.productResults.filter(pr => pr.count > 0);

  const productSections = productsByName.map((pr, pidx) => {
    const count = pr.count;
    const boxes = result.packedBoxes.filter(b => b.productId === pr.product.id);
    const [bL, bW, bH] = pr.orientation;
    const { rows, cols, grid } = buildGrid(boxes, bL, bW);

    const isRotated = bL !== pr.product.length || bW !== pr.product.width || bH !== pr.product.height;
    const dimNote = `${bL} × ${bW} × ${bH} cm${isRotated ? ' (Rotated)' : ''}`;
    const grossTotal = (count * pr.product.grossWeight).toFixed(3);
    const netTotal = (count * pr.product.netWeight).toFixed(3);

    const maxCols = Math.max(cols.length, 8);
    const colHeaders = Array.from({ length: maxCols }, (_, i) =>
      `<th style="min-width:28px;width:28px;text-align:center;">${i + 1}</th>`
    ).join('');

    const rowsHtml = rows.map((_, rIdx) => {
      const rowData = grid[rIdx] ?? [];
      const rowTotal = rowData.reduce((s, v) => s + v, 0);
      const cells = Array.from({ length: maxCols }, (_, cIdx) => {
        const val = rowData[cIdx] ?? 0;
        return `<td style="text-align:center;${val === 0 ? 'color:#ccc;' : 'font-weight:600;'}">${val || '—'}</td>`;
      }).join('');
      return `<tr style="${rIdx % 2 === 1 ? 'background:#f8f8f8;' : ''}">
        <td style="text-align:center;font-weight:700;background:#f0f0f0;color:#555;">${rIdx + 1}</td>
        ${cells}
        <td style="text-align:center;font-weight:800;background:#f0f0f0;">${rowTotal}</td>
      </tr>`;
    }).join('');

    const colTotals = Array.from({ length: maxCols }, (_, cIdx) =>
      `<td style="text-align:center;font-weight:700;">${rows.reduce((s, _, ri) => s + (grid[ri]?.[cIdx] ?? 0), 0) || ''}</td>`
    ).join('');

    const COLORS = ['#c63320','#1572b6','#1b6b40','#d96a1c','#6b21a8','#0e7490'];
    const color = COLORS[pidx % COLORS.length];

    return `
      <div style="margin-bottom:32px;page-break-inside:avoid;">
        <div style="display:flex;align-items:center;justify-content:space-between;padding:10px 14px;background:${color};color:#fff;margin-bottom:0;">
          <div>
            <span style="font-weight:800;font-size:14px;letter-spacing:-0.3px;">${pr.product.name}</span>
            <span style="font-size:10px;opacity:0.75;margin-left:12px;">${dimNote}</span>
          </div>
          <div style="text-align:right;">
            <div style="font-size:22px;font-weight:900;line-height:1;">${count.toLocaleString()}</div>
            <div style="font-size:9px;opacity:0.75;text-transform:uppercase;letter-spacing:.08em;">cartons</div>
          </div>
        </div>
        <table style="width:100%;border-collapse:collapse;font-size:10px;border:1px solid #ddd;">
          <thead>
            <tr style="background:#f5f5f5;">
              <th style="width:32px;text-align:center;color:#888;font-weight:600;">Row</th>
              ${colHeaders}
              <th style="width:40px;text-align:center;background:#eaeaea;font-weight:700;">Total</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml}
            <tr style="background:#efefef;font-weight:700;border-top:2px solid #ccc;">
              <td style="text-align:center;color:#888;font-size:9px;">Total</td>
              ${colTotals}
              <td style="text-align:center;font-weight:900;background:#e0e0e0;">${count.toLocaleString()}</td>
            </tr>
          </tbody>
        </table>
        <div style="display:flex;gap:24px;padding:8px 12px;background:#fafafa;border:1px solid #ddd;border-top:none;font-size:10px;color:#555;">
          <span><strong>Layers / Rows / Cols:</strong> ${pr.nZ} × ${pr.nX} × ${pr.nY}</span>
          <span><strong>Gross:</strong> ${grossTotal} kg</span>
          <span><strong>Net:</strong> ${netTotal} kg</span>
          ${pr.product.grossWeight > 0 ? `<span><strong>Per box:</strong> ${pr.product.grossWeight} kg</span>` : ''}
        </div>
      </div>`;
  }).join('');

  const summaryRows = productsByName.map((pr, pidx) => {
    const gross = (pr.count * pr.product.grossWeight).toFixed(3);
    const net = (pr.count * pr.product.netWeight).toFixed(3);
    const COLORS = ['#c63320','#1572b6','#1b6b40','#d96a1c','#6b21a8','#0e7490'];
    const color = COLORS[pidx % COLORS.length];
    return `<tr>
      <td style="padding:8px 12px;">
        <div style="display:flex;align-items:center;gap:8px;">
          <div style="width:10px;height:10px;background:${color};flex-shrink:0;"></div>
          <span style="font-weight:600;">${pr.product.name}</span>
        </div>
      </td>
      <td style="text-align:center;padding:8px 12px;font-weight:700;">${pr.count.toLocaleString()}</td>
      <td style="text-align:right;padding:8px 12px;">${gross} kg</td>
      <td style="text-align:right;padding:8px 12px;">${net} kg</td>
    </tr>`;
  }).join('');

  void unit;

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>Load Plan — ${result.container.shortName} — ${formatDateEn(today)}</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: 'Inter', 'Helvetica Neue', Arial, sans-serif;
    font-size: 11px;
    color: #1a1a1a;
    background: #fff;
    padding: 24px 28px;
    line-height: 1.4;
  }
  table { border-collapse: collapse; width: 100%; }
  td, th { border: 1px solid #ddd; padding: 4px 6px; vertical-align: middle; }
  th { font-weight: 700; font-size: 10px; text-transform: uppercase; letter-spacing: .04em; }
  .no-print {
    position: fixed; top: 12px; right: 16px;
    display: flex; gap: 8px; z-index: 999;
  }
  .btn {
    padding: 9px 20px; font-size: 11px; font-weight: 700;
    text-transform: uppercase; letter-spacing: .06em;
    cursor: pointer; border: none; border-radius: 2px;
  }
  .btn-primary { background: #1a1a1a; color: #fff; }
  .btn-secondary { background: #f0f0f0; color: #1a1a1a; }
  @media print {
    body { padding: 8mm 10mm; }
    .no-print { display: none !important; }
    @page { size: A4 landscape; margin: 8mm; }
    div { page-break-inside: avoid; }
  }
</style>
</head>
<body>

<div class="no-print">
  <button class="btn btn-primary" onclick="window.print()">Save as PDF</button>
  <button class="btn btn-secondary" onclick="window.close()">Close</button>
</div>

<div style="display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:20px;padding-bottom:16px;border-bottom:3px solid #1a1a1a;">
  <div>
    <div style="font-size:22px;font-weight:900;letter-spacing:-0.5px;line-height:1;">LOAD PLAN</div>
    <div style="font-size:12px;color:#666;margin-top:4px;">${result.container.name}${isReefer ? ' · REEFER' : ''} · ${result.container.innerLength} × ${result.container.innerWidth} × ${result.container.innerHeight} cm · ${formatDateEn(today)}</div>
  </div>
  <div style="text-align:right;">
    <div style="font-size:36px;font-weight:900;letter-spacing:-1px;color:#1a1a1a;line-height:1;">${totalCartons.toLocaleString()}</div>
    <div style="font-size:10px;color:#888;text-transform:uppercase;letter-spacing:.08em;margin-top:2px;">Total Cartons</div>
  </div>
</div>

<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:24px;">
  ${[
    { label: 'Volume Fill', value: volPct + '%', sub: `${(result.containerVolumeCm3 / 1_000_000).toFixed(1)} m³ capacity` },
    { label: 'Payload', value: wtPct + '%', sub: `${result.container.maxPayload.toLocaleString()} kg max` },
    { label: 'Gross Weight', value: totalGrossKg + ' kg', sub: (parseFloat(totalGrossKg)/1000).toFixed(3) + ' MT' },
    { label: 'Net Weight', value: totalNetKg + ' kg', sub: (parseFloat(totalNetKg)/1000).toFixed(3) + ' MT' },
  ].map(s => `
    <div style="border:1px solid #ddd;padding:10px 14px;">
      <div style="font-size:9px;text-transform:uppercase;letter-spacing:.06em;color:#888;font-weight:600;margin-bottom:4px;">${s.label}</div>
      <div style="font-size:18px;font-weight:800;line-height:1;">${s.value}</div>
      <div style="font-size:9px;color:#aaa;margin-top:3px;">${s.sub}</div>
    </div>`).join('')}
</div>

<div style="margin-bottom:20px;padding:10px 14px;background:#fafafa;border:1px solid #e0e0e0;border-left:3px solid #1a1a1a;font-size:10px;color:#555;">
  <strong style="color:#1a1a1a;">Loading sequence:</strong> Load lightest products first (rear of container) · Heaviest products loaded last (near door) · Distribute weight evenly across floor width · Load from rear towards door
  ${isReefer ? ' · Maintain airflow gaps above MAX LOAD LINE · Ensure T-floor air channels are unobstructed' : ''}
</div>

${productSections}

<div style="page-break-inside:avoid;margin-top:8px;">
  <div style="font-size:13px;font-weight:800;text-transform:uppercase;letter-spacing:.04em;margin-bottom:8px;padding-bottom:6px;border-bottom:2px solid #1a1a1a;">Summary</div>
  <table style="font-size:11px;">
    <thead>
      <tr style="background:#1a1a1a;color:#fff;">
        <th style="text-align:left;padding:8px 12px;">Product</th>
        <th style="text-align:center;padding:8px 12px;">Cartons</th>
        <th style="text-align:right;padding:8px 12px;">Gross Weight</th>
        <th style="text-align:right;padding:8px 12px;">Net Weight</th>
      </tr>
    </thead>
    <tbody>
      ${summaryRows}
      <tr style="background:#1a1a1a;color:#fff;font-weight:800;">
        <td style="padding:8px 12px;">TOTAL</td>
        <td style="text-align:center;padding:8px 12px;font-size:14px;">${totalCartons.toLocaleString()}</td>
        <td style="text-align:right;padding:8px 12px;">${totalGrossKg} kg</td>
        <td style="text-align:right;padding:8px 12px;">${totalNetKg} kg</td>
      </tr>
    </tbody>
  </table>
</div>

<div style="margin-top:16px;font-size:9px;color:#aaa;display:flex;justify-content:space-between;border-top:1px solid #eee;padding-top:10px;">
  <span>Volume fill: ${volPct}% — theoretical maximum based on box and container dimensions.</span>
  <span>Generated by iO Smart Container · ${formatDateEn(today)}</span>
</div>

</body>
</html>`;

  const printWin = window.open('', '_blank', 'width=1100,height=850');
  if (!printWin) {
    alert('Popup blocked. Please allow popups for this site to generate the PDF.');
    return;
  }
  printWin.document.open();
  printWin.document.write(html);
  printWin.document.close();
  printWin.onload = () => setTimeout(() => { printWin.focus(); printWin.print(); }, 600);
}
