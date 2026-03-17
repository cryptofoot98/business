import { useEffect, useRef, useCallback, useState } from 'react';
import { PackingResult, PackedPallet } from '../../types';
import { getReeferClearances } from '../../utils/packing';

const CM_TO_UNIT: Record<string, number> = {
  cm: 1,
  mm: 10,
  in: 0.393701,
};

interface Props {
  result: PackingResult;
  productColors: string[];
  unit: string;
}

type ViewMode = 'front' | 'side' | 'top';

const PAD = 28;
const PAD_BOTTOM = 44;
const BG = '#ede8df';
const CONTAINER_BG = '#f7f4ef';
const BLACK = '#0d0d0d';
const WALL_STROKE = 4;
const GAP = 1.5;

function hexToRgb(hex: string): [number, number, number] {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return [r, g, b];
}

function darken(r: number, g: number, b: number, amt = 0.25): [number, number, number] {
  return [Math.round(r * (1 - amt)), Math.round(g * (1 - amt)), Math.round(b * (1 - amt))];
}

function drawHatch(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number,
  color: string, spacing = 8,
) {
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();
  ctx.strokeStyle = color;
  ctx.lineWidth = 1;
  for (let i = -h; i < w + h; i += spacing) {
    ctx.beginPath();
    ctx.moveTo(x + i, y);
    ctx.lineTo(x + i + h, y + h);
    ctx.stroke();
  }
  ctx.restore();
}

function drawContainer(ctx: CanvasRenderingContext2D, cx: number, cy: number, cw: number, ch: number) {
  ctx.fillStyle = CONTAINER_BG;
  ctx.fillRect(cx, cy, cw, ch);

  const ribCount = Math.max(6, Math.floor(cw / 50));
  ctx.strokeStyle = 'rgba(13,13,13,0.06)';
  ctx.lineWidth = 1;
  for (let i = 1; i < ribCount; i++) {
    const rx = cx + (cw / ribCount) * i;
    ctx.beginPath();
    ctx.moveTo(rx, cy);
    ctx.lineTo(rx, cy + ch);
    ctx.stroke();
  }

  ctx.strokeStyle = BLACK;
  ctx.lineWidth = WALL_STROKE;
  ctx.lineJoin = 'miter';
  ctx.strokeRect(cx - WALL_STROKE / 2, cy - WALL_STROKE / 2, cw + WALL_STROKE, ch + WALL_STROKE);

  const cs = 8;
  ctx.fillStyle = BLACK;
  const corners = [
    [cx - WALL_STROKE, cy - WALL_STROKE],
    [cx + cw - cs + WALL_STROKE, cy - WALL_STROKE],
    [cx - WALL_STROKE, cy + ch - cs + WALL_STROKE],
    [cx + cw - cs + WALL_STROKE, cy + ch - cs + WALL_STROKE],
  ];
  for (const [corx, cory] of corners) ctx.fillRect(corx, cory, cs + WALL_STROKE, cs + WALL_STROKE);
}

function drawDoors(ctx: CanvasRenderingContext2D, cx: number, cy: number, cw: number, ch: number) {
  const doorX = cx + cw + WALL_STROKE / 2 + 2;
  const midY = cy + ch / 2;

  ctx.strokeStyle = BLACK;
  ctx.lineWidth = 2;
  ctx.setLineDash([5, 4]);

  ctx.beginPath();
  ctx.moveTo(doorX, cy);
  ctx.lineTo(doorX + 14, cy);
  ctx.lineTo(doorX + 14, midY - 3);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(doorX, cy + ch);
  ctx.lineTo(doorX + 14, cy + ch);
  ctx.lineTo(doorX + 14, midY + 3);
  ctx.stroke();

  ctx.setLineDash([]);
  ctx.strokeStyle = BLACK;
  ctx.lineWidth = 1.5;
  [0.15, 0.50, 0.85].forEach(t => {
    ctx.beginPath();
    ctx.arc(doorX + 3, cy + ch * t, 3, 0, Math.PI * 2);
    ctx.stroke();
  });
  ctx.fillStyle = BLACK;
  ctx.beginPath();
  ctx.arc(doorX + 11, midY, 3, 0, Math.PI * 2);
  ctx.fill();
}

