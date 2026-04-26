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
      <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.08)' }}>
        <div
          className="h-full rounded-full transition-all duration-700 ease-out"
          style={{ width: `${pct}%`, backgroundColor: color }}
        />
      </div>
      <span className="font-mono text-sm font-semibold w-14 text-right" style={{ color }}>
        {pct.toFixed(1)}%
      </span>
    </div>
  );
}

const CARD: React.CSSProperties = {
  background: 'rgba(255,255,255,0.05)',
  border: '1px solid rgba(255,255,255,0.09)',
  borderRadius: 12,
};

const BTN_GHOST: React.CSSProperties = {
  background: 'rgba(255,255,255,0.07)',
  border: '1px solid rgba(255,255,255,0.10)',
  color: 'rgba(255,255,255,0.50)',
  borderRadius: 8,
};

export function ResultsPanel({ result, productColors, unit }: Props) {
  const [showVolTooltip, setShowVolTooltip] = useState(false);
  const { container, productResults, totalCount, volumeUtilization, weightUtilization, totalGrossWeight, totalNetWeight } = result;
  void getPracticalCount;

  if (productResults.length === 0) {
    return (
      <div className="flex items-center justify-center py-8">
        <p className="text-xs uppercase tracking-widest font-semibold" style={{ color: 'rgba(255,255,255,0.25)' }}>
          Enter product dimensions to see results
        </p>
      </div>
    );
  }

  const volPct = volumeUtilization * 100;
  const volColor = volPct > 90 ? '#EF4444' : volPct > 70 ? '#F59E0B' : '#3DB240';
  const wtPct = weightUtilization * 100;
  const wtColor = wtPct > 90 ? '#EF4444' : wtPct > 70 ? '#F59E0B' : '#3DB240';

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
        <p className="brut-section-label">Results</p>
        <div className="flex items-center gap-1.5">
          {[
            { label: 'CSV', icon: <Download size={10} />, onClick: () => exportResultsCSV(result, unit) },
            { label: 'Print', icon: <Printer size={10} />, onClick: () => printLoadReport(result, unit) },
          ].map(({ label, icon, onClick }) => (
            <button
              key={label}
              onClick={onClick}
              className="flex items-center gap-1.5 px-2.5 py-1.5 text-[10px] font-semibold uppercase tracking-wide transition-all rounded-lg"
              style={BTN_GHOST}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.12)'; e.currentTarget.style.color = 'white'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.07)'; e.currentTarget.style.color = 'rgba(255,255,255,0.50)'; }}
            >
              {icon}
              {label}
            </button>
          ))}
          {result.packedBoxes.length > 0 && (
            <button
              onClick={() => printLoadPlan(result, unit)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 text-[10px] font-semibold uppercase tracking-wide transition-all rounded-lg"
              style={{ background: 'rgba(61,178,64,0.12)', border: '1px solid rgba(61,178,64,0.25)', color: '#5DC258', borderRadius: 8 }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(61,178,64,0.20)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'rgba(61,178,64,0.12)'; }}
            >
              <FileText size={10} />
              Load Plan
            </button>
          )}
        </div>
      </div>

      {/* Top stat cards */}
      <div className="grid grid-cols-3 gap-2.5">
        <div className="p-4 rounded-xl" style={{ ...CARD, borderColor: 'rgba(61,178,64,0.20)', boxShadow: '0 4px 16px rgba(61,178,64,0.08)' }}>
          <p className="brut-section-label mb-2">Units that fit</p>
          <div className="text-3xl font-bold leading-none tracking-tight text-white">{totalCount.toLocaleString()}</div>
          <div className="font-mono text-[10px] uppercase mt-1.5 text-white/30">total cartons</div>
        </div>
        <div className="p-4 rounded-xl" style={CARD}>
          <p className="brut-section-label mb-2">Net weight</p>
          <div className="text-xl font-bold leading-none tracking-tight text-white">{formatWeight(totalNetWeight)}</div>
          <div className="font-mono text-[10px] uppercase mt-1.5 text-white/30">product only</div>
        </div>
        <div className="p-4 rounded-xl" style={CARD}>
          <p className="brut-section-label mb-2">Gross weight</p>
          <div className="text-xl font-bold leading-none tracking-tight text-white">{formatWeight(totalGrossWeight)}</div>
          <div className="font-mono text-[10px] uppercase mt-1.5 text-white/30">incl. packaging</div>
        </div>
      </div>

      {/* Utilization */}
      <div className="p-4 rounded-xl space-y-4" style={CARD}>
        <p className="brut-section-label">Utilization</p>
        <div className="space-y-4">
          <div>
            <div className="flex justify-between items-baseline mb-2">
              <div className="flex items-center gap-1.5 relative">
                <span className="brut-section-label">Volume</span>
                <button
                  style={{ color: 'rgba(255,255,255,0.25)' }}
                  onMouseEnter={() => setShowVolTooltip(true)}
                  onMouseLeave={() => setShowVolTooltip(false)}
                >
                  <Info size={11} />
                </button>
                {showVolTooltip && (
                  <div
                    className="absolute bottom-6 left-0 z-50 w-64 p-3 rounded-xl text-[10px] leading-relaxed"
                    style={{ background: '#0A1628', border: '1px solid rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.70)', boxShadow: '0 8px 32px rgba(0,0,0,0.40)' }}
                  >
                    <strong className="text-white">% of usable cargo space</strong><br/>
                    Calculated against loadable volume (inner length × width × usable height).<br/><br/>
                    Real loading may vary ±5-10% depending on carrier dimensions, technique, and box compression.
                  </div>
                )}
              </div>
              <span className="font-mono text-[10px] text-white/30">{(result.containerVolumeCm3 / 1_000_000).toFixed(2)} m³ usable</span>
            </div>
            <UtilBar value={volumeUtilization} color={volColor} />
          </div>
          <div>
            <div className="flex justify-between items-baseline mb-2">
              <span className="brut-section-label">Payload</span>
              <span className="font-mono text-[10px] text-white/30">{container.maxPayload.toLocaleString()} kg max</span>
            </div>
            <UtilBar value={weightUtilization} color={wtColor} />
          </div>
        </div>
      </div>

      {/* Optimization tip */}
      {optimizationTip && (
        <div className="rounded-xl overflow-hidden" style={{ border: '1px solid rgba(245,158,11,0.20)' }}>
          <div
            className="flex items-center gap-2 px-4 py-2.5"
            style={{ background: 'rgba(245,158,11,0.10)', borderBottom: '1px solid rgba(245,158,11,0.14)' }}
          >
            <Lightbulb size={12} style={{ color: '#F59E0B' }} className="shrink-0" />
            <span className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: '#F59E0B' }}>Optimization Tip</span>
          </div>
          <div className="px-4 py-3 text-xs font-medium leading-relaxed" style={{ background: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.55)' }}>
            {optimizationTip}
          </div>
        </div>
      )}

      {/* Axle loads */}
      {ax && cogX > 0 && (
        <div className="p-4 rounded-xl space-y-3" style={CARD}>
          <p className="brut-section-label">Weight Distribution</p>
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: 'Front axle', load: frontAxleLoad, max: ax.maxFrontAxleKg },
              { label: 'Rear axle', load: rearAxleLoad, max: ax.maxRearAxleKg },
            ].map(({ label, load, max }) => {
              const overload = load > max;
              return (
                <div key={label}>
                  <div className="brut-section-label mb-1.5">{label}</div>
                  <div className="font-mono text-lg font-bold text-white">{formatWeight(load)}</div>
                  <div className="mt-1.5 h-2 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.08)' }}>
                    <div
                      className="h-full rounded-full transition-all"
                      style={{ width: `${Math.min((load / max) * 100, 100)}%`, backgroundColor: overload ? '#EF4444' : '#3DB240' }}
                    />
                  </div>
                  <div className="font-mono text-[9px] mt-0.5 text-white/30">
                    max {max.toLocaleString()} kg
                    {overload && <span className="ml-2 font-semibold text-red-400">OVERLOAD</span>}
                  </div>
                </div>
              );
            })}
          </div>
          <div className="font-mono text-[10px] text-white/30">
            CoG at {Math.round(cogX)} cm from front ({Math.round((cogX / container.innerLength) * 100)}% of length)
          </div>
        </div>
      )}

      {/* Per product */}
      <div className="space-y-2.5">
        <p className="brut-section-label">Per product</p>
        {productResults.map((pr, idx) => {
          const [bL, bW, bH] = pr.orientation;
          const isRotated = bL !== pr.product.length || bW !== pr.product.width || bH !== pr.product.height;
          const color = productColors[idx];
          const hasQty = pr.product.quantity && pr.product.quantity > 0;

          return (
            <div
              key={pr.product.id}
              className="rounded-xl overflow-hidden"
              style={{ border: `1px solid ${color}30`, background: 'rgba(255,255,255,0.04)' }}
            >
              {/* Header */}
              <div
                className="flex items-center justify-between px-4 py-3"
                style={{ background: `${color}22`, borderBottom: `1px solid ${color}25` }}
              >
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: color }} />
                  <span className="text-sm font-semibold text-white leading-none">{pr.product.name ?? PRODUCT_LABELS[idx]}</span>
                  {pr.product.fragile && (
                    <span className="px-1.5 py-0.5 rounded text-[9px] font-semibold uppercase" style={{ background: 'rgba(255,255,255,0.10)', color: 'rgba(255,255,255,0.60)' }}>Fragile</span>
                  )}
                  {pr.product.stackable === false && (
                    <span className="px-1.5 py-0.5 rounded text-[9px] font-semibold uppercase" style={{ background: 'rgba(255,255,255,0.10)', color: 'rgba(255,255,255,0.60)' }}>No stack</span>
                  )}
                </div>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-2xl font-bold text-white leading-none" style={{ color }}>{pr.count.toLocaleString()}</span>
                  {hasQty && <span className="font-mono text-[10px] text-white/40">/{pr.product.quantity}</span>}
                  <span className="font-mono text-[10px] text-white/40 uppercase">units</span>
                </div>
              </div>

              {/* Body */}
              <div className="px-4 py-3">
                {pr.boxesPerPallet !== undefined && pr.palletCount !== undefined && (
                  <div className="grid grid-cols-2 gap-2 mb-3">
                    {[
                      { label: 'pallets', val: pr.palletCount },
                      { label: 'per pallet', val: pr.boxesPerPallet },
                    ].map(({ label, val }) => (
                      <div
                        key={label}
                        className="p-2.5 rounded-lg text-center"
                        style={{ background: `${color}12`, border: `1px solid ${color}20` }}
                      >
                        <div className="brut-section-label mb-0.5">{label}</div>
                        <div className="font-mono text-lg font-bold text-white">{val}</div>
                      </div>
                    ))}
                  </div>
                )}

                <div className="grid grid-cols-3 gap-2 mb-3">
                  {[
                    { label: pr.boxesPerPallet !== undefined ? 'per row' : 'rows', val: pr.nX },
                    { label: pr.boxesPerPallet !== undefined ? 'per col' : 'cols', val: pr.nY },
                    { label: 'layers', val: pr.nZ },
                  ].map(({ label, val }) => (
                    <div
                      key={label}
                      className="p-2.5 rounded-lg text-center"
                      style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}
                    >
                      <div className="brut-section-label mb-0.5">{label}</div>
                      <div className="font-mono text-lg font-bold text-white">{val}</div>
                    </div>
                  ))}
                </div>

                <div className="flex items-center gap-2 font-mono text-xs text-white/35">
                  <span>{bL} × {bW} × {bH} cm</span>
                  {isRotated && (
                    <span className="flex items-center gap-1 text-amber-400">
                      <RotateCcw size={10} />
                      rotated
                    </span>
                  )}
                </div>

                {pr.zones && pr.zones.length > 1 && (
                  <div className="mt-3 pt-3" style={{ borderTop: '1px solid rgba(255,255,255,0.07)' }}>
                    <div className="flex items-center gap-2 mb-2">
                      <Layers size={11} className="text-white/35" />
                      <span className="brut-section-label">
                        Loading Zones
                        {pr.zoneSplitAxis && (
                          <span className="ml-1.5 font-normal normal-case text-white/30"> — split by {pr.zoneSplitAxis}</span>
                        )}
                      </span>
                    </div>
                    <div className="space-y-1.5">
                      {pr.zones.map((zone, zi) => {
                        const [zL, zW, zH] = zone.orientation;
                        const desc = describeOrientation(zone, pr.product.length, pr.product.width, pr.product.height);
                        const isZoneRotated = zH !== pr.product.height;
                        return (
                          <div
                            key={zi}
                            className="px-3 py-2 rounded-lg"
                            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}
                          >
                            <div className="flex items-center justify-between mb-1">
                              <div className="flex items-center gap-2">
                                <div
                                  className="w-2.5 h-2.5 rounded-sm"
                                  style={{ backgroundColor: isZoneRotated ? `${color}70` : color }}
                                />
                                <span className="brut-section-label">Zone {zi + 1}</span>
                              </div>
                              <span className="font-mono text-sm font-bold text-white">{zone.count.toLocaleString()}</span>
                            </div>
                            <div className="font-mono text-[10px] text-white/35 leading-relaxed">
                              <div>{zone.nX} rows × {zone.nY} cols × {zone.nZ} layers</div>
                              <div className="flex items-center gap-1.5 mt-0.5">
                                <span>{zL} × {zW} × {zH} cm</span>
                                {isZoneRotated && (
                                  <span className="flex items-center gap-1 text-amber-400">
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
