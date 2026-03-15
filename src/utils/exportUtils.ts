import { PackingResult } from '../types';

export function exportResultsCSV(result: PackingResult, unit: string): void {
  const rows: string[] = [];

  rows.push('LoadCalc — Export');
  rows.push(`Container,${result.container.name}`);
  rows.push(`Mode,${result.loadingMode}`);
  rows.push(`Total Units,${result.totalCount}`);
  rows.push(`Volume Utilization,${(result.volumeUtilization * 100).toFixed(1)}%`);
  rows.push(`Payload Utilization,${(result.weightUtilization * 100).toFixed(1)}%`);
  rows.push(`Total Gross Weight,${result.totalGrossWeight.toFixed(1)} kg`);
  rows.push(`Total Net Weight,${result.totalNetWeight.toFixed(1)} kg`);
  rows.push('');
  rows.push(`Product,Units,L (${unit}),W (${unit}),H (${unit}),Gross Weight,Net Weight,Orientation`);

  for (const pr of result.productResults) {
    const [bL, bW, bH] = pr.orientation;
    const rotated = bL !== pr.product.length || bW !== pr.product.width || bH !== pr.product.height;
    rows.push(
      [
        pr.product.name,
        pr.count,
        bL,
        bW,
        bH,
        `${pr.product.grossWeight} kg`,
        `${pr.product.netWeight} kg`,
        rotated ? 'rotated' : 'standard',
      ].join(','),
    );
  }

  const csv = rows.join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'load-plan.csv';
  a.click();
  URL.revokeObjectURL(url);
}

export function printLoadReport(result: PackingResult, unit: string): void {
  const formatWeight = (kg: number) =>
    kg >= 1000 ? `${(kg / 1000).toFixed(2)} t` : `${kg.toFixed(0)} kg`;

  const productRows = result.productResults
    .map(pr => {
      const [bL, bW, bH] = pr.orientation;
      const rotated = bL !== pr.product.length || bW !== pr.product.width || bH !== pr.product.height;
      return `
      <tr>
        <td style="padding:8px 12px;border-bottom:1px solid #ddd;">${pr.product.name}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #ddd;text-align:right;font-weight:700;">${pr.count.toLocaleString()}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #ddd;">${bL}×${bW}×${bH} ${unit}${rotated ? ' <em>(rotated)</em>' : ''}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #ddd;">${formatWeight(pr.product.grossWeight)} each</td>
      </tr>`;
    })
    .join('');

  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Load Plan</title>
  <style>
    body{font-family:system-ui,sans-serif;padding:40px;color:#1a1a1a;max-width:900px;margin:0 auto;}
    h1{font-size:24px;font-weight:900;margin-bottom:4px;letter-spacing:-0.5px;}
    .meta{color:#666;font-size:13px;margin-bottom:28px;}
    .stats{display:grid;grid-template-columns:repeat(4,1fr);gap:16px;margin-bottom:28px;}
    .stat{border:2px solid #1a1a1a;padding:16px;background:#fafaf8;}
    .stat-label{font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:#666;margin-bottom:6px;}
    .stat-value{font-size:22px;font-weight:900;letter-spacing:-0.5px;}
    table{width:100%;border-collapse:collapse;font-size:14px;}
    th{background:#1a1a1a;color:#fff;padding:10px 12px;text-align:left;font-size:11px;text-transform:uppercase;letter-spacing:.06em;}
    tr:nth-child(even){background:#f7f4ef;}
    @media print{body{padding:20px;}}
  </style></head><body>
  <h1>Load Plan</h1>
  <div class="meta">${result.container.name} &bull; ${result.loadingMode} &bull; ${new Date().toLocaleDateString()}</div>
  <div class="stats">
    <div class="stat"><div class="stat-label">Units</div><div class="stat-value">${result.totalCount.toLocaleString()}</div></div>
    <div class="stat"><div class="stat-label">Volume</div><div class="stat-value">${(result.volumeUtilization * 100).toFixed(1)}%</div></div>
    <div class="stat"><div class="stat-label">Gross Weight</div><div class="stat-value">${formatWeight(result.totalGrossWeight)}</div></div>
    <div class="stat"><div class="stat-label">Net Weight</div><div class="stat-value">${formatWeight(result.totalNetWeight)}</div></div>
  </div>
  <table><thead><tr><th>Product</th><th>Units</th><th>Dimensions</th><th>Weight</th></tr></thead>
  <tbody>${productRows}</tbody></table>
  </body></html>`;

  const w = window.open('', '_blank');
  if (w) {
    w.document.write(html);
    w.document.close();
    setTimeout(() => w.print(), 400);
  }
}
