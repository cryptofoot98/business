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

    return `
      <div style="margin-bottom:32px;page-break-inside:avoid;">
        <div style="background:#1a1a1a;color:#fff;padding:8px 12px;display:flex;justify-content:space-between;align-items:center;margin-bottom:0;">
          <span style="font-weight:800;font-size:13px;">${pr.product.name}</span>
          <span style="font-size:11px;opacity:.7;">${dimNote}</span>
        </div>
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
        <div style="margin-top:8px;padding:8px 12px;background:#f7f4ed;border:1px solid #ddd;font-size:11px;display:flex;gap:32px;">
          <span><strong>บรรจุภัณฑ์ / Packages:</strong> ${pr.count.toLocaleString()} cartons</span>
          <span><strong>น้ำหนักรวม / Gross Weight:</strong> ${grossTotal} KGS</span>
          <span><strong>น้ำหนักสุทธิ / Net Weight:</strong> ${netTotal} KGS</span>
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
  @media print {
    body { padding: 12px 16px; font-size: 11px; }
    .no-print { display: none; }
    h1 { font-size: 15px; }
    table, tr, td, th { page-break-inside: avoid; }
  }
</style>
</head>
<body>

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

<div style="margin-bottom:8px;display:flex;gap:16px;align-items:center;font-size:11px;">
  <span><strong>ตู้สินค้า / Container:</strong> ${result.container.name} ${isReefer ? '<span class="badge">REEFER</span>' : ''}</span>
  <span><strong>ขนาด / Dimensions:</strong> ${containerDimNote}</span>
  <span><strong>หน่วย / Unit:</strong> ${unitLabel}</span>
  <span><strong>การบรรจุ / Load mode:</strong> ${result.loadingMode === 'handload' ? 'Hand Load' : 'Pallet Load'}</span>
  <span><strong>Volume:</strong> ${volPct}%</span>
  <span><strong>Payload:</strong> ${wtPct}%</span>
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

  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `load-plan-${result.container.shortName.replace(/\s+/g, '-')}-${new Date().toISOString().slice(0, 10)}.html`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
