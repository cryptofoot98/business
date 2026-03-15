import { PackingResult, PackedBox } from '../types';

interface GridData {
  xVals: number[];
  yVals: number[];
  grid: number[][];
  total: number;
}

function buildProductGrid(boxes: PackedBox[]): GridData {
  const posMap = new Map<string, number>();
  const xSet = new Set<number>();
  const ySet = new Set<number>();

  for (const box of boxes) {
    const key = `${Math.round(box.x * 100)}_${Math.round(box.y * 100)}`;
    posMap.set(key, (posMap.get(key) ?? 0) + 1);
    xSet.add(Math.round(box.x * 100));
    ySet.add(Math.round(box.y * 100));
  }

  const xVals = Array.from(xSet).sort((a, b) => a - b);
  const yVals = Array.from(ySet).sort((a, b) => a - b);

  const grid = xVals.map(x =>
    yVals.map(y => posMap.get(`${x}_${y}`) ?? 0),
  );

  return { xVals, yVals, grid, total: boxes.length };
}

function formatDate(d: Date): string {
  const day = String(d.getDate()).padStart(2, '0');
  const months = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
  const year = d.getFullYear() + 543;
  return `${day} ${months[d.getMonth()]} ${year}`;
}

function formatDateEn(d: Date): string {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
}

function buildLoadingSequence(result: PackingResult): string {
  const sorted = [...result.productResults]
    .filter(pr => pr.count > 0)
    .sort((a, b) => b.product.grossWeight - a.product.grossWeight);

  const rows = sorted.map((pr, i) => {
    const flags: string[] = [];
    if (pr.product.fragile) flags.push('FRAGILE — single layer max');
    if (pr.product.stackable === false) flags.push('DO NOT STACK');
    if (pr.product.orientationLock && pr.product.orientationLock !== 'none') {
      flags.push(pr.product.orientationLock === 'upright' ? 'THIS SIDE UP' : 'LAY FLAT');
    }
    const note = flags.length > 0 ? `<span style="color:#c63320;font-weight:700;">${flags.join(' · ')}</span>` : '—';
    return `<tr style="${i % 2 === 1 ? 'background:#f9f7f4;' : ''}">
      <td style="text-align:center;font-weight:800;font-size:14px;width:36px;">${i + 1}</td>
      <td style="font-weight:700;">${pr.product.name}</td>
      <td style="text-align:center;">${pr.count.toLocaleString()}</td>
      <td style="text-align:center;">${pr.nZ}</td>
      <td style="text-align:center;">${pr.product.grossWeight > 0 ? pr.product.grossWeight.toFixed(1) + ' kg' : '—'}</td>
      <td>${note}</td>
    </tr>`;
  }).join('');

  return `
    <div style="margin-bottom:28px;page-break-inside:avoid;">
      <div style="font-size:14px;font-weight:800;margin:0 0 8px;border-bottom:2px solid #1a1a1a;padding-bottom:6px;display:flex;justify-content:space-between;align-items:baseline;">
        <span>ลำดับการบรรจุ (Loading Sequence)</span>
        <span style="font-size:11px;font-weight:400;color:#666;">Load heaviest products first · Fragile on top</span>
      </div>
      <table style="width:100%;border-collapse:collapse;font-size:11px;">
        <thead>
          <tr style="background:#1a1a1a;color:#fff;">
            <th style="padding:6px 8px;text-align:center;">#</th>
            <th style="padding:6px 8px;text-align:left;">Product</th>
            <th style="padding:6px 8px;text-align:center;">Qty</th>
            <th style="padding:6px 8px;text-align:center;">Layers</th>
            <th style="padding:6px 8px;text-align:center;">Gross/box</th>
            <th style="padding:6px 8px;text-align:left;">Handling Notes</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
      <div style="margin-top:8px;font-size:10px;color:#888;font-style:italic;">
        Load from the back of the container towards the door. Distribute weight evenly across the floor width.
      </div>
    </div>`;
}

