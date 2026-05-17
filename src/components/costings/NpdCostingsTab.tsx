import { useState, useMemo } from 'react';
import { NumInputSm, SelectInputSm, TextInputSm, Field, Section, gmColor } from './shared';
import { NpdSharedProduct, NpdScenario, CostingSettings, AgentPortKey } from '../../types/costing';
import { PRODUCT_CATEGORIES, AGENT_PORT_RATES, DEFAULT_TRANSPORT_COSTS } from '../../data/costingRates';
import { computeNpdScenario } from '../../utils/costingCalc';

const SCENARIO_COUNT = 5;

function makeScenario(i: number, agentRates: typeof AGENT_PORT_RATES): NpdScenario {
  const keys = Object.keys(agentRates) as AgentPortKey[];
  const key = keys[i % keys.length];
  return {
    label: `Scenario ${i + 1}`,
    exchangeRateUSDGBP: 1.27,
    freightCostUSD: 0,
    agentPort: key,
    transportCostGBP: DEFAULT_TRANSPORT_COSTS[key],
    handballing: false,
    handballingCostGBP: 300,
    insuranceAuto: true,
    insuranceManualGBP: 0,
    sellingPricePerCase: 0,
  };
}

const DEFAULT_PRODUCT: NpdSharedProduct = {
  productName: '',
  supplier: '',
  costPerTonneUSD: 0,
  caseWeightKg: 0,
  casesPerContainer: 0,
  productCategory: 'meat_lt57',
  clearanceType: 'licence',
};

interface Props {
  settings: CostingSettings;
}

