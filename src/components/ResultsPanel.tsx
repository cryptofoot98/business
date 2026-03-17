import { useState } from 'react';
import { PackingResult } from '../types';
import { PRODUCT_LABELS } from '../utils/colors';
import { RotateCcw, Printer, Download, FileText, Lightbulb, Info } from 'lucide-react';
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

function UtilBar({ value, color }: { value: number; color: string }) {
  const pct = Math.min(value * 100, 100);
  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 h-3 bg-brut-bg border-2 border-brut-black overflow-hidden">
        <div
          className="h-full transition-all duration-700 ease-out"
          style={{ width: `${pct}%`, backgroundColor: color }}
        />
      </div>
      <span className="font-mono text-sm font-black w-14 text-right" style={{ color }}>
        {pct.toFixed(1)}%
      </span>
    </div>
  );
}

export function ResultsPanel({ result, productColors, unit }: Props) {
  const [showVolTooltip, setShowVolTooltip] = useState(false);
  const { container, productResults, volumeUtilization, weightUtilization, totalGrossWeight, totalNetWeight } = result;
  const isReefer = container.category === 'Reefer';
  const practicalCount = getPracticalCount(result);
  const totalCount = practicalCount;

  if (productResults.length === 0) {
    return (
      <div className="flex items-center justify-center py-8">
        <p className="font-mono text-xs uppercase tracking-widest text-brut-black/30 font-bold">
          Enter product dimensions to see results
        </p>
      </div>
    );
  }

  const volPct = volumeUtilization * 100;
  const volColor = volPct > 90 ? '#c63320' : volPct > 70 ? '#d96a1c' : '#1572b6';
  const wtPct = weightUtilization * 100;
  const wtColor = wtPct > 90 ? '#c63320' : wtPct > 70 ? '#d96a1c' : '#1572b6';

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
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <p className="text-xs font-black uppercase tracking-tight text-brut-black">Results</p>
        <div className="flex items-center gap-2">
          <button
            onClick={() => exportResultsCSV(result, unit)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 border-2 border-brut-black bg-white hover:bg-brut-bg text-[10px] font-black uppercase tracking-wider shadow-brut-sm hover:shadow-brut transition-all"
          >
            <Download size={10} />
            CSV
          </button>
          <button
            onClick={() => printLoadReport(result, unit)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 border-2 border-brut-black bg-white hover:bg-brut-bg text-[10px] font-black uppercase tracking-wider shadow-brut-sm hover:shadow-brut transition-all"
          >
            <Printer size={10} />
            Print
          </button>
          {result.packedBoxes.length > 0 && (
            <button
              onClick={() => printLoadPlan(result, unit)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 border-2 border-brut-red bg-white hover:bg-brut-red hover:text-white text-brut-red text-[10px] font-black uppercase tracking-wider shadow-brut-sm hover:shadow-none transition-all"
            >
              <FileText size={10} />
              Load Plan
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="brut-card p-4" style={{ boxShadow: '4px 4px 0px #c63320' }}>
          <p className="brut-section-label mb-2">Units that fit</p>
          <div className="text-4xl font-black text-brut-black leading-none tracking-tighter">{totalCount.toLocaleString()}</div>
          <div className="font-mono text-[10px] uppercase text-brut-black/35 mt-1.5 font-bold tracking-wider">total cartons</div>
        </div>

        <div className="brut-card p-4">
          <p className="brut-section-label mb-2">Net weight</p>
          <div className="text-3xl font-black text-brut-black leading-none tracking-tighter">{formatWeight(totalNetWeight)}</div>
          <div className="font-mono text-[10px] uppercase text-brut-black/35 mt-1.5 font-bold tracking-wider">product only</div>
        </div>

        <div className="brut-card p-4">
          <p className="brut-section-label mb-2">Gross weight</p>
          <div className="text-3xl font-black text-brut-black leading-none tracking-tighter">{formatWeight(totalGrossWeight)}</div>
          <div className="font-mono text-[10px] uppercase text-brut-black/35 mt-1.5 font-bold tracking-wider">incl. packaging</div>
        </div>
      </div>

      <div className="brut-card p-4 space-y-4">
        <p className="text-xs font-black uppercase tracking-tight text-brut-black">Utilization</p>
        <div className="space-y-3">
          <div>
            <div className="flex justify-between items-baseline mb-2">
              <div className="flex items-center gap-1.5 relative">
                <span className="brut-section-label">Volume</span>
                <button
                  className="text-brut-black/30 hover:text-brut-black transition-colors"
                  onMouseEnter={() => setShowVolTooltip(true)}
                  onMouseLeave={() => setShowVolTooltip(false)}
                >
                  <Info size={11} />
                </button>
                {showVolTooltip && (
                  <div className="absolute bottom-6 left-0 z-50 w-64 p-3 bg-brut-black text-white text-[10px] leading-relaxed border-2 border-brut-black shadow-lg">
                    <strong>Why can't utilization reach 100%?</strong><br/>
                    A practical fill rate of 91.3% is applied to account for:<br/>
                    • Airflow gaps required in reefer containers<br/>
                    • Loading tolerances and worker access<br/>
                    • Structural stability between stacks<br/>
                    • Small voids at container edges<br/>
                    This reflects what is physically achievable in real loading conditions.
                  </div>
                )}
              </div>
              <span className="font-mono text-[10px] font-bold text-brut-black/40">{(result.containerVolumeCm3 / 1_000_000).toFixed(2)} m³ capacity</span>
            </div>
            <UtilBar value={isReefer ? volumeUtilization * 0.913 : volumeUtilization} color={volColor} />
          </div>
          <div>
            <div className="flex justify-between items-baseline mb-2">
              <span className="brut-section-label">Payload</span>
              <span className="font-mono text-[10px] font-bold text-brut-black/40">{container.maxPayload.toLocaleString()} kg max</span>
            </div>
            <UtilBar value={weightUtilization} color={wtColor} />
          </div>
        </div>
      </div>

      {optimizationTip && (
        <div className="border-2 border-brut-black bg-white overflow-hidden" style={{ boxShadow: '3px 3px 0px #d96a1c' }}>
          <div className="flex items-center gap-2 px-4 py-2 border-b-2 border-brut-black" style={{ backgroundColor: '#d96a1c' }}>
            <Lightbulb size={12} className="text-white shrink-0" />
            <span className="font-mono text-[10px] font-black uppercase tracking-widest text-white">Optimization Tip</span>
          </div>
          <div className="px-4 py-3 text-xs font-medium text-brut-black leading-relaxed">
            {optimizationTip}
          </div>
        </div>
      )}

      {ax && cogX > 0 && (
        <div className="brut-card p-4 space-y-3">
          <p className="text-xs font-black uppercase tracking-tight text-brut-black">Weight Distribution</p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="brut-section-label mb-1.5">Front axle</div>
              <div className="font-mono text-lg font-black text-brut-black">{formatWeight(frontAxleLoad)}</div>
              <div className="mt-1.5 h-2 bg-brut-bg border border-brut-black/20 overflow-hidden">
                <div
                  className="h-full transition-all"
                  style={{
                    width: `${Math.min((frontAxleLoad / ax.maxFrontAxleKg) * 100, 100)}%`,
                    backgroundColor: frontAxleLoad > ax.maxFrontAxleKg ? '#c63320' : '#1572b6',
                  }}
                />
              </div>
              <div className="font-mono text-[9px] text-brut-black/35 mt-0.5">
                max {ax.maxFrontAxleKg.toLocaleString()} kg
                {frontAxleLoad > ax.maxFrontAxleKg && <span className="text-brut-red ml-2">OVERLOAD</span>}
              </div>
            </div>
            <div>
              <div className="brut-section-label mb-1.5">Rear axle</div>
              <div className="font-mono text-lg font-black text-brut-black">{formatWeight(rearAxleLoad)}</div>
              <div className="mt-1.5 h-2 bg-brut-bg border border-brut-black/20 overflow-hidden">
                <div
                  className="h-full transition-all"
                  style={{
                    width: `${Math.min((rearAxleLoad / ax.maxRearAxleKg) * 100, 100)}%`,
                    backgroundColor: rearAxleLoad > ax.maxRearAxleKg ? '#c63320' : '#1572b6',
                  }}
                />
              </div>
              <div className="font-mono text-[9px] text-brut-black/35 mt-0.5">
                max {ax.maxRearAxleKg.toLocaleString()} kg
                {rearAxleLoad > ax.maxRearAxleKg && <span className="text-brut-red ml-2">OVERLOAD</span>}
              </div>
            </div>
          </div>
          <div className="font-mono text-[10px] text-brut-black/40">
            CoG at {Math.round(cogX)} cm from front ({Math.round((cogX / container.innerLength) * 100)}% of length)
          </div>
        </div>
      )}

      <div className="space-y-2.5">
        <p className="text-xs font-black uppercase tracking-tight text-brut-black">Per product</p>
        {productResults.map((pr, idx) => {
          const [bL, bW, bH] = pr.orientation;
          const isRotated = bL !== pr.product.length || bW !== pr.product.width || bH !== pr.product.height;
          const color = productColors[idx];
          const hasQty = pr.product.quantity && pr.product.quantity > 0;

          return (
            <div
              key={pr.product.id}
              className="border-2 border-brut-black bg-white overflow-hidden"
              style={{ boxShadow: `3px 3px 0px ${color}` }}
            >
              <div
                className="flex items-center justify-between px-4 py-2.5 border-b-2 border-brut-black"
                style={{ backgroundColor: color }}
              >
                <div className="flex items-center gap-2">
                  <span className="text-sm font-black uppercase tracking-tight text-white">{pr.product.name ?? PRODUCT_LABELS[idx]}</span>
                  {pr.product.fragile && (
                    <span className="px-1.5 py-0.5 text-[9px] font-black uppercase bg-white/20 text-white">Fragile</span>
                  )}
                  {pr.product.stackable === false && (
                    <span className="px-1.5 py-0.5 text-[9px] font-black uppercase bg-white/20 text-white">No stack</span>
                  )}
                </div>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-2xl font-black text-white leading-none">{pr.count.toLocaleString()}</span>
                  {hasQty && (
                    <span className="font-mono text-[10px] text-white/70">/{pr.product.quantity}</span>
                  )}
                  <span className="font-mono text-[10px] text-white/70 uppercase font-bold">units</span>
                </div>
              </div>

              <div className="px-4 py-3">
                {pr.boxesPerPallet !== undefined && pr.palletCount !== undefined && (
                  <div className="grid grid-cols-2 gap-2 mb-3">
                    <div className="border-2 border-brut-black bg-brut-amber/10 p-2 text-center">
                      <div className="brut-section-label">pallets</div>
                      <div className="font-mono text-lg font-black text-brut-black mt-0.5">{pr.palletCount}</div>
                    </div>
                    <div className="border-2 border-brut-black bg-brut-amber/10 p-2 text-center">
                      <div className="brut-section-label">per pallet</div>
                      <div className="font-mono text-lg font-black text-brut-black mt-0.5">{pr.boxesPerPallet}</div>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-3 gap-2 mb-3">
                  {[
                    { label: pr.boxesPerPallet !== undefined ? 'per row' : 'rows', val: pr.nX },
                    { label: pr.boxesPerPallet !== undefined ? 'per col' : 'cols', val: pr.nY },
                    { label: 'layers', val: pr.nZ },
                  ].map(({ label, val }) => (
                    <div key={label} className="border-2 border-brut-black bg-brut-bg p-2 text-center">
                      <div className="brut-section-label">{label}</div>
                      <div className="font-mono text-lg font-black text-brut-black mt-0.5">{val}</div>
                    </div>
                  ))}
                </div>

                <div className="flex items-center gap-2 font-mono text-xs font-bold text-brut-black/40 uppercase">
                  <span>{bL} × {bW} × {bH} cm</span>
                  {isRotated && (
                    <span className="flex items-center gap-1 text-brut-orange">
                      <RotateCcw size={10} />
                      rotated
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