function buildWeightDistribution(result: PackingResult): string {
  const cogX = result.centerOfGravityX;
  const cogY = result.centerOfGravityY;
  if (!cogX || cogX <= 0) return '';

  const lengthPct = Math.round((cogX / result.container.innerLength) * 100);
  const widthPct = cogY ? Math.round((cogY / result.container.innerWidth) * 100) : 50;

  const ax = result.container.axleConfig;
  let axleHtml = '';
  if (ax && result.totalGrossWeight > 0) {
    const span = ax.rearAxleX - ax.frontAxleX;
    const distFromFront = cogX - ax.frontAxleX;
    const rearLoad = result.totalGrossWeight * (distFromFront / span);
    const frontLoad = result.totalGrossWeight - rearLoad;
    const frontPct = Math.min((frontLoad / ax.maxFrontAxleKg) * 100, 100);
    const rearPct = Math.min((rearLoad / ax.maxRearAxleKg) * 100, 100);
    const frontOver = frontLoad > ax.maxFrontAxleKg;
    const rearOver = rearLoad > ax.maxRearAxleKg;

    axleHtml = `
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-top:12px;">
        <div>
          <div style="font-size:10px;font-weight:700;text-transform:uppercase;color:#666;margin-bottom:4px;">Front Axle Load</div>
          <div style="font-size:15px;font-weight:800;color:${frontOver ? '#c63320' : '#1a1a1a'};">${frontLoad.toFixed(0)} kg ${frontOver ? '<span style="font-size:10px;color:#c63320;">OVERLOAD</span>' : ''}</div>
          <div style="height:6px;background:#eee;border:1px solid #ccc;margin-top:4px;overflow:hidden;">
            <div style="height:100%;width:${frontPct}%;background:${frontOver ? '#c63320' : '#1572b6'};"></div>
          </div>
          <div style="font-size:9px;color:#999;margin-top:2px;">max ${ax.maxFrontAxleKg.toLocaleString()} kg</div>
        </div>
        <div>
          <div style="font-size:10px;font-weight:700;text-transform:uppercase;color:#666;margin-bottom:4px;">Rear Axle Load</div>
          <div style="font-size:15px;font-weight:800;color:${rearOver ? '#c63320' : '#1a1a1a'};">${rearLoad.toFixed(0)} kg ${rearOver ? '<span style="font-size:10px;color:#c63320;">OVERLOAD</span>' : ''}</div>
          <div style="height:6px;background:#eee;border:1px solid #ccc;margin-top:4px;overflow:hidden;">
            <div style="height:100%;width:${rearPct}%;background:${rearOver ? '#c63320' : '#1572b6'};"></div>
          </div>
          <div style="font-size:9px;color:#999;margin-top:2px;">max ${ax.maxRearAxleKg.toLocaleString()} kg</div>
        </div>
      </div>`;
  }

  const barLeft = Math.max(2, Math.min(lengthPct - 1, 97));
  const dotLeft = Math.max(2, Math.min(widthPct, 98));

  return `
    <div style="margin-bottom:28px;page-break-inside:avoid;">
      <div style="font-size:14px;font-weight:800;margin:0 0 8px;border-bottom:2px solid #1a1a1a;padding-bottom:6px;">
        การกระจายน้ำหนัก (Weight Distribution &amp; Centre of Gravity)
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:24px;">
        <div>
          <div style="font-size:10px;font-weight:700;text-transform:uppercase;color:#666;margin-bottom:6px;">Longitudinal CoG (front→back)</div>
          <div style="position:relative;height:28px;background:linear-gradient(90deg,#e8f4e8 0%,#fff8e1 50%,#fce4ec 100%);border:1px solid #bbb;border-radius:2px;">
            <div style="position:absolute;top:0;bottom:0;left:${barLeft}%;width:2px;background:#c63320;"></div>
            <div style="position:absolute;top:50%;left:${barLeft}%;transform:translate(-50%,-50%);background:#c63320;color:#fff;font-size:9px;font-weight:800;padding:1px 5px;white-space:nowrap;">${lengthPct}%</div>
          </div>
          <div style="display:flex;justify-content:space-between;font-size:9px;color:#999;margin-top:3px;"><span>FRONT (door)</span><span>REAR</span></div>
          <div style="margin-top:6px;font-size:11px;font-weight:700;">CoG at ${Math.round(cogX)} cm from front</div>
          <div style="font-size:10px;color:#666;margin-top:2px;">Ideal range: 40–60% of container length</div>
          ${lengthPct < 35 || lengthPct > 65 ? `<div style="margin-top:6px;padding:5px 8px;background:#fff3cd;border:1px solid #ffc107;font-size:10px;font-weight:700;color:#856404;">WARNING: Load is unbalanced. Redistribute weight towards the ${lengthPct < 35 ? 'rear' : 'front'}.</div>` : ''}
        </div>
        <div>
          <div style="font-size:10px;font-weight:700;text-transform:uppercase;color:#666;margin-bottom:6px;">Lateral CoG (left→right)</div>
          <div style="position:relative;height:28px;background:linear-gradient(90deg,#fce4ec 0%,#fff8e1 50%,#fce4ec 100%);border:1px solid #bbb;border-radius:2px;">
            <div style="position:absolute;top:0;bottom:0;left:${dotLeft}%;width:2px;background:#1572b6;"></div>
            <div style="position:absolute;top:50%;left:${dotLeft}%;transform:translate(-50%,-50%);background:#1572b6;color:#fff;font-size:9px;font-weight:800;padding:1px 5px;white-space:nowrap;">${widthPct}%</div>
          </div>
          <div style="display:flex;justify-content:space-between;font-size:9px;color:#999;margin-top:3px;"><span>LEFT</span><span>RIGHT</span></div>
          <div style="margin-top:6px;font-size:11px;font-weight:700;">Lateral balance: ${widthPct > 40 && widthPct < 60 ? 'Good' : 'Check distribution'}</div>
          <div style="font-size:10px;color:#666;margin-top:2px;">Ideal range: 40–60% of container width</div>
        </div>
      </div>
      ${axleHtml}
    </div>`;
}

