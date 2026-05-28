import { useMemo } from 'react';
import {
  Package, Container as ContainerIcon, Columns3, Trophy, Plus, Trash2, TrendingUp, TrendingDown,
} from 'lucide-react';
import {
  NumInputSm, SelectInputSm, TextInputSm, Field, Section, gmColor,
} from './shared';
import {
  CostingModelProduct, CostingModelContainer, CostingScenario, ScenarioSummary,
  CostingSettings, AgentPortKey, Incoterms, SalesCurrency,
} from '../../types/costing';
import {
  PRODUCT_CATEGORIES, BAO_BUN_ADDITIONAL_DUTY_PER_100KG,
} from '../../data/costingRates';

// ── Tunables ──────────────────────────────────────────────────────────────────

const MAX_SCENARIOS = 5;
const ROW_LABEL_WIDTH = 168;
const COL_MIN_WIDTH  = 150;

const fmtGBP = (v: number) => v.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtGBP4 = (v: number) => v.toLocaleString('en-GB', { minimumFractionDigits: 4, maximumFractionDigits: 4 });

// ── Yes / No segmented toggle ─────────────────────────────────────────────────

function YesNo({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="inline-flex rounded-lg overflow-hidden" style={{ border: '1px solid rgba(217,119,6,0.25)' }}>
      {([['Yes', true], ['No', false]] as const).map(([label, val]) => (
        <button
          key={label}
          onClick={() => onChange(val)}
          className="px-3 py-1.5 text-xs font-mono font-bold transition-colors"
          style={{
            background: value === val ? 'linear-gradient(135deg, #d97706, #b45309)' : 'rgba(255,255,255,0.85)',
            color: value === val ? '#fff' : '#92400e',
            minWidth: 48,
          }}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

// ── Summary row component ─────────────────────────────────────────────────────

function SummaryRow({
  label, values, bestIdx, format = fmtGBP, isTotal = false, isMargin = false, marginPercents,
}: {
  label: string;
  values: number[];
  bestIdx: number;
  format?: (v: number) => string;
  isTotal?: boolean;
  isMargin?: boolean;
  marginPercents?: number[];
}) {
  return (
    <tr style={{ borderTop: isTotal ? '2px solid rgba(22,163,74,0.25)' : '1px solid rgba(22,163,74,0.08)' }}>
      <td
        className="px-3 py-2 font-mono text-[10px] uppercase tracking-wider sticky left-0 z-[1]"
        style={{
          background: isTotal ? 'rgba(22,163,74,0.10)' : 'rgba(22,163,74,0.04)',
          color: isTotal ? '#14532d' : 'rgba(20,83,45,0.6)',
          fontWeight: isTotal ? 800 : 600,
          width: ROW_LABEL_WIDTH,
          minWidth: ROW_LABEL_WIDTH,
        }}
      >
        {label}
      </td>
      {values.map((v, i) => {
        const isBest = isMargin && i === bestIdx && marginPercents && marginPercents.some(p => p !== 0);
        const colour = isMargin && marginPercents ? gmColor(marginPercents[i]) : (isTotal ? '#14532d' : '#15803d');
        return (
          <td
            key={i}
            className="px-3 py-2 text-right font-mono"
            style={{
              background: isBest ? 'rgba(22,163,74,0.10)' : 'transparent',
              borderLeft: '1px solid rgba(22,163,74,0.08)',
              color: colour,
              fontWeight: isTotal || isMargin ? 800 : 600,
              fontSize: isTotal || isMargin ? 13 : 11,
            }}
          >
            {format(v)}
          </td>
        );
      })}
    </tr>
  );
}

// ── Scenario input row ────────────────────────────────────────────────────────

function ScenarioRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <tr style={{ borderTop: '1px solid rgba(124,58,237,0.08)' }}>
      <td
        className="px-3 py-1.5 font-mono text-[10px] uppercase tracking-wider sticky left-0 z-[1]"
        style={{
          background: 'rgba(124,58,237,0.05)',
          color: 'rgba(76,29,149,0.7)',
          fontWeight: 600,
          width: ROW_LABEL_WIDTH,
          minWidth: ROW_LABEL_WIDTH,
        }}
      >
        {label}
      </td>
      {children}
    </tr>
  );
}

// ── Props ─────────────────────────────────────────────────────────────────────

interface Props {
  product: CostingModelProduct;
  container: CostingModelContainer;
  scenarios: CostingScenario[];
  results: ScenarioSummary[];
  settings: CostingSettings;
  productCodeSuggestions: string[];
  onSetProduct: <K extends keyof CostingModelProduct>(key: K, val: CostingModelProduct[K]) => void;
  onSetContainer: <K extends keyof CostingModelContainer>(key: K, val: CostingModelContainer[K]) => void;
  onSetScenario: <K extends keyof CostingScenario>(i: number, key: K, val: CostingScenario[K]) => void;
  onAddScenario: () => void;
  onRemoveScenario: (i: number) => void;
}

// ── Main ──────────────────────────────────────────────────────────────────────

export function MainCostingsTab({
  product, container, scenarios, results, settings, productCodeSuggestions,
  onSetProduct, onSetContainer, onSetScenario, onAddScenario, onRemoveScenario,
}: Props) {
  const agentOptions = useMemo(
    () => (Object.entries(settings.agentPortRates) as [AgentPortKey, typeof settings.agentPortRates[AgentPortKey]][])
      .map(([k, v]) => ({ value: k, label: v.label })),
    [settings.agentPortRates],
  );

  // Find scenario with best (highest) GM% for highlighting
  const bestIdx = useMemo(() => {
    if (results.length === 0) return -1;
    let best = 0;
    for (let i = 1; i < results.length; i++) {
      if (results[i].gmPercent > results[best].gmPercent) best = i;
    }
    return best;
  }, [results]);

  // Insurance read-out uses the first scenario's product cost (matches spreadsheet F12 = scenario 1)
  const insurancePreview = results[0]?.insurancePerFCLGBP ?? 0;
  // Additional Duty read-out (per kg)
  const additionalDutyPerKgPreview = product.productCategory === 'bao_bun'
    ? (container.containerWeightKg / 100) * BAO_BUN_ADDITIONAL_DUTY_PER_100KG
        / Math.max(product.caseWeightKg * (scenarios[0]?.casesPerContainer || 0), 1)
    : 0;

  const COL_STYLE: React.CSSProperties = {
    minWidth: COL_MIN_WIDTH,
    borderLeft: '1px solid rgba(124,58,237,0.12)',
  };

  const SUM_COL_STYLE: React.CSSProperties = {
    minWidth: COL_MIN_WIDTH,
    borderLeft: '1px solid rgba(22,163,74,0.10)',
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4">

      {/* ─── 1. Product Details — BLUE ─── */}
      <Section title="Product Details" icon={<Package size={13} />} accent="blue">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Field label="Product Code">
            <input
              type="text"
              list="costing-product-codes"
              value={product.productCode}
              onChange={e => onSetProduct('productCode', e.target.value)}
              placeholder="e.g. CH06"
              className="w-full px-3 py-2.5 text-sm font-mono focus:outline-none"
              style={{
                background: 'rgba(255,255,255,0.85)',
                border: '1px solid rgba(37,99,235,0.22)',
                borderRadius: 12,
                color: '#1e3a8a',
              }}
            />
            <datalist id="costing-product-codes">
              {productCodeSuggestions.map(c => <option key={c} value={c} />)}
            </datalist>
          </Field>
          <Field label="Description">
            <TextInputSm value={product.description} onChange={v => onSetProduct('description', v)} placeholder="e.g. Chicken Spring Rolls 50×60g" />
          </Field>
          <Field label="Meat Content / Category">
            <SelectInputSm value={product.productCategory} onChange={v => onSetProduct('productCategory', v)} options={PRODUCT_CATEGORIES} />
          </Field>
          <Field label="Bags per Case">
            <NumInputSm value={product.bagsPerCase} onChange={v => onSetProduct('bagsPerCase', Math.max(0, Math.floor(v)))} step={1} placeholder="50" />
          </Field>
          <Field label="Case Weight (kg)">
            <NumInputSm value={product.caseWeightKg} onChange={v => onSetProduct('caseWeightKg', v)} step={0.1} placeholder="10.00" />
          </Field>
          <Field label="Supplier">
            <TextInputSm value={product.supplier} onChange={v => onSetProduct('supplier', v)} placeholder="e.g. Thai Foods Co." />
          </Field>
          <Field label="Price (USD / tonne)">
            <NumInputSm value={product.priceUSDPerTonne} onChange={v => onSetProduct('priceUSDPerTonne', v)} prefix="$" placeholder="1500.00" />
          </Field>
        </div>
      </Section>

      {/* ─── 2. Container Details — AMBER ─── */}
      <Section title="Container Details" icon={<ContainerIcon size={13} />} accent="amber">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Field label="Clearance Type">
            <SelectInputSm
              value={container.clearanceType}
              onChange={v => onSetContainer('clearanceType', v)}
              options={[
                { value: 'licence',   label: 'Licence' },
                { value: 'full_duty', label: 'Full Duty' },
              ]}
            />
          </Field>
          <Field label="Container Weight (kg)" note="Used to compute Bao Bun additional duty">
            <NumInputSm value={container.containerWeightKg} onChange={v => onSetContainer('containerWeightKg', v)} step={50} placeholder="17000" />
          </Field>
          <Field label="Retail?">
            <YesNo value={container.retail} onChange={v => onSetContainer('retail', v)} />
          </Field>
          <Field label="Handball?">
            <YesNo value={container.handball} onChange={v => onSetContainer('handball', v)} />
          </Field>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-1">
          <div className="p-3 rounded-xl" style={{ background: 'rgba(217,119,6,0.06)', border: '1px solid rgba(217,119,6,0.18)' }}>
            <label className="flex items-center gap-2 cursor-pointer mb-2">
              <input
                type="checkbox"
                checked={container.insuranceAuto}
                onChange={e => onSetContainer('insuranceAuto', e.target.checked)}
                className="w-3.5 h-3.5"
                style={{ accentColor: '#d97706' }}
              />
              <span className="font-mono text-xs font-bold" style={{ color: '#92400e' }}>
                Auto Insurance (Product Cost × 0.25%)
              </span>
            </label>
            {container.insuranceAuto ? (
              <p className="font-mono text-[11px]" style={{ color: '#92400e' }}>
                Calculated: <span className="font-bold">£{fmtGBP(insurancePreview)}</span> / container (based on Scenario 1)
              </p>
            ) : (
              <Field label="Manual Insurance (£/container)">
                <NumInputSm value={container.insuranceManualGBP} onChange={v => onSetContainer('insuranceManualGBP', v)} prefix="£" placeholder="200" />
              </Field>
            )}
          </div>

          <div className="p-3 rounded-xl" style={{ background: 'rgba(217,119,6,0.06)', border: '1px solid rgba(217,119,6,0.18)' }}>
            <p className="font-mono text-[10px] uppercase tracking-widest mb-1.5" style={{ color: 'rgba(146,64,14,0.7)' }}>
              Additional Duty
            </p>
            {product.productCategory === 'bao_bun' ? (
              <p className="font-mono text-[11px]" style={{ color: '#92400e' }}>
                Bao Bun rule: <span className="font-bold">£{BAO_BUN_ADDITIONAL_DUTY_PER_100KG}/100kg</span> of container weight
                <br />
                = <span className="font-bold">£{fmtGBP4(additionalDutyPerKgPreview)}/kg</span>
              </p>
            ) : (
              <p className="font-mono text-[11px]" style={{ color: 'rgba(146,64,14,0.65)' }}>
                Not applicable to this category (Bao Bun only).
              </p>
            )}
          </div>
        </div>
      </Section>

      {/* ─── 3. Costing Scenarios — VIOLET ─── */}
      <Section title={`Costing Scenarios (${scenarios.length}/${MAX_SCENARIOS})`} icon={<Columns3 size={13} />} accent="violet">
        <div className="overflow-x-auto" style={{ borderRadius: 12, border: '1px solid rgba(124,58,237,0.18)' }}>
          <table className="w-full text-xs" style={{ minWidth: ROW_LABEL_WIDTH + COL_MIN_WIDTH * scenarios.length, borderCollapse: 'separate', borderSpacing: 0 }}>
            <thead>
              <tr>
                <th
                  className="px-3 py-2 font-mono text-[10px] uppercase tracking-widest text-left sticky left-0 z-[2]"
                  style={{ background: 'rgba(124,58,237,0.08)', color: '#6d28d9', width: ROW_LABEL_WIDTH, minWidth: ROW_LABEL_WIDTH }}
                >
                  Field
                </th>
                {scenarios.map((s, i) => (
                  <th
                    key={i}
                    className="px-2 py-2 text-left"
                    style={{ background: 'rgba(124,58,237,0.08)', borderLeft: '1px solid rgba(124,58,237,0.15)', minWidth: COL_MIN_WIDTH }}
                  >
                    <div className="flex items-center gap-1">
                      <input
                        type="text"
                        value={s.label}
                        onChange={e => onSetScenario(i, 'label', e.target.value)}
                        className="flex-1 min-w-0 px-2 py-1 text-xs font-bold font-mono focus:outline-none"
                        style={{ background: 'rgba(255,255,255,0.9)', border: '1px solid rgba(124,58,237,0.25)', borderRadius: 6, color: '#4c1d95' }}
                      />
                      {scenarios.length > 1 && (
                        <button
                          onClick={() => onRemoveScenario(i)}
                          className="p-1 rounded transition-colors"
                          style={{ color: 'rgba(124,58,237,0.55)' }}
                          onMouseEnter={e => (e.currentTarget.style.color = '#dc2626')}
                          onMouseLeave={e => (e.currentTarget.style.color = 'rgba(124,58,237,0.55)')}
                          title="Remove scenario"
                        >
                          <Trash2 size={11} />
                        </button>
                      )}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <ScenarioRow label="Sales Currency">
                {scenarios.map((s, i) => (
                  <td key={i} className="px-2 py-1.5" style={COL_STYLE}>
                    <SelectInputSm
                      value={s.salesCurrency}
                      onChange={v => onSetScenario(i, 'salesCurrency', v as SalesCurrency)}
                      options={[{ value: 'GBP', label: 'GBP £' }, { value: 'EUR', label: 'EUR €' }]}
                    />
                  </td>
                ))}
              </ScenarioRow>
              <ScenarioRow label="€ → £ Rate">
                {scenarios.map((s, i) => (
                  <td key={i} className="px-2 py-1.5" style={COL_STYLE}>
                    <NumInputSm
                      value={s.eurGbpRate}
                      onChange={v => onSetScenario(i, 'eurGbpRate', v)}
                      step={0.001}
                      placeholder="1.16"
                    />
                  </td>
                ))}
              </ScenarioRow>
              <ScenarioRow label="Sales Price / Case">
                {scenarios.map((s, i) => (
                  <td key={i} className="px-2 py-1.5" style={COL_STYLE}>
                    <NumInputSm
                      value={s.salesPricePerCase}
                      onChange={v => onSetScenario(i, 'salesPricePerCase', v)}
                      prefix={s.salesCurrency === 'GBP' ? '£' : '€'}
                      placeholder="0.00"
                    />
                  </td>
                ))}
              </ScenarioRow>
              <ScenarioRow label="$ → £ Rate">
                {scenarios.map((s, i) => (
                  <td key={i} className="px-2 py-1.5" style={COL_STYLE}>
                    <NumInputSm value={s.exchangeRateUSDGBP} onChange={v => onSetScenario(i, 'exchangeRateUSDGBP', v)} step={0.001} placeholder="1.27" />
                  </td>
                ))}
              </ScenarioRow>
              <ScenarioRow label="Cases / Container">
                {scenarios.map((s, i) => (
                  <td key={i} className="px-2 py-1.5" style={COL_STYLE}>
                    <NumInputSm value={s.casesPerContainer} onChange={v => onSetScenario(i, 'casesPerContainer', Math.max(0, Math.floor(v)))} step={1} placeholder="1500" />
                  </td>
                ))}
              </ScenarioRow>
              <ScenarioRow label="Incoterms">
                {scenarios.map((s, i) => (
                  <td key={i} className="px-2 py-1.5" style={COL_STYLE}>
                    <SelectInputSm
                      value={s.incoterms}
                      onChange={v => onSetScenario(i, 'incoterms', v as Incoterms)}
                      options={[{ value: 'FOB', label: 'FOB' }, { value: 'CFR', label: 'CFR' }]}
                    />
                  </td>
                ))}
              </ScenarioRow>
              <ScenarioRow label="Freight Cost $">
                {scenarios.map((s, i) => (
                  <td key={i} className="px-2 py-1.5" style={COL_STYLE}>
                    <NumInputSm value={s.freightCostUSD} onChange={v => onSetScenario(i, 'freightCostUSD', v)} prefix="$" step={50} placeholder="3500" />
                  </td>
                ))}
              </ScenarioRow>
              <ScenarioRow label="Customs Agent / Port">
                {scenarios.map((s, i) => (
                  <td key={i} className="px-2 py-1.5" style={COL_STYLE}>
                    <SelectInputSm value={s.agentPort} onChange={v => onSetScenario(i, 'agentPort', v)} options={agentOptions} />
                  </td>
                ))}
              </ScenarioRow>
              <ScenarioRow label="Transport £/Container">
                {scenarios.map((s, i) => (
                  <td key={i} className="px-2 py-1.5" style={COL_STYLE}>
                    <NumInputSm value={s.transportCostGBP} onChange={v => onSetScenario(i, 'transportCostGBP', v)} prefix="£" step={10} placeholder="550" />
                  </td>
                ))}
              </ScenarioRow>
              <ScenarioRow label="Licence Cost £/kg">
                {scenarios.map((s, i) => (
                  <td key={i} className="px-2 py-1.5" style={COL_STYLE}>
                    <NumInputSm value={s.licenceCostPerKgGBP} onChange={v => onSetScenario(i, 'licenceCostPerKgGBP', v)} prefix="£" step={0.01} placeholder="0.40" />
                  </td>
                ))}
              </ScenarioRow>
            </tbody>
          </table>
        </div>

        {scenarios.length < MAX_SCENARIOS && (
          <button
            onClick={onAddScenario}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition-colors"
            style={{
              background: 'rgba(124,58,237,0.10)',
              color: '#6d28d9',
              border: '1px solid rgba(124,58,237,0.25)',
            }}
            onMouseEnter={e => (e.currentTarget.style.background = 'rgba(124,58,237,0.18)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'rgba(124,58,237,0.10)')}
          >
            <Plus size={12} /> Add scenario
          </button>
        )}
      </Section>

      {/* ─── 4. Summary — GREEN ─── */}
      <Section title="Summary" icon={<Trophy size={13} />} accent="green">
        <div className="overflow-x-auto" style={{ borderRadius: 12, border: '1px solid rgba(22,163,74,0.18)' }}>
          <table className="w-full text-xs" style={{ minWidth: ROW_LABEL_WIDTH + COL_MIN_WIDTH * scenarios.length, borderCollapse: 'separate', borderSpacing: 0 }}>
            <thead>
              <tr>
                <th
                  className="px-3 py-2 font-mono text-[10px] uppercase tracking-widest text-left sticky left-0 z-[2]"
                  style={{ background: 'rgba(22,163,74,0.10)', color: '#14532d', width: ROW_LABEL_WIDTH, minWidth: ROW_LABEL_WIDTH }}
                >
                  Costing Scenario
                </th>
                {scenarios.map((s, i) => (
                  <th
                    key={i}
                    className="px-3 py-2 text-right font-mono text-xs"
                    style={{
                      background: i === bestIdx ? 'rgba(22,163,74,0.18)' : 'rgba(22,163,74,0.08)',
                      borderLeft: '1px solid rgba(22,163,74,0.15)',
                      color: '#14532d',
                      minWidth: COL_MIN_WIDTH,
                      fontWeight: 800,
                    }}
                  >
                    <div className="flex items-center justify-end gap-1.5">
                      {i === bestIdx && results[i].gmPercent > 0 && <Trophy size={10} style={{ color: '#ca8a04' }} />}
                      {s.label}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <SummaryRow label="Product Cost £"             values={results.map(r => r.productCostGBP)} bestIdx={bestIdx} />
              <SummaryRow label="Duty"                        values={results.map(r => r.dutyGBP)} bestIdx={bestIdx} />
              <SummaryRow label="Freight"                     values={results.map(r => r.freightGBP)} bestIdx={bestIdx} />
              <SummaryRow label="Port Clearance + Transport"  values={results.map(r => r.portClearanceTransportGBP)} bestIdx={bestIdx} />
              <SummaryRow label="Licence Cost"                values={results.map(r => r.licenceCostGBP)} bestIdx={bestIdx} />
              <SummaryRow label="Handball"                    values={results.map(r => r.handballGBP)} bestIdx={bestIdx} />
              <SummaryRow label="Currency / Insurance / Add 2" values={results.map(r => r.currencyInsuranceAdditions2GBP)} bestIdx={bestIdx} />
              <SummaryRow label="Additions 1"                 values={results.map(r => r.additions1GBP)} bestIdx={bestIdx} />
              <SummaryRow label="Additional Duty"             values={results.map(r => r.additionalDutyGBP)} bestIdx={bestIdx} />
              <SummaryRow label="Insurance"                   values={results.map(r => r.insurancePerFCLGBP)} bestIdx={bestIdx} />
              <SummaryRow label="Total Cost"                  values={results.map(r => r.totalCostGBP)} bestIdx={bestIdx} isTotal />
              <SummaryRow label="Cost / Case"                 values={results.map(r => r.costPerCaseGBP)} bestIdx={bestIdx} isTotal />
              <SummaryRow label="Cost / KG"                   values={results.map(r => r.costPerKgGBP)} bestIdx={bestIdx} format={fmtGBP4} isTotal />
              <SummaryRow
                label="Gross Margin %"
                values={results.map(r => r.gmPercent)}
                bestIdx={bestIdx}
                isMargin
                marginPercents={results.map(r => r.gmPercent)}
                format={v => `${v.toFixed(1)}%`}
              />
            </tbody>
          </table>
        </div>

        {/* GM headline cards beneath the table */}
        <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${Math.min(scenarios.length, 5)}, minmax(0, 1fr))` }}>
          {results.map((r, i) => {
            const gc = gmColor(r.gmPercent);
            const isBest = i === bestIdx && r.gmPercent > 0;
            return (
              <div
                key={i}
                className="p-3 rounded-xl"
                style={{
                  background: isBest ? 'rgba(22,163,74,0.10)' : 'rgba(255,255,255,0.6)',
                  border: `1.5px solid ${isBest ? 'rgba(22,163,74,0.45)' : 'rgba(22,163,74,0.15)'}`,
                }}
              >
                <p className="font-mono text-[9px] uppercase tracking-widest" style={{ color: 'rgba(20,83,45,0.55)' }}>
                  {scenarios[i]?.label ?? `Scenario ${i + 1}`}
                </p>
                <div className="flex items-center gap-1.5 mt-1">
                  {r.gmPercent >= 0
                    ? <TrendingUp size={12} style={{ color: gc }} />
                    : <TrendingDown size={12} style={{ color: gc }} />}
                  <span className="text-xl font-black" style={{ color: gc }}>{r.gmPercent.toFixed(1)}%</span>
                </div>
                <p className="font-mono text-[10px] mt-1" style={{ color: 'rgba(20,83,45,0.6)' }}>
                  £{fmtGBP(r.costPerCaseGBP)}/case · £{fmtGBP4(r.costPerKgGBP)}/kg
                </p>
              </div>
            );
          })}
        </div>
      </Section>

    </div>
  );
}
