import { useState } from 'react';
import { PackingResult, PackingZoneData } from '../types';
import { PRODUCT_LABELS } from '../utils/colors';
import { RotateCcw, Printer, Download, FileText, Lightbulb, Info, Layers } from 'lucide-react';
import { getPracticalCount } from '../utils/loadPlanPDF';

import { exportResultsCSV, printLoadReport } from '../utils/exportUtils';
import { printLoadPlan } from '../utils/loadPlanPDF';

interface Props {
  result: PackingResult;
  productColors: string[];
  unit: string;
}

function formatWeight(kg: number): string {
  if (kg >= 1000) return `${(kg / 1000).toFixed(2)} t`;
  return `${kg.toFixed(0)} kg`;
}

function computeOptimizationTip(result: PackingResult): string | null {
  if (result.totalCount === 0) return null;
  const volPct = result.volumeUtilization * 100;
  if (volPct >= 90) return null;

  const c = result.container;
  const tips: string[] = [];

  for (const pr of result.productResults) {
    if (pr.count === 0) continue;
    const [bL, bW, bH] = pr.orientation;

    const wasteH = c.innerHeight - pr.nZ * bH;
    const wasteL = c.innerLength - pr.nX * bL;
    const wasteW = c.innerWidth - pr.nY * bW;

    if (wasteH >= bH * 0.5 && pr.nZ >= 1) {
      const newH = Math.floor(c.innerHeight / (pr.nZ + 1));
      if (newH > 0 && newH < bH) {
        const gained = pr.nX * pr.nY;
        tips.push(`Reduce ${pr.product.name} height to ${newH} cm to fit layer ${pr.nZ + 1}: +${gained} boxes`);
      }
    }

    if (wasteL >= bL * 0.5) {
      const newL = Math.floor(c.innerLength / (pr.nX + 1));
      if (newL > 0 && newL < bL) {
        const gained = pr.nY * pr.nZ;
        tips.push(`Reduce ${pr.product.name} length to ${newL} cm to fit row ${pr.nX + 1}: +${gained} boxes`);
      }
    }

    if (wasteW >= bW * 0.5) {
      const newW = Math.floor(c.innerWidth / (pr.nY + 1));
      if (newW > 0 && newW < bW) {
        const gained = pr.nX * pr.nZ;
        tips.push(`Reduce ${pr.product.name} width to ${newW} cm to fit column ${pr.nY + 1}: +${gained} boxes`);
      }
    }
  }

  if (tips.length === 0) {
    if (volPct < 60) return `Volume utilization is ${volPct.toFixed(1)}% — try a smaller container or ask the AI advisor for dimension recommendations.`;
    return null;
  }

  tips.sort((a, b) => {
    const numA = parseInt(a.match(/\+(\d+)/)?.[1] ?? '0');
    const numB = parseInt(b.match(/\+(\d+)/)?.[1] ?? '0');
    return numB - numA;
  });

  return tips[0];
}

function describeOrientation(zone: PackingZoneData, origL: number, origW: number, origH: number): string {
  const [bL, bW, bH] = zone.orientation;
  if (bH === origH) return 'Upright (natural)';
  if (bH === origL) return `On end — D (${origL} cm) vertical`;
  if (bH === origW) return `On side — W (${origW} cm) vertical`;
  return `Rotated — ${bH} cm vertical`;
}

function UtilBar({ value, color }: { value: number; color: string }) {
  const pct = Math.min(value * 100, 100);
  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: 'rgba(22,163,74,0.1)' }}>
        <div
          className="h-full rounded-full transition-all duration-700 ease-out"
          style={{ width: `${pct}%`, backgroundColor: color }}
        />
      </div>
      <span className="font-mono text-sm font-bold w-14 text-right" style={{ color }}>
        {pct.toFixed(1)}%
      </span>
    </div>
  );
}

