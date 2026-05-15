import { useState } from 'react';
import { TrendingUp, TrendingDown, Package, Ship, FileCheck, Truck, Shield, Sliders, ChevronDown, ChevronUp } from 'lucide-react';
import { CostingResults as Results } from '../../types/costing';

interface Props {
  results: Results;
  targetSellingPrice: number;
  onTargetSellingPriceChange: (price: number) => void;
}

function fmt(n: number, decimals = 2): string {
  return n.toLocaleString('en-GB', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

function fmtPct(n: number): string {
  return n.toFixed(1) + '%';
}

interface MetricProps {
  label: string;
  value: string;
  sub?: string;
  accent?: 'default' | 'positive' | 'negative' | 'warning';
}

function Metric({ label, value, sub, accent = 'default' }: MetricProps) {
  const colors: Record<string, string> = {
    default: '#14532d',
    positive: '#16a34a',
    negative: '#dc2626',
    warning: '#d96a1c',
  };
  return (
    <div className="flex flex-col gap-0.5">
      <span className="font-mono text-[9px] uppercase tracking-widest" style={{ color: 'rgba(20,83,45,0.52)' }}>{label}</span>
      <span className="font-black text-lg leading-none" style={{ color: colors[accent] }}>{value}</span>
      {sub && <span className="font-mono text-[10px]" style={{ color: 'rgba(20,83,45,0.38)' }}>{sub}</span>}
    </div>
  );
}

interface WaterfallProps {
  results: Results;
}

function CostWaterfall({ results }: WaterfallProps) {
  const total = results.totalLandedCostGBP;
  if (total <= 0) return null;

  const segments = [
    { label: 'Product', value: results.totalProductCostGBP, color: '#0ea5e9' },
    { label: 'Freight', value: results.totalFreightGBP, color: '#f59e0b' },
    { label: 'Duty & Tax', value: results.totalClearanceGBP, color: '#ef4444' },
    { label: 'Domestic', value: results.totalDomesticGBP, color: '#0891b2' },
    { label: 'Overhead', value: results.totalInsuranceOverheadGBP, color: '#64748b' },
    ...(results.totalCustomCostsGBP > 0 ? [{ label: 'Custom +', value: results.totalCustomCostsGBP, color: '#dc2626' }] : []),
    ...(results.totalCustomBenefitsGBP > 0 ? [{ label: 'Custom -', value: -results.totalCustomBenefitsGBP, color: '#059669' }] : []),
  ].filter(s => s.value > 0);

  const revenue = results.revenueGBP;
  const grandTotal = revenue > 0 ? revenue : total;

  return (
    <div className="space-y-2">
      <p className="font-mono text-[9px] uppercase tracking-widest" style={{ color: 'rgba(20,83,45,0.52)' }}>Cost Breakdown</p>
      <div
        className="flex h-6 w-full overflow-hidden"
        style={{ border: '1px solid rgba(0,0,0,0.08)', borderRadius: '8px', overflow: 'hidden' }}
      >
        {segments.map(seg => {
          const pct = grandTotal > 0 ? (seg.value / grandTotal) * 100 : 0;
          return pct > 0 ? (
            <div
              key={seg.label}
              style={{ width: `${pct}%`, backgroundColor: seg.color }}
              className="relative group"
              title={`${seg.label}: £${fmt(seg.value)}`}
            />
          ) : null;
        })}
        {revenue > total && (
          <div
            style={{ width: `${((revenue - total) / grandTotal) * 100}%`, backgroundColor: '#10b981' }}
            title={`Profit: £${fmt(revenue - total)}`}
          />
        )}
      </div>
      <div className="flex flex-wrap gap-x-3 gap-y-1">
        {segments.map(seg => (
          <div key={seg.label} className="flex items-center gap-1">
            <div className="w-2 h-2 shrink-0" style={{ backgroundColor: seg.color }} />
            <span className="font-mono text-[9px]" style={{ color: 'rgba(20,83,45,0.5)' }}>{seg.label}</span>
            <span className="font-mono text-[9px]" style={{ color: 'rgba(20,83,45,0.7)' }}>{grandTotal > 0 ? fmtPct((seg.value / grandTotal) * 100) : '0%'}</span>
          </div>
        ))}
        {revenue > total && (
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 shrink-0 bg-emerald-500" />
            <span className="font-mono text-[9px]" style={{ color: 'rgba(20,83,45,0.5)' }}>Profit</span>
            <span className="font-mono text-[9px]" style={{ color: 'rgba(20,83,45,0.7)' }}>{fmtPct(((revenue - total) / grandTotal) * 100)}</span>
          </div>
        )}
      </div>
    </div>
  );
}

interface CostRowProps {
  icon: React.ReactNode;
  label: string;
  value: number;
  sub?: string;
}

function CostRow({ icon, label, value, sub }: CostRowProps) {
  return (
    <div className="flex items-center justify-between py-2 last:border-0" style={{ borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
      <div className="flex items-center gap-2">
        <span style={{ color: 'rgba(20,83,45,0.45)' }}>{icon}</span>
        <div>
          <span className="text-sm font-medium" style={{ color: '#14532d' }}>{label}</span>
          {sub && <span className="block font-mono text-[10px]" style={{ color: 'rgba(20,83,45,0.38)' }}>{sub}</span>}
        </div>
      </div>
      <span className="font-mono text-sm font-bold" style={{ color: '#14532d' }}>£{fmt(value)}</span>
    </div>
  );
}

export function CostingResults({ results, targetSellingPrice, onTargetSellingPriceChange }: Props) {
  const [detailOpen, setDetailOpen] = useState(false);

  const marginAccent = results.grossMarginPercent >= 30
    ? 'positive'
    : results.grossMarginPercent >= 15
    ? 'warning'
    : 'negative';

  const profitAccent = results.grossProfitGBP >= 0 ? 'positive' : 'negative';

  return (
    <div
      className="flex flex-col gap-0"
      style={{
        background: 'rgba(255,255,255,0.68)',
        backdropFilter: 'blur(20px)',
        border: '1px solid rgba(255,255,255,0.85)',
        borderRadius: '16px',
        overflow: 'hidden',
      }}
    >
      <div
        className="px-4 py-3"
        style={{ background: 'rgba(255,255,255,0.5)', borderBottom: '1px solid rgba(0,0,0,0.06)' }}
      >
        <h3 className="font-black text-xs uppercase tracking-widest" style={{ color: '#14532d' }}>Live Cost Summary</h3>
        <p className="font-mono text-[10px] mt-0.5" style={{ color: 'rgba(20,83,45,0.52)' }}>All values in GBP · Updates instantly</p>
      </div>

      <div className="p-4 space-y-4" style={{ borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
        <div className="grid grid-cols-2 gap-4">
          <Metric
            label="Total Landed Cost"
            value={`£${fmt(results.totalLandedCostGBP)}`}
            sub={`${results.totalUnits.toLocaleString()} units`}
          />
          <Metric
            label="Cost per Unit"
            value={`£${fmt(results.landedCostPerUnitGBP)}`}
            sub="landed, all-in"
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Metric
            label="CIF Value"
            value={`£${fmt(results.cifValueGBP)}`}
            sub="at port of entry"
          />
          <Metric
            label="Duty & Tax Total"
            value={`£${fmt(results.dutyAndTaxTotalGBP)}`}
            sub="customs + VAT"
            accent="warning"
          />
        </div>
      </div>

      <button
        onClick={() => setDetailOpen(o => !o)}
        className="w-full flex items-center justify-between px-4 py-2.5 transition-colors"
        style={{ background: 'rgba(255,255,255,0.5)', borderBottom: '1px solid rgba(0,0,0,0.06)' }}
      >
        <span className="font-mono text-[10px] uppercase tracking-widest" style={{ color: 'rgba(20,83,45,0.52)' }}>Charges &amp; Gross Margin</span>
        {detailOpen
          ? <ChevronUp size={13} style={{ color: 'rgba(20,83,45,0.52)' }} strokeWidth={2.5} />
          : <ChevronDown size={13} style={{ color: 'rgba(20,83,45,0.52)' }} strokeWidth={2.5} />
        }
      </button>

      {detailOpen && (
        <>
          <div className="px-4 py-3" style={{ borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
            <div className="space-y-1">
              <CostRow icon={<Package size={12} />} label="Product & Packing" value={results.totalProductCostGBP} />
              <CostRow icon={<Ship size={12} />} label="Freight & Surcharges" value={results.totalFreightGBP} />
              <CostRow icon={<FileCheck size={12} />} label="Clearance & Duty" value={results.totalClearanceGBP} />
              <CostRow icon={<Truck size={12} />} label="Domestic Transport" value={results.totalDomesticGBP} />
              <CostRow icon={<Shield size={12} />} label="Insurance & Overheads" value={results.totalInsuranceOverheadGBP} />
              {results.customFieldResults.length > 0 && (
                <>
                  {results.customFieldResults.map(cf => (
                    <div
                      key={cf.id}
                      className="flex items-center justify-between py-2 last:border-0"
                      style={{ borderBottom: '1px solid rgba(0,0,0,0.06)' }}
                    >
                      <div className="flex items-center gap-2">
                        <span style={{ color: 'rgba(20,83,45,0.45)' }}><Sliders size={12} /></span>
                        <div>
                          <span className="text-sm font-medium" style={{ color: '#14532d' }}>{cf.name || 'Custom field'}</span>
                          <span className={`block font-mono text-[10px] ${cf.effect === 'cost' ? 'text-red-500' : 'text-emerald-600'}`}>
                            {cf.effect === 'cost' ? 'Extra cost' : 'Benefit / deduction'}
                          </span>
                        </div>
                      </div>
                      <span className={`font-mono text-sm font-bold ${cf.effect === 'cost' ? 'text-red-500' : 'text-emerald-600'}`}>
                        {cf.effect === 'cost' ? '+' : '-'}£{fmt(cf.amountGBP)}
                      </span>
                    </div>
                  ))}
                </>
              )}
            </div>
          </div>

          <div className="px-4 py-3" style={{ borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
            <div className="grid grid-cols-2 gap-4">
              <Metric
                label="Gross Margin"
                value={fmtPct(results.grossMarginPercent)}
                accent={marginAccent}
              />
              <Metric
                label="Gross Profit"
                value={`£${fmt(results.grossProfitGBP)}`}
                sub={`£${fmt(results.grossProfitPerUnitGBP)}/unit`}
                accent={profitAccent}
              />
              <Metric
                label="Total Revenue"
                value={`£${fmt(results.revenueGBP)}`}
              />
              <Metric
                label="ROI"
                value={fmtPct(results.roiPercent)}
                sub="on total investment"
                accent={results.roiPercent >= 0 ? 'positive' : 'negative'}
              />
            </div>
          </div>

          {results.grossMarginPercent > 0 && results.grossMarginPercent < 15 && (
            <div
              className="mx-4 mb-3 flex items-center gap-2 px-3 py-2"
              style={{
                background: 'rgba(217,119,6,0.08)',
                border: '1px solid rgba(217,119,6,0.25)',
                borderRadius: '10px',
                color: '#92400e',
              }}
            >
              <TrendingDown size={13} className="text-amber-600 shrink-0" strokeWidth={2.5} />
              <p className="text-xs">Margin below 15% — consider renegotiating product cost or freight terms.</p>
            </div>
          )}
          {results.grossMarginPercent >= 30 && (
            <div
              className="mx-4 mb-3 flex items-center gap-2 px-3 py-2"
              style={{
                background: 'rgba(22,163,74,0.08)',
                border: '1px solid rgba(22,163,74,0.25)',
                borderRadius: '10px',
                color: '#14532d',
              }}
            >
              <TrendingUp size={13} className="shrink-0" style={{ color: '#16a34a' }} strokeWidth={2.5} />
              <p className="text-xs">Healthy margin above 30%. Good commercial position.</p>
            </div>
          )}
          {results.grossProfitGBP < 0 && (
            <div
              className="mx-4 mb-3 flex items-center gap-2 px-3 py-2"
              style={{
                background: 'rgba(220,38,38,0.08)',
                border: '1px solid rgba(220,38,38,0.2)',
                borderRadius: '10px',
                color: '#991b1b',
              }}
            >
              <TrendingDown size={13} className="shrink-0 text-red-500" strokeWidth={2.5} />
              <p className="text-xs">Selling below cost. Increase selling price above £{fmt(results.breakEvenSellingPriceGBP)}/unit.</p>
            </div>
          )}
        </>
      )}

      <div className="p-4 space-y-3" style={{ borderTop: '1px solid rgba(0,0,0,0.06)' }}>
        <label className="block font-mono text-[10px] uppercase tracking-widest" style={{ color: 'rgba(20,83,45,0.52)' }}>
          Target Selling Price per Unit (£)
        </label>
        <div className="flex items-center gap-2">
          <span className="font-mono text-sm" style={{ color: 'rgba(20,83,45,0.52)' }}>£</span>
          <input
            type="number"
            value={targetSellingPrice || ''}
            onChange={e => onTargetSellingPriceChange(parseFloat(e.target.value) || 0)}
            placeholder="0.00"
            min={0}
            step={0.01}
            className="flex-1 px-3 py-2.5 text-sm font-mono focus:outline-none transition-colors"
            style={{
              background: 'rgba(255,255,255,0.70)',
              border: '1px solid rgba(0,0,0,0.09)',
              borderRadius: '12px',
              color: '#14532d',
            }}
          />
        </div>
        <div
          className="flex items-center gap-1 px-2 py-1.5"
          style={{
            background: 'rgba(255,255,255,0.60)',
            border: '1px solid rgba(0,0,0,0.07)',
            borderRadius: '8px',
          }}
        >
          <span className="font-mono text-[10px]" style={{ color: 'rgba(20,83,45,0.52)' }}>Break-even:</span>
          <span className="font-mono text-[10px] font-bold ml-1" style={{ color: '#d96a1c' }}>£{fmt(results.breakEvenSellingPriceGBP)}/unit</span>
        </div>
      </div>

      <div className="px-4 pb-4">
        <CostWaterfall results={results} />
      </div>
    </div>
  );
}