function drawReeferZones(
  ctx: CanvasRenderingContext2D,
  cx: number, cy: number, cw: number, ch: number,
  scale: number, floorClear: number, topClear: number,
  evaporatorDepth = 0,
  showEvaporatorZone = false,
  showFrontTopFill = false,
) {
  if (floorClear > 0) {
    const fh = floorClear * scale;
    const fy = cy + ch - fh;
    ctx.fillStyle = 'rgba(13,13,13,0.06)';
    ctx.fillRect(cx, fy, cw, fh);
    drawHatch(ctx, cx, fy, cw, fh, 'rgba(13,13,13,0.10)', 7);
    ctx.fillStyle = BLACK;
    ctx.font = 'bold 9px "Courier New", monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('T-FLOOR AIR CHANNEL', cx + cw / 2, fy + fh / 2);
    ctx.textAlign = 'left';
  }

  if (topClear > 0 && showFrontTopFill) {
    const th = topClear * scale;
    ctx.fillStyle = 'rgba(198,51,32,0.06)';
    ctx.fillRect(cx, cy, cw, th);
    drawHatch(ctx, cx, cy, cw, th, 'rgba(198,51,32,0.10)', 7);
  }

  if (topClear > 0 && showEvaporatorZone && evaporatorDepth > 0) {
    const evaW = evaporatorDepth * scale;
    const th = topClear * scale;
    ctx.fillStyle = 'rgba(198,51,32,0.07)';
    ctx.fillRect(cx, cy, evaW, th);
    drawHatch(ctx, cx, cy, evaW, th, 'rgba(198,51,32,0.12)', 7);
    const lineY = cy + th;
    ctx.strokeStyle = '#c63320';
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 4]);
    ctx.beginPath();
    ctx.moveTo(cx, lineY);
    ctx.lineTo(cx + evaW, lineY);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.strokeStyle = 'rgba(198,51,32,0.35)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(cx + evaW, cy);
    ctx.lineTo(cx + evaW, cy + ch);
    ctx.stroke();
    ctx.font = 'bold 9px "Courier New", monospace';
    ctx.fillStyle = '#c63320';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'bottom';
    ctx.fillText('MAX LOAD', cx + 4, lineY - 2);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = 'rgba(198,51,32,0.45)';
    ctx.font = 'bold 8px "Courier New", monospace';
    ctx.fillText('REEFER UNIT', cx + evaW / 2, cy + th + (ch - th) / 2);
    ctx.textAlign = 'left';
  }
}

function drawReeferTopLineOverlay(
  ctx: CanvasRenderingContext2D,
  cx: number, cy: number, cw: number,
  scale: number, topClear: number,
) {
  if (topClear <= 0) return;
  const th = topClear * scale;
  const lineY = cy + th;
  ctx.strokeStyle = '#c63320';
  ctx.lineWidth = 2.5;
  ctx.setLineDash([6, 4]);
  ctx.beginPath();
  ctx.moveTo(cx, lineY);
  ctx.lineTo(cx + cw, lineY);
  ctx.stroke();
  ctx.setLineDash([]);

  const labelW = 98;
  const labelH = 16;
  ctx.fillStyle = '#c63320';
  ctx.fillRect(cx + 4, lineY - labelH - 1, labelW, labelH);
  ctx.font = 'bold 9px "Courier New", monospace';
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText('MAX LOAD LINE', cx + 8, lineY - labelH / 2 - 1);
  ctx.textAlign = 'left';
}