const exportBtn = {
  display: 'flex',
  alignItems: 'center',
  gap: '6px',
  padding: '6px 12px',
  background: 'rgba(255,255,255,0.7)',
  border: '1px solid rgba(22,163,74,0.2)',
  borderRadius: 100,
  color: '#15803d',
  fontSize: 10,
  fontWeight: 600,
  letterSpacing: '0.06em',
  textTransform: 'uppercase' as const,
  cursor: 'pointer',
  transition: 'all 0.15s ease',
} as const;

export function ResultsPanel({ result, productColors, unit }: Props) {
  const [showVolTooltip, setShowVolTooltip] = useState(false);
  const { container, productResults, totalCount, volumeUtilization, weightUtilization, totalGrossWeight, totalNetWeight } = result;
  void getPracticalCount;

  if (productResults.length === 0) {
    return (
      <div className="flex items-center justify-center py-8">
        <p className="font-mono text-xs uppercase tracking-widest font-semibold" style={{ color: 'rgba(20,83,45,0.3)' }}>
          Enter product dimensions to see results
        </p>
      </div>
    );
  }

  const volPct = volumeUtilization * 100;
  const volColor = volPct > 90 ? '#16a34a' : volPct > 70 ? '#d97706' : '#0284c7';
  const wtPct = weightUtilization * 100;
  const wtColor = wtPct > 90 ? '#dc2626' : wtPct > 70 ? '#d97706' : '#0284c7';

  const optimizationTip = computeOptimizationTip(result);

  const ax = container.axleConfig;
  const cogX = result.centerOfGravityX ?? 0;

  let frontAxleLoad = 0;
  let rearAxleLoad = 0;
  if (ax && cogX > 0 && totalGrossWeight > 0) {
    const span = ax.rearAxleX - ax.frontAxleX;
    const distFromFront = cogX - ax.frontAxleX;
    rearAxleLoad = totalGrossWeight * (distFromFront / span);
    frontAxleLoad = totalGrossWeight - rearAxleLoad;
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <p className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'rgba(20,83,45,0.42)' }}>Results</p>
        <div className="flex items-center gap-1.5">
          <button style={exportBtn} onClick={() => exportResultsCSV(result, unit)}>
            <Download size={10} />
            CSV
          </button>
          <button style={exportBtn} onClick={() => printLoadReport(result, unit)}>
            <Printer size={10} />
            Print
          </button>
          {result.packedBoxes.length > 0 && (
            <button
              style={{ ...exportBtn, color: '#dc2626', borderColor: 'rgba(220,38,38,0.25)' }}
              onClick={() => printLoadPlan(result, unit)}
            >
              <FileText size={10} />
              Load Plan
            </button>
          )}
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-2.5">
        {[
          { label: 'Units that fit', value: totalCount.toLocaleString(), sub: 'total cartons', accent: true },
          { label: 'Net weight', value: formatWeight(totalNetWeight), sub: 'product only', accent: false },
          { label: 'Gross weight', value: formatWeight(totalGrossWeight), sub: 'incl. packaging', accent: false },
        ].map(({ label, value, sub, accent }) => (
          <div
            key={label}
            className="rounded-2xl p-3.5"
            style={{
              background: accent ? 'linear-gradient(135deg, #16a34a, #15803d)' : 'rgba(255,255,255,0.75)',
              border: accent ? 'none' : '1px solid rgba(22,163,74,0.15)',
              boxShadow: accent
                ? '0 4px 18px rgba(22,163,74,0.32)'
                : '0 2px 10px rgba(0,0,0,0.05)',
            }}
          >
            <p
              className="text-[9px] font-semibold uppercase tracking-wider mb-2"
              style={{ color: accent ? 'rgba(255,255,255,0.7)' : 'rgba(20,83,45,0.42)' }}
            >
              {label}
            </p>
            <div
              className="text-3xl font-black leading-none tracking-tight"
              style={{ color: accent ? '#fff' : '#14532d' }}
            >
              {value}
            </div>
            <div
              className="font-mono text-[9px] uppercase mt-1.5 font-medium"
              style={{ color: accent ? 'rgba(255,255,255,0.55)' : 'rgba(20,83,45,0.35)' }}
            >
              {sub}
            </div>
          </div>
        ))}
      </div>

      {/* Utilization */}
      <div className="rounded-2xl p-4 space-y-4" style={{ background: 'rgba(255,255,255,0.75)', border: '1px solid rgba(22,163,74,0.15)', boxShadow: '0 2px 10px rgba(0,0,0,0.05)' }}>
        <p className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'rgba(20,83,45,0.42)' }}>Utilization</p>
        <div className="space-y-4">
          <div>
            <div className="flex justify-between items-baseline mb-2">
              <div className="flex items-center gap-1.5 relative">
                <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'rgba(20,83,45,0.42)' }}>Volume</span>
                <button
                  className="transition-colors"
                  style={{ color: 'rgba(20,83,45,0.3)' }}
                  onMouseEnter={() => setShowVolTooltip(true)}
                  onMouseLeave={() => setShowVolTooltip(false)}
                >
                  <Info size={11} />
                </button>
                {showVolTooltip && (
                  <div className="absolute bottom-6 left-0 z-50 w-64 p-3 rounded-xl text-[10px] leading-relaxed shadow-xl"
                    style={{ background: 'rgba(20,40,30,0.96)', color: 'rgba(255,255,255,0.88)', border: '1px solid rgba(255,255,255,0.12)' }}
                  >
                    <strong className="text-white">% of usable cargo space</strong><br/>
                    Calculated against loadable volume (inner L × W × usable H, excluding reefer clearances).<br/><br/>
                    Real loading may vary ±5-10% depending on:<br/>
                    • Carrier vessel inner dimensions<br/>
                    • Loading technique and worker access<br/>
                    • Box compression under weight
                  </div>
                )}
              </div>
              <span className="font-mono text-[10px] font-medium" style={{ color: 'rgba(20,83,45,0.4)' }}>
                {(result.containerVolumeCm3 / 1_000_000).toFixed(2)} m³ usable
              </span>
            </div>
            <UtilBar value={volumeUtilization} color={volColor} />
          </div>
          <div>
            <div className="flex justify-between items-baseline mb-2">
              <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'rgba(20,83,45,0.42)' }}>Payload</span>
              <span className="font-mono text-[10px] font-medium" style={{ color: 'rgba(20,83,45,0.4)' }}>
                {container.maxPayload.toLocaleString()} kg max
              </span>
            </div>
            <UtilBar value={weightUtilization} color={wtColor} />
          </div>
        </div>
      </div>

      {/* Optimization tip */}
      {optimizationTip && (
        <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid rgba(217,119,6,0.25)', boxShadow: '0 2px 10px rgba(217,119,6,0.1)' }}>
          <div className="flex items-center gap-2 px-4 py-2.5" style={{ background: 'linear-gradient(135deg, #d97706, #b45309)' }}>
            <Lightbulb size={12} className="text-white shrink-0" />
            <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-white">Optimization Tip</span>
          </div>
          <div className="px-4 py-3 text-xs font-medium leading-relaxed" style={{ background: 'rgba(254,243,199,0.6)', color: '#92400e' }}>
            {optimizationTip}
          </div>
        </div>
      )}

      {/* Weight distribution */}
      {ax && cogX > 0 && (
        <div className="rounded-2xl p-4 space-y-3" style={{ background: 'rgba(255,255,255,0.75)', border: '1px solid rgba(22,163,74,0.15)', boxShadow: '0 2px 10px rgba(0,0,0,0.05)' }}>
          <p className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'rgba(20,83,45,0.42)' }}>Weight Distribution</p>
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: 'Front axle', load: frontAxleLoad, max: ax.maxFrontAxleKg },
              { label: 'Rear axle', load: rearAxleLoad, max: ax.maxRearAxleKg },
            ].map(({ label, load, max }) => {
              const over = load > max;
              const barColor = over ? '#dc2626' : '#0284c7';
              return (
                <div key={label}>
                  <div className="text-[9px] font-semibold uppercase tracking-wider mb-1" style={{ color: 'rgba(20,83,45,0.42)' }}>{label}</div>
                  <div className="font-mono text-lg font-bold" style={{ color: '#14532d' }}>{formatWeight(load)}</div>
                  <div className="mt-1.5 h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(22,163,74,0.1)' }}>
                    <div
                      className="h-full rounded-full transition-all"
                      style={{ width: `${Math.min((load / max) * 100, 100)}%`, backgroundColor: barColor }}
                    />
                  </div>
                  <div className="font-mono text-[9px] mt-0.5 flex items-center gap-1.5" style={{ color: 'rgba(20,83,45,0.35)' }}>
                    max {max.toLocaleString()} kg
                    {over && <span style={{ color: '#dc2626', fontWeight: 700 }}>OVERLOAD</span>}
                  </div>
                </div>
              );
            })}
          </div>
          <div className="font-mono text-[10px]" style={{ color: 'rgba(20,83,45,0.4)' }}>
            CoG at {Math.round(cogX)} cm from front ({Math.round((cogX / container.innerLength) * 100)}% of length)
          </div>
        </div>
      )}

      {/* Per-product breakdown */}
      <div className="space-y-2.5">
        <p className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'rgba(20,83,45,0.42)' }}>Per product</p>
        {productResults.map((pr, idx) => {
          const [bL, bW, bH] = pr.orientation;
          const isRotated = bL !== pr.product.length || bW !== pr.product.width || bH !== pr.product.height;
          const color = productColors[idx];
          const hasQty = pr.product.quantity && pr.product.quantity > 0;

          return (
            <div
              key={pr.product.id}
              className="rounded-2xl overflow-hidden"
              style={{ background: 'rgba(255,255,255,0.75)', border: '1px solid rgba(22,163,74,0.12)', boxShadow: '0 2px 10px rgba(0,0,0,0.05)' }}
            >
              {/* Product header — keep brand color */}
              <div
                className="flex items-center justify-between px-4 py-3"
                style={{ background: color }}
              >
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold uppercase tracking-tight text-white">{pr.product.name ?? PRODUCT_LABELS[idx]}</span>
                  {pr.product.fragile && (
                    <span className="px-1.5 py-0.5 rounded-full text-[9px] font-semibold uppercase" style={{ background: 'rgba(255,255,255,0.2)', color: '#fff' }}>Fragile</span>
                  )}
                  {pr.product.stackable === false && (
                    <span className="px-1.5 py-0.5 rounded-full text-[9px] font-semibold uppercase" style={{ background: 'rgba(255,255,255,0.2)', color: '#fff' }}>No stack</span>
                  )}
                </div>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-2xl font-black text-white leading-none">{pr.count.toLocaleString()}</span>
                  {hasQty && <span className="font-mono text-[10px] text-white/70">/{pr.product.quantity}</span>}
                  <span className="font-mono text-[10px] text-white/70 uppercase font-semibold">units</span>
                </div>
              </div>

              {/* Product body */}
              <div className="px-4 py-3 space-y-2.5">
                {pr.boxesPerPallet !== undefined && pr.palletCount !== undefined && (
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { label: 'pallets', val: pr.palletCount },
                      { label: 'per pallet', val: pr.boxesPerPallet },
                    ].map(({ label, val }) => (
                      <div key={label} className="rounded-xl p-2 text-center" style={{ background: 'rgba(217,119,6,0.07)', border: '1px solid rgba(217,119,6,0.18)' }}>
                        <div className="text-[9px] font-semibold uppercase tracking-wider mb-0.5" style={{ color: 'rgba(120,60,0,0.5)' }}>{label}</div>
                        <div className="font-mono text-lg font-bold" style={{ color: '#92400e' }}>{val}</div>
                      </div>
                    ))}
                  </div>
                )}

                <div className="grid grid-cols-3 gap-2">
                  {[
                    { label: pr.boxesPerPallet !== undefined ? 'per row' : 'rows', val: pr.nX },
                    { label: pr.boxesPerPallet !== undefined ? 'per col' : 'cols', val: pr.nY },
                    { label: 'layers', val: pr.nZ },
                  ].map(({ label, val }) => (
                    <div key={label} className="rounded-xl p-2 text-center" style={{ background: 'rgba(22,163,74,0.05)', border: '1px solid rgba(22,163,74,0.14)' }}>
                      <div className="text-[9px] font-semibold uppercase tracking-wider mb-0.5" style={{ color: 'rgba(20,83,45,0.42)' }}>{label}</div>
                      <div className="font-mono text-lg font-bold" style={{ color: '#14532d' }}>{val}</div>
                    </div>
                  ))}
                </div>

                <div className="flex items-center gap-2 font-mono text-[10px] font-medium" style={{ color: 'rgba(20,83,45,0.4)' }}>
                  <span>{bL} × {bW} × {bH} cm</span>
                  {isRotated && (
                    <span className="flex items-center gap-1" style={{ color: '#d97706' }}>
                      <RotateCcw size={10} />
                      rotated
                    </span>
                  )}
                </div>

                {pr.zones && pr.zones.length > 1 && (
                  <div className="pt-2.5 border-t" style={{ borderColor: 'rgba(22,163,74,0.1)' }}>
                    <div className="flex items-center gap-2 mb-2">
                      <Layers size={11} style={{ color: 'rgba(20,83,45,0.4)' }} />
                      <span className="font-mono text-[10px] font-semibold uppercase tracking-widest" style={{ color: 'rgba(20,83,45,0.5)' }}>
                        Loading Zones
                        {pr.zoneSplitAxis && (
                          <span className="ml-1.5 font-normal normal-case">— split by {pr.zoneSplitAxis}</span>
                        )}
                      </span>
                    </div>
                    <div className="space-y-1.5">
                      {pr.zones.map((zone, zi) => {
                        const [zL, zW, zH] = zone.orientation;
                        const desc = describeOrientation(zone, pr.product.length, pr.product.width, pr.product.height);
                        const isZoneRotated = zH !== pr.product.height;
                        return (
                          <div key={zi} className="rounded-xl px-3 py-2.5" style={{ background: 'rgba(22,163,74,0.04)', border: '1px solid rgba(22,163,74,0.12)' }}>
                            <div className="flex items-center justify-between mb-1">
                              <div className="flex items-center gap-2">
                                <div
                                  className="w-2.5 h-2.5 rounded-sm"
                                  style={{ backgroundColor: isZoneRotated ? `${color}99` : color }}
                                />
                                <span className="font-mono text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'rgba(20,83,45,0.55)' }}>
                                  Zone {zi + 1}
                                </span>
                              </div>
                              <span className="font-mono text-sm font-bold" style={{ color: '#14532d' }}>
                                {zone.count.toLocaleString()}
                              </span>
                            </div>
                            <div className="font-mono text-[10px] leading-relaxed" style={{ color: 'rgba(20,83,45,0.45)' }}>
                              <div>{zone.nX} rows × {zone.nY} cols × {zone.nZ} layers</div>
                              <div className="flex items-center gap-1.5 mt-0.5">
                                <span>{zL} × {zW} × {zH} cm</span>
                                {isZoneRotated && (
                                  <span className="flex items-center gap-1" style={{ color: '#d97706' }}>
                                    <RotateCcw size={9} />
                                    {desc}
                                  </span>
                                )}
                                {!isZoneRotated && <span>{desc}</span>}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