export function printLoadPlan(result: PackingResult, unit: string): void {
  const today = new Date();
  const thaiDate = formatDate(today);
  const engDate = formatDateEn(today);

  const isReefer = result.container.category === 'Reefer';
  const totalCartons = result.totalCount;
  const totalGrossKg = result.totalGrossWeight.toFixed(3);
  const totalGrossMt = (result.totalGrossWeight / 1000).toFixed(5);
  const totalNetKg = result.totalNetWeight.toFixed(3);
  const totalNetMt = (result.totalNetWeight / 1000).toFixed(5);

  const productsByName = result.productResults.filter(pr => pr.count > 0);

  const productSections = productsByName.map((pr) => {
    const boxes = result.packedBoxes.filter(b => b.productId === pr.product.id);
    const { xVals, yVals, grid, total } = buildProductGrid(boxes);
    const [bL, bW, bH] = pr.orientation;
    const isRotated = bL !== pr.product.length || bW !== pr.product.width || bH !== pr.product.height;
    const nCols = yVals.length;
    const maxCols = Math.max(nCols, 8);

    const colHeaders = Array.from({ length: maxCols }, (_, i) => `<th style="min-width:32px;">${i + 1}</th>`).join('');

    const rowsHtml = xVals.map((_, xIdx) => {
      const rowNum = xIdx + 1;
      const rowData = grid[xIdx] ?? [];
      const rowTotal = rowData.reduce((s, v) => s + v, 0);

      const cells = Array.from({ length: maxCols }, (_, yIdx) => {
        const val = rowData[yIdx] ?? 0;
        return `<td style="text-align:center;${val === 0 ? 'color:#bbb;' : ''}">${val}</td>`;
      }).join('');

      return `<tr>
        <td style="text-align:center;font-weight:700;background:#f5f5f2;">${rowNum}</td>
        <td style="max-width:220px;word-break:break-word;">${pr.product.name}</td>
        ${cells}
        <td style="text-align:center;font-weight:700;background:#f0f0ec;">${rowTotal}</td>
      </tr>`;
    }).join('');

    const dimNote = `${bL} × ${bW} × ${bH} cm${isRotated ? ' (หมุน/Rotated)' : ''}`;
    const grossTotal = (pr.count * pr.product.grossWeight).toFixed(3);
    const netTotal = (pr.count * pr.product.netWeight).toFixed(3);

    const handlingBadges: string[] = [];
    if (pr.product.fragile) handlingBadges.push('<span style="background:#c63320;color:#fff;font-size:9px;font-weight:800;padding:2px 6px;margin-right:4px;text-transform:uppercase;">FRAGILE</span>');
    if (pr.product.stackable === false) handlingBadges.push('<span style="background:#d96a1c;color:#fff;font-size:9px;font-weight:800;padding:2px 6px;margin-right:4px;text-transform:uppercase;">DO NOT STACK</span>');
    if (pr.product.orientationLock === 'upright') handlingBadges.push('<span style="background:#1572b6;color:#fff;font-size:9px;font-weight:800;padding:2px 6px;margin-right:4px;text-transform:uppercase;">THIS SIDE UP</span>');
    if (pr.product.orientationLock === 'on-side') handlingBadges.push('<span style="background:#1572b6;color:#fff;font-size:9px;font-weight:800;padding:2px 6px;margin-right:4px;text-transform:uppercase;">LAY FLAT</span>');

    return `
      <div style="margin-bottom:32px;page-break-inside:avoid;">
        <div style="background:#1a1a1a;color:#fff;padding:8px 12px;display:flex;justify-content:space-between;align-items:center;margin-bottom:0;">
          <span style="font-weight:800;font-size:13px;">${pr.product.name}</span>
          <span style="font-size:11px;opacity:.7;">${dimNote}</span>
        </div>
        ${handlingBadges.length > 0 ? `<div style="padding:5px 12px;background:#fff3cd;border:1px solid #ffc107;border-top:none;">${handlingBadges.join('')}</div>` : ''}
        <table style="width:100%;border-collapse:collapse;font-size:11px;border:1px solid #ccc;">
          <thead>
            <tr style="background:#f0ece4;">
              <th style="width:42px;text-align:center;">แถว<br/><span style="font-weight:400;font-size:9px;">Row</span></th>
              <th style="text-align:left;min-width:160px;">ชื่อผลิตภัณฑ์<br/><span style="font-weight:400;font-size:9px;">Product Items</span></th>
              ${colHeaders}
              <th style="min-width:44px;text-align:center;background:#e8e4dc;">รวม<br/><span style="font-weight:400;font-size:9px;">Total</span></th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml}
            <tr style="background:#f5f2ec;font-weight:700;">
              <td colspan="2" style="text-align:right;padding-right:8px;">รวมทั้งหมด / Grand Total</td>
              ${Array.from({ length: maxCols }, (_, yIdx) => {
                const colSum = xVals.reduce((s, _, xi) => s + (grid[xi]?.[yIdx] ?? 0), 0);
                return `<td style="text-align:center;">${colSum || ''}</td>`;
              }).join('')}
              <td style="text-align:center;background:#e8e4dc;font-weight:900;">${total}</td>
            </tr>
          </tbody>
        </table>
        <div style="margin-top:8px;padding:8px 12px;background:#f7f4ed;border:1px solid #ddd;font-size:11px;display:flex;gap:32px;flex-wrap:wrap;">
          <span><strong>บรรจุภัณฑ์ / Packages:</strong> ${pr.count.toLocaleString()} cartons</span>
          <span><strong>น้ำหนักรวม / Gross Weight:</strong> ${grossTotal} KGS</span>
          <span><strong>น้ำหนักสุทธิ / Net Weight:</strong> ${netTotal} KGS</span>
          <span><strong>Layers / Rows / Cols:</strong> ${pr.nZ} × ${pr.nX} × ${pr.nY}</span>
        </div>
      </div>`;
  }).join('');

  const summaryRows = productsByName.map(pr => {
    const grossTotal = (pr.count * pr.product.grossWeight).toFixed(3);
    const netTotal = (pr.count * pr.product.netWeight).toFixed(3);
    return `<tr>
      <td colspan="2" style="padding:6px 8px;">${pr.product.name}</td>
      <td style="text-align:center;padding:6px 8px;">${pr.count.toLocaleString()}</td>
      <td style="text-align:right;padding:6px 8px;">${grossTotal}</td>
      <td style="text-align:right;padding:6px 8px;">${netTotal}</td>
    </tr>`;
  }).join('');

  const containerDimNote = `${result.container.innerLength} × ${result.container.innerWidth} × ${result.container.innerHeight} CM`;
  const volPct = (result.volumeUtilization * 100).toFixed(1);
  const wtPct = (result.weightUtilization * 100).toFixed(1);
  const unitLabel = unit.toUpperCase();

  const loadingSequenceHtml = buildLoadingSequence(result);
  const weightDistHtml = buildWeightDistribution(result);

  const html = `<!DOCTYPE html>
<html lang="th">
<head>
<meta charset="utf-8">
<title>Load Plan — ${result.container.shortName}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Sarabun:wght@400;600;700;800&display=swap" rel="stylesheet">
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: 'Sarabun', 'Noto Sans Thai', Arial, sans-serif;
    font-size: 12px;
    color: #1a1a1a;
    background: #fff;
    padding: 20px 28px;
  }
  h1 { font-size: 17px; font-weight: 800; text-align: center; margin-bottom: 4px; letter-spacing: -0.3px; }
  h2 { font-size: 13px; font-weight: 600; text-align: center; color: #555; margin-bottom: 20px; }
  table { border-collapse: collapse; }
  td, th { border: 1px solid #bbb; padding: 4px 6px; font-size: 11px; vertical-align: top; }
  th { font-weight: 700; background: #f0ece4; }
  .header-grid { width: 100%; border: 1px solid #bbb; border-collapse: collapse; margin-bottom: 20px; }
  .header-grid td { border: 1px solid #bbb; padding: 5px 8px; font-size: 11px; }
  .header-grid .label { font-weight: 700; color: #444; white-space: nowrap; background: #faf8f4; width: 1%; }
  .header-grid .dots { border-bottom: 1px dashed #999; color: #555; }
  .section-title {
    font-size: 16px;
    font-weight: 800;
    text-align: center;
    margin: 12px 0 4px;
    letter-spacing: 0.3px;
  }
  .section-subtitle {
    font-size: 12px;
    font-weight: 600;
    text-align: center;
    color: #666;
    margin-bottom: 18px;
  }
  .summary-table { width: 100%; border-collapse: collapse; font-size: 11px; margin-top: 12px; }
  .summary-table th { background: #1a1a1a; color: #fff; padding: 7px 8px; }
  .summary-table td { padding: 6px 8px; border: 1px solid #ccc; }
  .summary-table tr:nth-child(even) td { background: #f7f4ef; }
  .totals-row td { font-weight: 800; background: #f0ece4 !important; border-top: 2px solid #555; }
  .sig-row { display: flex; gap: 48px; justify-content: space-between; margin-top: 40px; }
  .sig-block { flex: 1; text-align: center; }
  .sig-line { border-top: 1px solid #555; margin-top: 40px; margin-bottom: 6px; }
  .sig-title { font-size: 10px; color: #666; }
  .note { font-size: 10px; color: #888; margin-top: 12px; font-style: italic; }
  .badge {
    display: inline-block;
    padding: 2px 8px;
    border: 1px solid #1a1a1a;
    font-size: 10px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: .06em;
    margin-left: 8px;
    vertical-align: middle;
  }
  .no-print {
    position: fixed;
    top: 12px;
    right: 16px;
    display: flex;
    gap: 8px;
    z-index: 999;
  }
  .btn-print, .btn-close {
    padding: 8px 18px;
    font-size: 12px;
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: .08em;
    cursor: pointer;
    border: 2px solid #1a1a1a;
    background: #1a1a1a;
    color: #fff;
    box-shadow: 3px 3px 0 #666;
  }
  .btn-close {
    background: #fff;
    color: #1a1a1a;
  }
  @media print {
    body { padding: 10mm 12mm; font-size: 10px; }
    .no-print { display: none !important; }
    h1 { font-size: 14px; }
    .section-title { font-size: 14px; }
    table, tr, td, th { page-break-inside: avoid; }
    div[style*="page-break-inside:avoid"] { page-break-inside: avoid; }
    @page { size: A4; margin: 10mm; }
  }
</style>
</head>
<body>

<div class="no-print">
  <button class="btn-print" onclick="window.print()">Save as PDF / Print</button>
  <button class="btn-close" onclick="window.close()">Close</button>
</div>

<div class="section-title">รายละเอียดผลิตภัณฑ์ในตู้สินค้า</div>
<div class="section-subtitle">Checklist of Product Items in Container</div>

<table class="header-grid">
  <tr>
    <td class="label">บริษัท (Establishment)</td>
    <td class="dots" colspan="3">.....................................................................</td>
    <td class="label" style="white-space:nowrap;">TH/EST.</td>
    <td class="dots" colspan="2">......................</td>
    <td class="label" style="white-space:nowrap;">ตรวจสอบวันที่ (Date)</td>
    <td class="dots">${thaiDate} / ${engDate}</td>
  </tr>
  <tr>
    <td class="label">ระหว่างเวลา (Start time)</td>
    <td class="dots">.........................</td>
    <td class="label">ถึง (Finish time)</td>
    <td class="dots">.........................</td>
    <td class="label" colspan="2">ผลิตภัณฑ์จำนวนนี้ได้รับอนุญาตให้ส่งออก สพส.1 (BLSC 1/)</td>
    <td class="dots" colspan="3">.....................................................................</td>
  </tr>
  <tr>
    <td class="label">ทะเบียนรถ (Truck No.)</td>
    <td class="dots">.........................</td>
    <td class="label" style="white-space:nowrap;">หมายเลขตู้ (Container No.)</td>
    <td class="dots">${result.container.name}</td>
    <td class="label" style="white-space:nowrap;">ส่งออกประเทศ (Export country)</td>
    <td class="dots" colspan="2">.........................</td>
    <td class="label" style="white-space:nowrap;">Invoice No.</td>
    <td class="dots">.........................</td>
  </tr>
  <tr>
    <td class="label">อุณหภูมิสินค้า (Product temperature)</td>
    <td class="dots">${isReefer ? '-18 °C or below' : '...........'}</td>
    <td class="label">Seal No. / DLD Seal No.</td>
    <td class="dots">.........................</td>
    <td class="label">Seal Agent No.</td>
    <td class="dots">.........................</td>
    <td class="label">Seal Company No.</td>
    <td class="dots" colspan="2">.........................</td>
  </tr>
  <tr>
    <td class="label">เลขที่ใบคำขอ สพส.1</td>
    <td class="dots" colspan="4">.....................................................................</td>
    <td class="label" colspan="2">เลขที่ใบคำขอ Checklist of Product Items in Container</td>
    <td class="dots" colspan="2">.....................................................................</td>
  </tr>
</table>

<div style="margin-bottom:12px;padding:8px 12px;background:#f5f2ec;border:1px solid #ccc;display:flex;gap:20px;flex-wrap:wrap;align-items:center;font-size:11px;">
  <span><strong>ตู้สินค้า / Container:</strong> ${result.container.name} ${isReefer ? '<span class="badge">REEFER</span>' : ''}</span>
  <span><strong>ขนาด / Dimensions:</strong> ${containerDimNote}</span>
  <span><strong>หน่วย / Unit:</strong> ${unitLabel}</span>
  <span><strong>การบรรจุ / Load mode:</strong> ${result.loadingMode === 'handload' ? 'Hand Load' : 'Pallet Load'}</span>
  <span><strong>Volume:</strong> ${volPct}%</span>
  <span><strong>Payload:</strong> ${wtPct}%</span>
  <span><strong>Total Cartons:</strong> ${totalCartons.toLocaleString()}</span>
</div>

${loadingSequenceHtml}

${weightDistHtml}

<div style="font-size:14px;font-weight:800;margin:0 0 8px;border-bottom:2px solid #1a1a1a;padding-bottom:6px;">
  ตารางการบรรจุสินค้า (Container Packing Grid — Position by Row × Column)
</div>

${productSections}

<div style="page-break-before:auto;">
  <div style="font-size:14px;font-weight:800;margin:24px 0 8px;border-bottom:2px solid #1a1a1a;padding-bottom:6px;">
    สรุปจำนวนบรรจุภัณฑ์ (Summary of Total Package)
  </div>
  <table class="summary-table">
    <thead>
      <tr>
        <th colspan="2" style="text-align:left;">ชื่อผลิตภัณฑ์ / Product Items</th>
        <th>บรรจุภัณฑ์<br/><span style="font-weight:400;">(Package)</span></th>
        <th>น้ำหนักรวม (กก.)<br/><span style="font-weight:400;">Gross Wt. (kg.)</span></th>
        <th>น้ำหนักสุทธิ (กก.)<br/><span style="font-weight:400;">Net Wt. (kg.)</span></th>
      </tr>
    </thead>
    <tbody>
      ${summaryRows}
      <tr class="totals-row">
        <td colspan="2" style="text-align:right;">รวมทั้งหมด / TOTAL QUANTITY</td>
        <td style="text-align:center;">${totalCartons.toLocaleString()}</td>
        <td style="text-align:right;">${totalGrossKg} KGS (${totalGrossMt} MTS)</td>
        <td style="text-align:right;">${totalNetKg} KGS (${totalNetMt} MTS)</td>
      </tr>
    </tbody>
  </table>
</div>

<p class="note">
  หมายเหตุ : ระบบคำนวณน้ำหนักบรรจุภัณฑ์จากค่าทศนิยมทั้งหมดโดยไม่ปัดขึ้นและไม่ตัดทิ้ง /
  Note: Weight is calculated using full decimal precision without rounding.
</p>

<div class="sig-row">
  <div class="sig-block">
    <div class="sig-line"></div>
    <div>ผู้ตรวจเช็ค</div>
    <div class="sig-title">พนักงานประกันคุณภาพ / พนักงานผลิต</div>
    <div class="sig-title">QA / Production Officer</div>
  </div>
  <div class="sig-block">
    <div class="sig-line"></div>
    <div>ผู้รับผิดชอบ</div>
    <div class="sig-title">ผู้จัดการโรงงาน / ผู้จัดการแผนกประกันคุณภาพ</div>
    <div class="sig-title">Factory Manager / QA Manager</div>
  </div>
  <div class="sig-block">
    <div class="sig-line"></div>
    <div>ผู้ควบคุม</div>
    <div class="sig-title">เจ้าหน้าที่ภาครัฐประจำโรงงาน</div>
    <div class="sig-title">Government Officer</div>
  </div>
</div>

<div style="text-align:right;font-size:10px;color:#999;margin-top:20px;">
  Rev. ${new Date().toLocaleDateString('en-GB', { month: 'short', year: 'numeric' }).replace(' ', '-')} &nbsp;|&nbsp; Generated by Smart Container
</div>

</body>
</html>`;

  const printWin = window.open('', '_blank', 'width=1000,height=800');
  if (!printWin) return;
  printWin.document.open();
  printWin.document.write(html);
  printWin.document.close();

  printWin.onload = () => {
    setTimeout(() => {
      printWin.focus();
      printWin.print();
    }, 800);
  };
}