function drawCenterOfGravity(
  ctx: CanvasRenderingContext2D,
  cx: number, cy: number, scale: number,
  containerA: number, containerB: number,
  cogA: number, cogB: number,
  axisA: 'x' | 'length', axisB: 'z' | 'height',
) {
  const px = cx + cogA * scale;
  const py = cy + (containerB - cogB) * scale;

  ctx.save();
  ctx.strokeStyle = '#c63320';
  ctx.lineWidth = 1.5;
  ctx.setLineDash([4, 3]);

  ctx.beginPath();
  ctx.moveTo(px, cy);
  ctx.lineTo(px, cy + containerB * scale);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(cx, py);
  ctx.lineTo(cx + containerA * scale, py);
  ctx.stroke();

  ctx.setLineDash([]);
  ctx.fillStyle = '#c63320';
  ctx.beginPath();
  ctx.arc(px, py, 5, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = '#fff';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(px, py, 5, 0, Math.PI * 2);
  ctx.stroke();

  ctx.font = 'bold 9px "Courier New", monospace';
  ctx.fillStyle = '#c63320';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'bottom';
  ctx.fillText('CoG', px + 7, py - 3);

  ctx.restore();
}

function drawBoxesFront(
  ctx: CanvasRenderingContext2D,
  cx: number, cy: number,
  scale: number,
  containerL: number, containerH: number,
  boxes: { x: number; y: number; z: number; l: number; w: number; h: number; productId: string }[],
  colorMap: Record<string, [number, number, number]>,
  depthLimit: number,
  topClear = 0,
) {
  const filtered = boxes.filter(b => b.y < depthLimit);
  const sorted = [...filtered].sort((a, b) => a.x - b.x);
  const maxZ = containerH - topClear; // hard clip at red line

  for (const box of sorted) {
    const depthT = Math.min(1, box.x / Math.max(containerL, 1));
    const alpha = 0.22 + 0.68 * depthT;

    const bx = cx + box.y * scale + GAP / 2;
    const bw = box.w * scale - GAP;

    // Clip box top at the MAX LOAD LINE
    const clippedTop = Math.min(box.z + box.h, maxZ);
    const clippedH = clippedTop - box.z;
    if (clippedH <= 0) continue;

    const bh = clippedH * scale - GAP;
    const by = cy + (containerH - box.z - clippedH) * scale + GAP / 2;

    if (bw < 1 || bh < 1) continue;

    const [r, g, b] = colorMap[box.productId] ?? [198, 51, 32];
    ctx.fillStyle = `rgba(${r},${g},${b},${alpha})`;
    ctx.fillRect(bx, by, bw, bh);
    const [dr, dg, db] = darken(r, g, b, 0.3);
    ctx.strokeStyle = `rgba(${dr},${dg},${db},${Math.min(1, alpha + 0.1)})`;
    ctx.lineWidth = 0.75;
    ctx.strokeRect(bx, by, bw, bh);
  }
}

function drawBoxesSide(
  ctx: CanvasRenderingContext2D,
  cx: number, cy: number,
  scale: number,
  containerW: number, containerH: number,
  boxes: { x: number; y: number; z: number; l: number; w: number; h: number; productId: string }[],
  colorMap: Record<string, [number, number, number]>,
  depthLimit: number,
  topClear = 0,
) {
  const filtered = boxes.filter(b => b.y < depthLimit);
  const sorted = [...filtered].sort((a, b) => a.y - b.y);
  const maxZ = containerH - topClear; // hard clip at red line

  for (const box of sorted) {
    const depthT = Math.min(1, box.y / Math.max(containerW, 1));
    const alpha = 0.22 + 0.68 * depthT;

    const bx = cx + box.x * scale + GAP / 2;
    const bw = box.l * scale - GAP;

    // Clip box top at the MAX LOAD LINE
    const clippedTop = Math.min(box.z + box.h, maxZ);
    const clippedH = clippedTop - box.z;
    if (clippedH <= 0) continue;

    const bh = clippedH * scale - GAP;
    const by = cy + (containerH - box.z - clippedH) * scale + GAP / 2;

    if (bw < 1 || bh < 1) continue;

    const [r, g, b] = colorMap[box.productId] ?? [198, 51, 32];
    ctx.fillStyle = `rgba(${r},${g},${b},${alpha})`;
    ctx.fillRect(bx, by, bw, bh);
    const [dr, dg, db] = darken(r, g, b, 0.3);
    ctx.strokeStyle = `rgba(${dr},${dg},${db},${Math.min(1, alpha + 0.1)})`;
    ctx.lineWidth = 0.75;
    ctx.strokeRect(bx, by, bw, bh);
  }
}

function drawPalletsTop(
  ctx: CanvasRenderingContext2D,
  cx: number, cy: number, scale: number,
  pallets: PackedPallet[],
) {
  for (const pal of pallets) {
    const px = cx + pal.x * scale;
    const py = cy + pal.y * scale;
    const pw = pal.palletL * scale;
    const ph = pal.palletW * scale;
    ctx.fillStyle = 'rgba(205,160,70,0.15)';
    ctx.fillRect(px, py, pw, ph);
    ctx.strokeStyle = 'rgba(160,100,20,0.55)';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([4, 3]);
    ctx.strokeRect(px + 1, py + 1, pw - 2, ph - 2);
    ctx.setLineDash([]);
  }
}

function drawPalletsFront(
  ctx: CanvasRenderingContext2D,
  cx: number, cy: number, _cw: number, _ch: number,
  scale: number, containerH: number, deckH: number,
  pallets: PackedPallet[],
) {
  for (const pal of pallets) {
    const px = cx + pal.y * scale;
    const pw = pal.palletW * scale - 1;
    const deckPx = deckH * scale;
    const palY = cy + (containerH - deckH) * scale;
    ctx.fillStyle = 'rgba(160,100,20,0.20)';
    ctx.fillRect(px, palY, pw, deckPx);
    ctx.strokeStyle = 'rgba(160,100,20,0.50)';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(px, palY, pw, deckPx);
    const blockW = Math.max(4, pw / 5);
    ctx.fillStyle = 'rgba(120,70,10,0.25)';
    for (let b = 0; b < 3; b++) {
      const bx = px + (pw / 4) * (b + 0.5) - blockW / 2;
      ctx.fillRect(bx, palY + deckPx * 0.3, blockW, deckPx * 0.7);
    }
  }
}

function drawBoxesTop(
  ctx: CanvasRenderingContext2D,
  cx: number, cy: number, scale: number,
  containerH: number,
  boxes: { x: number; y: number; z: number; l: number; w: number; h: number; productId: string }[],
  colorMap: Record<string, [number, number, number]>,
  depthLimit: number,
) {
  const filtered = boxes.filter(b => b.z < depthLimit);
  const sorted = [...filtered].sort((a, b) => a.z - b.z);

  for (const box of sorted) {
    const heightT = Math.min(1, (box.z + box.h / 2) / Math.max(containerH, 1));
    const alpha = 0.22 + 0.68 * heightT;

    const bx = cx + box.x * scale + GAP / 2;
    const by = cy + box.y * scale + GAP / 2;
    const bw = box.l * scale - GAP;
    const bh = box.w * scale - GAP;

    if (bw < 1 || bh < 1) continue;

    const [r, g, b] = colorMap[box.productId] ?? [198, 51, 32];
    ctx.fillStyle = `rgba(${r},${g},${b},${alpha})`;
    ctx.fillRect(bx, by, bw, bh);
    const [dr, dg, db] = darken(r, g, b, 0.3);
    ctx.strokeStyle = `rgba(${dr},${dg},${db},${Math.min(1, alpha + 0.1)})`;
    ctx.lineWidth = 0.75;
    ctx.strokeRect(bx, by, bw, bh);
  }
}

function drawDimLabel(
  ctx: CanvasRenderingContext2D,
  x1: number, y1: number, x2: number, y2: number,
  label: string, side: 'bottom' | 'left',
) {
  ctx.strokeStyle = 'rgba(13,13,13,0.30)';
  ctx.lineWidth = 1;
  ctx.setLineDash([3, 3]);
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
  ctx.setLineDash([]);

  const mx = (x1 + x2) / 2;
  const my = (y1 + y2) / 2;
  ctx.font = 'bold 9px "Courier New", monospace';
  ctx.fillStyle = 'rgba(13,13,13,0.55)';
  ctx.textBaseline = 'middle';
  if (side === 'bottom') {
    ctx.textAlign = 'center';
    ctx.fillText(label.toUpperCase(), mx, my + 14);
  } else {
    ctx.textAlign = 'right';
    ctx.fillText(label.toUpperCase(), mx - 6, my);
  }
  ctx.textAlign = 'left';
}

const VIEW_LABELS: Record<ViewMode, string> = {
  front: 'Front (W×H)',
  side: 'Side (L×H)',
  top: 'Top (L×W)',
};

const VIEW_LABELS_SHORT: Record<ViewMode, string> = {
  front: 'Front',
  side: 'Side',
  top: 'Top',
};

export function ContainerView2D({ result, productColors, unit }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);
  const dirtyRef = useRef(true);
  const [viewMode, setViewMode] = useState<ViewMode>('front');
  const [layerDepth, setLayerDepth] = useState(100);

  const colorMap = useRef<Record<string, [number, number, number]>>({});
  colorMap.current = {};
  result.productResults.forEach((pr, i) => {
    colorMap.current[pr.product.id] = hexToRgb(productColors[i] ?? '#c63320');
  });

  const render = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const W = canvas.width;
    const H = canvas.height;

    ctx.fillStyle = BG;
    ctx.fillRect(0, 0, W, H);

    const { innerLength: L, innerWidth: IW, innerHeight: IH } = result.container;
    const { floor: floorClear, top: topClearRaw, evaporatorDepth } = getReeferClearances(result.container);
    // Ensure red line is visually prominent — minimum 15cm visual gap for reefer containers
    const topClear = result.container.category === 'Reefer' ? Math.max(topClearRaw, 15) : topClearRaw;
    const isPallet = result.loadingMode === 'pallet';
    const pallets: PackedPallet[] = result.packedPallets ?? [];
    const mul = CM_TO_UNIT[unit] ?? 1;
    const fmt = (v: number) => mul === 1 ? `${Math.round(v)} ${unit}` : `${(v * mul).toFixed(1)} ${unit}`;
    const cogX = result.centerOfGravityX ?? 0;
    const cogY = result.centerOfGravityY ?? 0;
    const hasCog = result.packedBoxes.length > 0 && (cogX > 0 || cogY > 0);

    if (viewMode === 'front') {
      const availW = W - PAD * 2;
      const availH = H - PAD - PAD_BOTTOM;
      const scale = Math.min(availW / IW, availH / IH) * 0.93;

      const cw = IW * scale;
      const ch = IH * scale;
      const cx = (W - cw) / 2;
      const cy = (H - PAD_BOTTOM - ch) / 2 + 10;

      drawContainer(ctx, cx, cy, cw, ch);
      drawReeferZones(ctx, cx, cy, cw, ch, scale, floorClear, topClear, evaporatorDepth, false, true);
      if (isPallet && pallets.length > 0) drawPalletsFront(ctx, cx, cy, cw, ch, scale, IH, 14.4, pallets);
      const depthLimit = (layerDepth / 100) * IW;
      drawBoxesFront(ctx, cx, cy, scale, L, IH, result.packedBoxes, colorMap.current, depthLimit, topClear);
      if (hasCog) drawCenterOfGravity(ctx, cx, cy, scale, IW, IH, cogX > 0 ? IW / 2 : IW / 2, cogY, 'x', 'z');
      drawReeferTopLineOverlay(ctx, cx, cy, cw, scale, topClear);
      drawDoors(ctx, cx, cy, cw, ch);
      drawDimLabel(ctx, cx, cy + ch + 32, cx + cw, cy + ch + 32, fmt(IW), 'bottom');
      drawDimLabel(ctx, cx - 32, cy + ch, cx - 32, cy, fmt(IH), 'left');

    } else if (viewMode === 'side') {
      const availW = W - PAD * 2 - 20;
      const availH = H - PAD - PAD_BOTTOM;
      const scale = Math.min(availW / L, availH / IH) * 0.93;

      const cw = L * scale;
      const ch = IH * scale;
      const cx = (W - cw) / 2;
      const cy = (H - PAD_BOTTOM - ch) / 2 + 10;

      drawContainer(ctx, cx, cy, cw, ch);
      drawReeferZones(ctx, cx, cy, cw, ch, scale, floorClear, topClear, evaporatorDepth, true);
      const depthLimit = (layerDepth / 100) * IW;
      drawBoxesSide(ctx, cx, cy, scale, IW, IH, result.packedBoxes, colorMap.current, depthLimit, topClear);
      if (hasCog) drawCenterOfGravity(ctx, cx, cy, scale, L, IH, cogX, cogY, 'length', 'height');
      drawDoors(ctx, cx, cy, cw, ch);
      drawDimLabel(ctx, cx, cy + ch + 32, cx + cw, cy + ch + 32, fmt(L), 'bottom');
      drawDimLabel(ctx, cx - 32, cy + ch, cx - 32, cy, fmt(IH), 'left');

    } else {
      const availW = W - PAD * 2 - 20;
      const availH = H - PAD - PAD_BOTTOM;
      const scale = Math.min(availW / L, availH / IW) * 0.93;

      const cw = L * scale;
      const ch = IW * scale;
      const cx = (W - cw) / 2;
      const cy = (H - PAD_BOTTOM - ch) / 2 + 10;

      drawContainer(ctx, cx, cy, cw, ch);
      if (isPallet && pallets.length > 0) drawPalletsTop(ctx, cx, cy, scale, pallets);
      const depthLimit = (layerDepth / 100) * IH;
      drawBoxesTop(ctx, cx, cy, scale, IH, result.packedBoxes, colorMap.current, depthLimit);
      drawDoors(ctx, cx, cy, cw, ch);
      drawDimLabel(ctx, cx, cy + ch + 32, cx + cw, cy + ch + 32, fmt(L), 'bottom');
      drawDimLabel(ctx, cx - 32, cy + ch, cx - 32, cy, fmt(IW), 'left');
    }

    if (result.productResults.length > 0 && result.packedBoxes.length > 0) {
      let xOff = PAD;
      const labelY = H - PAD_BOTTOM + 16;
      const MAX_LEGEND = 6;

      for (let i = 0; i < Math.min(result.productResults.length, MAX_LEGEND); i++) {
        const pr = result.productResults[i];
        if (pr.count === 0) continue;
        const [r, g, b] = colorMap.current[pr.product.id] ?? [198, 51, 32];
        const label = `${pr.product.name}: ${pr.count.toLocaleString()} units`;

        ctx.font = 'bold 10px "Courier New", monospace';
        const tw = ctx.measureText(label).width;

        if (xOff + tw + 30 > W - PAD) break;

        ctx.fillStyle = `rgb(${r},${g},${b})`;
        ctx.fillRect(xOff, labelY - 10, tw + 18, 22);
        ctx.strokeStyle = BLACK;
        ctx.lineWidth = 1.5;
        ctx.strokeRect(xOff, labelY - 10, tw + 18, 22);
        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillText(label.toUpperCase(), xOff + 9, labelY + 1);
        xOff += tw + 30;
      }

      if (result.productResults.length > MAX_LEGEND) {
        ctx.font = 'bold 10px "Courier New", monospace';
        ctx.fillStyle = 'rgba(13,13,13,0.4)';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillText(`+${result.productResults.length - MAX_LEGEND} more`, xOff, labelY + 1);
      }
    }
  }, [result, productColors, viewMode, unit, layerDepth]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ro = new ResizeObserver(() => {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
      dirtyRef.current = true;
    });
    ro.observe(canvas);
    canvas.width = canvas.offsetWidth || 800;
    canvas.height = canvas.offsetHeight || 500;

    const loop = () => {
      if (dirtyRef.current) {
        dirtyRef.current = false;
        render();
      }
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);

    return () => {
      ro.disconnect();
      cancelAnimationFrame(rafRef.current);
    };
  }, [render]);

  useEffect(() => {
    dirtyRef.current = true;
  }, [result, productColors, viewMode, unit, layerDepth]);

  const isReefer = result.container.category === 'Reefer';
  const PRACTICAL_FILL = isReefer ? 0.913 : 1;
  const fillPct = Math.round(result.volumeUtilization * PRACTICAL_FILL * 100);
  const isPalletMode = result.loadingMode === 'pallet';
  const legend = result.productResults.filter(pr => pr.count > 0).slice(0, 6);

  return (
    <div className="w-full h-full relative bg-brut-bg">
      <canvas ref={canvasRef} className="w-full h-full block" />

      <div className="absolute top-2 sm:top-3 left-2 sm:left-3 flex items-center gap-1 sm:gap-1.5 flex-wrap max-w-[calc(100%-80px)]">
        {(['front', 'side', 'top'] as ViewMode[]).map(mode => (
          <button
            key={mode}
            onClick={() => setViewMode(mode)}
            className={`px-2 sm:px-2.5 py-1 sm:py-1.5 text-[9px] sm:text-[10px] font-black uppercase tracking-wider border-2 border-brut-black transition-all whitespace-nowrap ${
              viewMode === mode
                ? 'bg-brut-black text-white shadow-brut-red'
                : 'bg-white text-brut-black hover:bg-brut-bg shadow-brut-sm'
            }`}
          >
            <span className="hidden sm:inline">{VIEW_LABELS[mode]}</span>
            <span className="sm:hidden">{VIEW_LABELS_SHORT[mode]}</span>
          </button>
        ))}
      </div>

      <div className="absolute top-2 sm:top-3 right-2 sm:right-3 flex items-center gap-1 sm:gap-2">
        {isPalletMode && (
          <div className="hidden sm:flex items-center gap-1.5 px-3 py-2 border-2 border-brut-amber bg-white" style={{ boxShadow: '2px 2px 0px #df9a10' }}>
            <div className="w-2 h-2 bg-brut-amber" />
            <span className="font-mono text-[9px] font-black uppercase tracking-widest text-brut-amber">Pallet mode</span>
          </div>
        )}
        {isPalletMode && (
          <div className="sm:hidden flex items-center gap-1 px-2 py-1 border-2 border-brut-amber bg-white" style={{ boxShadow: '2px 2px 0px #df9a10' }}>
            <div className="w-1.5 h-1.5 bg-brut-amber" />
            <span className="font-mono text-[8px] font-black uppercase text-brut-amber">Pallet</span>
          </div>
        )}
        {isReefer && (
          <div className="hidden sm:flex items-center gap-1.5 px-3 py-2 border-2 border-brut-red bg-white" style={{ boxShadow: '2px 2px 0px #c63320' }}>
            <div className="w-2 h-2 bg-brut-red" />
            <span className="font-mono text-[9px] font-black uppercase tracking-widest text-brut-red">Reefer</span>
          </div>
        )}
        {isReefer && (
          <div className="sm:hidden flex items-center gap-1 px-2 py-1 border-2 border-brut-red bg-white" style={{ boxShadow: '2px 2px 0px #c63320' }}>
            <div className="w-1.5 h-1.5 bg-brut-red" />
            <span className="font-mono text-[8px] font-black uppercase text-brut-red">Reef</span>
          </div>
        )}
        <div
          className="px-2 sm:px-3 py-1 sm:py-2 border-2 border-brut-black bg-white"
          style={{ boxShadow: fillPct > 85 ? '3px 3px 0px #d96a1c' : '3px 3px 0px #0e5590' }}
        >
          <span className="hidden sm:inline font-mono text-[10px] font-black text-brut-black/40 uppercase mr-2">{result.container.shortName}</span>
          <span className={`font-mono text-sm font-black ${fillPct > 85 ? 'text-brut-orange' : 'text-brut-green'}`}>{fillPct}%</span>
          <span className="font-mono text-[10px] font-black text-brut-black/35 uppercase ml-1">filled</span>
        </div>
      </div>

      {result.packedBoxes.length > 0 && (
        <div className="absolute bottom-12 left-3 right-3 flex items-center gap-3">
          <span className="font-mono text-[9px] font-bold uppercase text-brut-black/40 whitespace-nowrap">Depth</span>
          <input
            type="range"
            min={5}
            max={100}
            value={layerDepth}
            onChange={e => setLayerDepth(Number(e.target.value))}
            className="flex-1 h-1 accent-brut-black cursor-pointer"
          />
          <span className="font-mono text-[9px] font-bold text-brut-black/40 w-8 text-right">{layerDepth}%</span>
        </div>
      )}

      {legend.length > 0 && (
        <div className="absolute bottom-3 right-3 flex flex-col gap-1 pointer-events-none">
          {legend.map((pr, i) => {
            const [bL, bW, bH] = pr.orientation;
            const mul = CM_TO_UNIT[unit] ?? 1;
            const fmtDim = (v: number) => mul === 1 ? `${Math.round(v)}` : `${(v * mul).toFixed(1)}`;
            return (
              <div
                key={pr.product.id}
                className="flex items-center gap-2 px-2 py-1.5 border-2 border-brut-black bg-white"
                style={{ boxShadow: `2px 2px 0px ${productColors[i]}` }}
              >
                <div className="w-2.5 h-2.5 shrink-0" style={{ backgroundColor: productColors[i] }} />
                <span className="font-mono text-[9px] font-black text-brut-black uppercase">{pr.product.name}</span>
                <span className="font-mono text-[8px] text-brut-black/40">{fmtDim(bL)}×{fmtDim(bW)}×{fmtDim(bH)} {unit}</span>
                <span className="font-mono text-[9px] font-black" style={{ color: productColors[i] }}>×{Math.floor(pr.count * PRACTICAL_FILL).toLocaleString()}</span>
              </div>
            );
          })}
          {result.productResults.filter(pr => pr.count > 0).length > 6 && (
            <span className="font-mono text-[9px] text-brut-black/35 text-right">+{result.productResults.filter(pr => pr.count > 0).length - 6} more</span>
          )}
        </div>
      )}

      {result.packedBoxes.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="text-center px-8 py-6 border-3 border-brut-black bg-white" style={{ boxShadow: '6px 6px 0px #0d0d0d' }}>
            <div className="w-12 h-12 bg-brut-black flex items-center justify-center mx-auto mb-4">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
              </svg>
            </div>
            <p className="font-mono text-xs font-black uppercase tracking-widest text-brut-black">Enter product dimensions</p>
            <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-brut-black/40 mt-1.5">{result.container.name}</p>
          </div>
        </div>
      )}
    </div>
  );
}