export function NpdCostingsTab({ settings }: Props) {
  const agentRates = settings.agentPortRates;
  const agentOptions = (Object.entries(agentRates) as [AgentPortKey, typeof agentRates[AgentPortKey]][])
    .map(([k, v]) => ({ value: k, label: v.label }));

  const [product, setProduct] = useState<NpdSharedProduct>(DEFAULT_PRODUCT);
  const [scenarios, setScenarios] = useState<NpdScenario[]>(
    Array.from({ length: SCENARIO_COUNT }, (_, i) => makeScenario(i, agentRates)),
  );

  function setP<K extends keyof NpdSharedProduct>(key: K, val: NpdSharedProduct[K]) {
    setProduct(p => ({ ...p, [key]: val }));
  }

  function setS<K extends keyof NpdScenario>(i: number, key: K, val: NpdScenario[K]) {
    setScenarios(prev => {
      const next = [...prev];
      next[i] = { ...next[i], [key]: val };
      return next;
    });
  }

  const results = useMemo(
    () => scenarios.map(s => computeNpdScenario(product, s, settings)),
    [product, scenarios, settings],
  );

  const COL = 'min-w-[170px]';

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4">

      {/* Shared product */}
      <Section title="Shared Product Details" defaultOpen>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <Field label="Product name">
            <TextInputSm value={product.productName} onChange={v => setP('productName', v)} placeholder="e.g. Gyoza" />
          </Field>
          <Field label="Supplier">
            <TextInputSm value={product.supplier} onChange={v => setP('supplier', v)} placeholder="Supplier" />
          </Field>
          <Field label="Product category">
            <SelectInputSm value={product.productCategory} onChange={v => setP('productCategory', v)} options={PRODUCT_CATEGORIES} />
          </Field>
          <Field label="Cost per tonne (USD)">
            <NumInputSm value={product.costPerTonneUSD} onChange={v => setP('costPerTonneUSD', v)} prefix="$" placeholder="1500.00" />
          </Field>
          <Field label="Case weight (kg)">
            <NumInputSm value={product.caseWeightKg} onChange={v => setP('caseWeightKg', v)} placeholder="10.00" />
          </Field>
          <Field label="Cases / container">
            <NumInputSm value={product.casesPerContainer} onChange={v => setP('casesPerContainer', Math.max(1, Math.floor(v)))} step={1} placeholder="1000" />
          </Field>
          <Field label="Clearance type">
            <SelectInputSm
              value={product.clearanceType} onChange={v => setP('clearanceType', v)}
              options={[{ value: 'licence', label: 'Licence' }, { value: 'full_duty', label: 'Full Duty' }]}
            />
          </Field>
        </div>
      </Section>

      {/* Scenarios horizontal table */}
      <div style={{ background: 'rgba(255,255,255,0.75)', border: '1px solid rgba(22,163,74,0.18)', borderRadius: 16, overflow: 'hidden' }}>
        <div className="px-4 py-3" style={{ background: 'linear-gradient(135deg, #16a34a, #15803d)', borderBottom: '1px solid rgba(22,163,74,0.25)' }}>
          <p className="font-bold text-xs uppercase tracking-widest text-white">5-Scenario Comparison</p>
          <p className="font-mono text-[9px] mt-0.5" style={{ color: 'rgba(255,255,255,0.6)' }}>Each column is an independent import scenario for the same product</p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs" style={{ minWidth: 900 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(22,163,74,0.12)' }}>
                <th className="text-left px-4 py-2 font-mono text-[10px] uppercase tracking-widest w-36 shrink-0"
                  style={{ color: 'rgba(20,83,45,0.5)', background: 'rgba(22,163,74,0.04)' }}>Field</th>
                {scenarios.map((s, i) => (
                  <th key={i} className={`${COL} px-3 py-2 text-left`}
                    style={{ background: 'rgba(22,163,74,0.04)', borderLeft: '1px solid rgba(22,163,74,0.1)' }}>
                    <input
                      type="text" value={s.label}
                      onChange={e => setS(i, 'label', e.target.value)}
                      className="w-full px-2 py-1 text-xs font-bold font-mono focus:outline-none"
                      style={{ background: 'transparent', border: '1px solid rgba(22,163,74,0.2)', borderRadius: 6, color: '#14532d' }}
                    />
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {/* Exchange rate */}
              <NpdRow label="Exchange rate ($/£)">
                {scenarios.map((s, i) => (
                  <NumInputSm key={i} value={s.exchangeRateUSDGBP} onChange={v => setS(i, 'exchangeRateUSDGBP', v)} placeholder="1.27" step={0.001} />
                ))}
              </NpdRow>

              {/* Freight */}
              <NpdRow label="Freight (USD/FCL)">
                {scenarios.map((s, i) => (
                  <NumInputSm key={i} value={s.freightCostUSD} onChange={v => setS(i, 'freightCostUSD', v)} prefix="$" placeholder="3500" step={50} />
                ))}
              </NpdRow>

              {/* Agent/port */}
              <NpdRow label="Agent / Port">
                {scenarios.map((s, i) => (
                  <SelectInputSm key={i} value={s.agentPort} onChange={v => setS(i, 'agentPort', v)} options={agentOptions} />
                ))}
              </NpdRow>

              {/* Transport */}
              <NpdRow label="Transport (£/FCL)">
                {scenarios.map((s, i) => (
                  <NumInputSm key={i} value={s.transportCostGBP} onChange={v => setS(i, 'transportCostGBP', v)} prefix="£" placeholder="550" step={10} />
                ))}
              </NpdRow>

              {/* Insurance auto */}
              <NpdRow label="Insurance auto">
                {scenarios.map((s, i) => (
                  <label key={i} className="flex items-center gap-1.5 cursor-pointer">
                    <input type="checkbox" checked={s.insuranceAuto} onChange={e => setS(i, 'insuranceAuto', e.target.checked)}
                      className="w-3 h-3" style={{ accentColor: '#16a34a' }} />
                    <span className="font-mono text-[10px]" style={{ color: '#14532d' }}>
                      {s.insuranceAuto ? `£${settings.insurancePerFCL}/FCL` : 'Manual'}
                    </span>
                  </label>
                ))}
              </NpdRow>

              {/* Handball */}
              <NpdRow label="Handballing">
                {scenarios.map((s, i) => (
                  <label key={i} className="flex items-center gap-1.5 cursor-pointer">
                    <input type="checkbox" checked={s.handballing} onChange={e => setS(i, 'handballing', e.target.checked)}
                      className="w-3 h-3" style={{ accentColor: '#16a34a' }} />
                    <span className="font-mono text-[10px]" style={{ color: '#14532d' }}>
                      {s.handballing ? `£${s.handballingCostGBP}` : 'No'}
                    </span>
                  </label>
                ))}
              </NpdRow>

              {/* Selling price */}
              <NpdRow label="Selling price (£/case)">
                {scenarios.map((s, i) => (
                  <NumInputSm key={i} value={s.sellingPricePerCase} onChange={v => setS(i, 'sellingPricePerCase', v)} prefix="£" placeholder="0.00" />
                ))}
              </NpdRow>

              {/* ── Results divider ── */}
              <tr>
                <td colSpan={SCENARIO_COUNT + 1} style={{ background: 'linear-gradient(135deg, rgba(22,163,74,0.08), rgba(21,128,61,0.06))', borderTop: '2px solid rgba(22,163,74,0.2)', borderBottom: '1px solid rgba(22,163,74,0.15)' }}>
                  <p className="font-bold text-[10px] uppercase tracking-widest px-4 py-2" style={{ color: '#15803d' }}>Results</p>
                </td>
              </tr>

              {/* Duty rate */}
              <NpdRow label="Duty rate" shade>
                {results.map((r, i) => (
                  <span key={i} className="font-mono text-[10px] font-bold" style={{ color: '#14532d' }}>{r.dutyRateLabel}</span>
                ))}
              </NpdRow>

              {/* Cost/case */}
              <NpdRow label="Cost / case" shade>
                {results.map((r, i) => (
                  <span key={i} className="font-mono text-sm font-black" style={{ color: '#14532d' }}>£{r.totalCostPerCase.toFixed(2)}</span>
                ))}
              </NpdRow>

              {/* Cost/kg */}
              <NpdRow label="Cost / kg" shade>
                {results.map((r, i) => (
                  <span key={i} className="font-mono text-[10px] font-bold" style={{ color: '#14532d' }}>£{r.costPerKg.toFixed(4)}</span>
                ))}
              </NpdRow>

              {/* Total / container */}
              <NpdRow label="Total / container" shade>
                {results.map((r, i) => (
                  <span key={i} className="font-mono text-[10px] font-bold" style={{ color: '#14532d' }}>
                    £{r.totalCostPerContainer.toLocaleString('en-GB', { maximumFractionDigits: 0 })}
                  </span>
                ))}
              </NpdRow>

              {/* GM% */}
              <NpdRow label="Gross margin %" shade>
                {results.map((r, i) => {
                  const hasPrice = scenarios[i].sellingPricePerCase > 0;
                  const gc = gmColor(r.gmPercent);
                  return (
                    <span key={i} className="font-mono text-sm font-black" style={{ color: hasPrice ? gc : 'rgba(20,83,45,0.3)' }}>
                      {hasPrice ? `${r.gmPercent.toFixed(1)}%` : '—'}
                    </span>
                  );
                })}
              </NpdRow>

              {/* GP/case */}
              <NpdRow label="GP / case" shade>
                {results.map((r, i) => {
                  const hasPrice = scenarios[i].sellingPricePerCase > 0;
                  const gc = gmColor(r.gmPercent);
                  return (
                    <span key={i} className="font-mono text-[10px] font-bold" style={{ color: hasPrice ? gc : 'rgba(20,83,45,0.3)' }}>
                      {hasPrice ? `${r.gmGBPPerCase >= 0 ? '+' : ''}£${r.gmGBPPerCase.toFixed(2)}` : '—'}
                    </span>
                  );
                })}
              </NpdRow>

              {/* Breakdown rows */}
              <tr>
                <td colSpan={SCENARIO_COUNT + 1} style={{ background: 'rgba(22,163,74,0.03)', borderTop: '1px solid rgba(22,163,74,0.1)', borderBottom: '1px solid rgba(22,163,74,0.1)' }}>
                  <p className="font-mono text-[9px] uppercase tracking-widest px-4 py-1.5" style={{ color: 'rgba(20,83,45,0.45)' }}>Breakdown / case</p>
                </td>
              </tr>

              {[
                { key: 'productCostPerCase', label: 'Product cost' },
                { key: 'freightPerCase',     label: 'Freight' },
                { key: 'dutyPerCase',        label: 'Duty' },
                { key: 'portClearancePerCase', label: 'Port clearance' },
                { key: 'transportPerCase',   label: 'Transport' },
                { key: 'handballingPerCase', label: 'Handballing' },
                { key: 'insurancePerCase',   label: 'Insurance' },
              ].map(({ key, label }) => (
                <NpdRow key={key} label={label} shade>
                  {results.map((r, i) => {
                    const val = r[key as keyof typeof r] as number;
                    return (
                      <span key={i} className="font-mono text-[10px]" style={{ color: val > 0 ? '#14532d' : 'rgba(20,83,45,0.25)' }}>
                        {val > 0 ? `£${val.toFixed(4)}` : '—'}
                      </span>
                    );
                  })}
                </NpdRow>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function NpdRow({ label, children, shade }: { label: string; children: React.ReactNode; shade?: boolean }) {
  const cells = Array.isArray(children) ? children : [children];
  return (
    <tr style={{ borderBottom: '1px solid rgba(22,163,74,0.07)', background: shade ? 'rgba(240,249,240,0.3)' : undefined }}>
      <td className="px-4 py-2 font-mono text-[10px] whitespace-nowrap" style={{ color: 'rgba(20,83,45,0.55)', background: 'rgba(22,163,74,0.04)' }}>
        {label}
      </td>
      {cells.map((cell, i) => (
        <td key={i} className="px-3 py-2" style={{ borderLeft: '1px solid rgba(22,163,74,0.08)', minWidth: 170 }}>
          {cell}
        </td>
      ))}
    </tr>
  );
}
