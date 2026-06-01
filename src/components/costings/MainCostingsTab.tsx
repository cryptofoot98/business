import { useMemo } from 'react';
import { Icon } from '../Icon';
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
import { Product, NewProductInput } from '../../types/product';
import { ProductCombobox } from './ProductCombobox';

// ── Tunables ──────────────────────────────────────────────────────────────────

const MAX_SCENARIOS = 5;
const ROW_LABEL_WIDTH = 180;
const COL_MIN_WIDTH  = 156;

const fmtGBP = (v: number) => v.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtGBP4 = (v: number) => v.toLocaleString('en-GB', { minimumFractionDigits: 4, maximumFractionDigits: 4 });

// ── Scenario colour palette (one per scenario, up to 5) ──────────────────────
// Distinct accents — violet / indigo / teal / amber / rose — applied to each
// scenario column header so values are easy to track across the two tables.

export interface ScenarioPaletteEntry {
  name: string;
  headerFrom: string;
  headerTo: string;
  headerText: string;
  tint: string;          // subtle column background
  border: string;        // column border accent
  chip: string;          // small label chip background
}

export const SCENARIO_PALETTE: ScenarioPaletteEntry[] = [
  { name: 'violet', headerFrom: '#7c3aed', headerTo: '#6d28d9', headerText: '#4c1d95', tint: 'rgba(168, 85, 247, 0.05)', border: 'rgba(168, 85, 247, 0.22)', chip: 'rgba(168, 85, 247, 0.12)' },
  { name: 'indigo', headerFrom: '#4f46e5', headerTo: '#4338ca', headerText: '#312e81', tint: 'rgba(79,70,229,0.05)',  border: 'rgba(79,70,229,0.22)',  chip: 'rgba(79,70,229,0.12)'  },
  { name: 'teal',   headerFrom: '#0d9488', headerTo: '#0f766e', headerText: '#134e4a', tint: 'rgba(13,148,136,0.05)', border: 'rgba(13,148,136,0.22)', chip: 'rgba(13,148,136,0.12)' },
  { name: 'amber',  headerFrom: '#f59e0b', headerTo: '#d97706', headerText: '#78350f', tint: 'rgba(245,158,11,0.06)', border: 'rgba(245,158,11,0.28)', chip: 'rgba(245,158,11,0.14)' },
  { name: 'rose',   headerFrom: '#e11d48', headerTo: '#be123c', headerText: '#881337', tint: 'rgba(225,29,72,0.05)',  border: 'rgba(225,29,72,0.22)',  chip: 'rgba(225,29,72,0.12)'  },
];

const paletteFor = (i: number) => SCENARIO_PALETTE[i % SCENARIO_PALETTE.length];

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
    <tr>
      <td
        className="px-3 py-2 text-[11px] uppercase tracking-wider sticky left-0 z-[1]"
        style={{
          background: isTotal ? 'rgba(245, 158, 11, 0.12)' : 'rgba(245, 158, 11, 0.05)',
          color: isTotal ? '#1a1410' : 'rgba(90, 74, 61, 0.65)',
          fontWeight: isTotal ? 800 : 600,
          width: ROW_LABEL_WIDTH,
          minWidth: ROW_LABEL_WIDTH,
          borderBottom: isTotal ? '2px solid rgba(245, 158, 11, 0.3)' : '1px solid rgba(245, 158, 11, 0.12)',
          borderRight: '1px solid rgba(245, 158, 11, 0.18)',
        }}
      >
        {label}
      </td>
      {values.map((v, i) => {
        const p = paletteFor(i);
        const isBest = isMargin && i === bestIdx && marginPercents && marginPercents.some(pp => pp !== 0);
        const colour = isMargin && marginPercents ? gmColor(marginPercents[i]) : (isTotal ? '#1a1410' : '#d97706');
        return (
          <td
            key={i}
            className="px-3 py-2 text-right font-mono"
            style={{
              background: isBest ? 'rgba(245, 158, 11, 0.14)' : p.tint,
              borderBottom: isTotal ? '2px solid rgba(245, 158, 11, 0.3)' : '1px solid rgba(245, 158, 11, 0.12)',
              borderRight: '1px solid rgba(245, 158, 11, 0.10)',
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
    <tr>
      <td
        className="px-3 py-1.5 text-[11px] uppercase tracking-wider sticky left-0 z-[1]"
        style={{
          background: 'rgba(99,102,241,0.06)',
          color: 'rgba(67,56,202,0.85)',
          fontWeight: 600,
          width: ROW_LABEL_WIDTH,
          minWidth: ROW_LABEL_WIDTH,
          borderBottom: '1px solid rgba(99,102,241,0.18)',
          borderRight: '1px solid rgba(99,102,241,0.22)',
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
  productCatalog: Product[];
  onSetProduct: <K extends keyof CostingModelProduct>(key: K, val: CostingModelProduct[K]) => void;
  onSetContainer: <K extends keyof CostingModelContainer>(key: K, val: CostingModelContainer[K]) => void;
  onSetScenario: <K extends keyof CostingScenario>(i: number, key: K, val: CostingScenario[K]) => void;
  onAddScenario: () => void;
  onRemoveScenario: (i: number) => void;
  onProductCatalogSelect: (p: Product) => void;
  onProductCatalogCreate: (input: NewProductInput) => Promise<Product>;
}

// ── Main ──────────────────────────────────────────────────────────────────────

export function MainCostingsTab({
  product, container, scenarios, results, settings, productCatalog,
  onSetProduct, onSetContainer, onSetScenario, onAddScenario, onRemoveScenario,
  onProductCatalogSelect, onProductCatalogCreate,
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

  // Per-column tint + gridlines for the scenario input table
  const colStyle = (i: number): React.CSSProperties => {
    const p = paletteFor(i);
    return {
      minWidth: COL_MIN_WIDTH,
      background: p.tint,
      borderRight: '1px solid rgba(99,102,241,0.15)',
      borderBottom: '1px solid rgba(99,102,241,0.15)',
    };
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4">

      {/* ─── 1. Product Details — BLUE ─── */}
      <Section title="Product Details" icon={<Icon name="package" size={13} />} accent="blue">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Field label="Product Code" filled={product.productCode.trim().length > 0} note={`${productCatalog.length} products in catalog — type to search or create new`}>
            <ProductCombobox
              products={productCatalog}
              value={product.productCode}
              onSelect={onProductCatalogSelect}
              onCreate={onProductCatalogCreate}
              onTextChange={txt => onSetProduct('productCode', txt)}
              placeholder="e.g. C10028A"
            />
          </Field>
          <Field label="Description" filled={product.description.trim().length > 0}>
            <TextInputSm value={product.description} onChange={v => onSetProduct('description', v)} placeholder="e.g. Chicken Spring Rolls 50×60g" />
          </Field>
          <Field label="Meat Content / Category">
            <SelectInputSm value={product.productCategory} onChange={v => onSetProduct('productCategory', v)} options={PRODUCT_CATEGORIES} />
          </Field>
          <Field label="Bags per Case" filled={product.bagsPerCase > 0}>
            <NumInputSm value={product.bagsPerCase} onChange={v => onSetProduct('bagsPerCase', Math.max(0, Math.floor(v)))} step={1} placeholder="50" />
          </Field>
          <Field label="Case Weight (kg)" filled={product.caseWeightKg > 0}>
            <NumInputSm value={product.caseWeightKg} onChange={v => onSetProduct('caseWeightKg', v)} step={0.1} placeholder="10.00" />
          </Field>
          <Field label="Supplier" filled={product.supplier.trim().length > 0}>
            <TextInputSm value={product.supplier} onChange={v => onSetProduct('supplier', v)} placeholder="e.g. Thai Foods Co." />
          </Field>
          <Field label="Price (USD / tonne)" filled={product.priceUSDPerTonne > 0}>
            <NumInputSm value={product.priceUSDPerTonne} onChange={v => onSetProduct('priceUSDPerTonne', v)} prefix="$" placeholder="1500.00" />
          </Field>
        </div>
      </Section>

      {/* ─── 2. Container Details — AMBER ─── */}
      <Section title="Container Details" icon={<Icon name="container" size={13} />} accent="amber">
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
          <Field label="Container Weight (kg)" filled={container.containerWeightKg > 0} note="Used to compute Bao Bun additional duty">
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
              <Field label="Manual Insurance (£/container)" filled={container.insuranceManualGBP > 0}>
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

      {/* ─── 3. Costing Scenarios — colour-coded per column ─── */}
      <Section title={`Costing Scenarios (${scenarios.length}/${MAX_SCENARIOS})`} icon={<Icon name="columns" size={13} />} accent="violet">
        <div className="overflow-x-auto" style={{ borderRadius: 12, border: '1px solid rgba(99,102,241,0.22)' }}>
          <table className="w-full text-xs" style={{ minWidth: ROW_LABEL_WIDTH + COL_MIN_WIDTH * scenarios.length, borderCollapse: 'separate', borderSpacing: 0 }}>
            <thead>
              <tr>
                <th
                  className="px-3 py-2 text-[11px] uppercase tracking-widest text-left sticky left-0 z-[2]"
                  style={{
                    background: 'rgba(99,102,241,0.10)',
                    color: '#3730a3',
                    width: ROW_LABEL_WIDTH, minWidth: ROW_LABEL_WIDTH,
                    fontWeight: 700,
                    borderRight: '1px solid rgba(99,102,241,0.22)',
                    borderBottom: '1px solid rgba(99,102,241,0.22)',
                  }}
                >
                  Field
                </th>
                {scenarios.map((s, i) => {
                  const p = paletteFor(i);
                  return (
                    <th
                      key={i}
                      className="px-2 py-2 text-left"
                      style={{
                        background: `linear-gradient(135deg, ${p.headerFrom}, ${p.headerTo})`,
                        borderRight: '1px solid rgba(0,0,0,0.08)',
                        borderBottom: `2px solid ${p.headerTo}`,
                        minWidth: COL_MIN_WIDTH,
                      }}
                    >
                      <div className="flex items-center gap-1">
                        <input
                          type="text"
                          value={s.label}
                          onChange={e => onSetScenario(i, 'label', e.target.value)}
                          className="flex-1 min-w-0 px-2 py-1 text-xs font-bold focus:outline-none"
                          style={{ background: 'rgba(255,255,255,0.95)', border: '1px solid rgba(255,255,255,0.5)', borderRadius: 6, color: p.headerText }}
                        />
                        {scenarios.length > 1 && (
                          <button
                            onClick={() => onRemoveScenario(i)}
                            className="p-1 rounded transition-colors"
                            style={{ color: 'rgba(255,255,255,0.75)' }}
                            onMouseEnter={e => (e.currentTarget.style.color = '#fff')}
                            onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.75)')}
                            title="Remove scenario"
                          >
                            <Icon name="trash" size={11} />
                          </button>
                        )}
                      </div>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              <ScenarioRow label="Sales Currency">
                {scenarios.map((s, i) => (
                  <td key={i} className="px-2 py-1.5" style={colStyle(i)}>
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
                  <td key={i} className="px-2 py-1.5" style={colStyle(i)}>
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
                  <td key={i} className="px-2 py-1.5" style={colStyle(i)}>
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
                  <td key={i} className="px-2 py-1.5" style={colStyle(i)}>
                    <NumInputSm value={s.exchangeRateUSDGBP} onChange={v => onSetScenario(i, 'exchangeRateUSDGBP', v)} step={0.001} placeholder="1.27" />
                  </td>
                ))}
              </ScenarioRow>
              <ScenarioRow label="Cases / Container">
                {scenarios.map((s, i) => (
                  <td key={i} className="px-2 py-1.5" style={colStyle(i)}>
                    <NumInputSm value={s.casesPerContainer} onChange={v => onSetScenario(i, 'casesPerContainer', Math.max(0, Math.floor(v)))} step={1} placeholder="1500" />
                  </td>
                ))}
              </ScenarioRow>
              <ScenarioRow label="Incoterms">
                {scenarios.map((s, i) => (
                  <td key={i} className="px-2 py-1.5" style={colStyle(i)}>
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
                  <td key={i} className="px-2 py-1.5" style={colStyle(i)}>
                    <NumInputSm value={s.freightCostUSD} onChange={v => onSetScenario(i, 'freightCostUSD', v)} prefix="$" step={50} placeholder="3500" />
                  </td>
                ))}
              </ScenarioRow>
              <ScenarioRow label="Customs Agent / Port">
                {scenarios.map((s, i) => (
                  <td key={i} className="px-2 py-1.5" style={colStyle(i)}>
                    <SelectInputSm value={s.agentPort} onChange={v => onSetScenario(i, 'agentPort', v)} options={agentOptions} />
                  </td>
                ))}
              </ScenarioRow>
              <ScenarioRow label="Transport £/Container">
                {scenarios.map((s, i) => (
                  <td key={i} className="px-2 py-1.5" style={colStyle(i)}>
                    <NumInputSm value={s.transportCostGBP} onChange={v => onSetScenario(i, 'transportCostGBP', v)} prefix="£" step={10} placeholder="550" />
                  </td>
                ))}
              </ScenarioRow>
              <ScenarioRow label="Licence Cost £/kg">
                {scenarios.map((s, i) => (
                  <td key={i} className="px-2 py-1.5" style={colStyle(i)}>
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
              background: 'rgba(168, 85, 247, 0.10)',
              color: '#6d28d9',
              border: '1px solid rgba(168, 85, 247, 0.25)',
            }}
            onMouseEnter={e => (e.currentTarget.style.background = 'rgba(168, 85, 247, 0.18)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'rgba(168, 85, 247, 0.10)')}
          >
            <Icon name="plus" size={12} /> Add scenario
          </button>
        )}
      </Section>

      {/* ─── 4. Summary — colour-coded per column ─── */}
      <Section title="Summary" icon={<Icon name="trophy" size={13} />} accent="green">
        <div className="overflow-x-auto" style={{ borderRadius: 12, border: '1px solid rgba(245, 158, 11, 0.22)' }}>
          <table className="w-full text-xs" style={{ minWidth: ROW_LABEL_WIDTH + COL_MIN_WIDTH * scenarios.length, borderCollapse: 'separate', borderSpacing: 0 }}>
            <thead>
              <tr>
                <th
                  className="px-3 py-2 text-[11px] uppercase tracking-widest text-left sticky left-0 z-[2]"
                  style={{
                    background: 'rgba(245, 158, 11, 0.12)',
                    color: '#1a1410',
                    width: ROW_LABEL_WIDTH, minWidth: ROW_LABEL_WIDTH,
                    fontWeight: 700,
                    borderRight: '1px solid rgba(245, 158, 11, 0.22)',
                    borderBottom: '2px solid rgba(245, 158, 11, 0.25)',
                  }}
                >
                  Costing Scenario
                </th>
                {scenarios.map((s, i) => {
                  const p = paletteFor(i);
                  return (
                    <th
                      key={i}
                      className="px-3 py-2 text-right text-xs"
                      style={{
                        background: `linear-gradient(135deg, ${p.headerFrom}, ${p.headerTo})`,
                        borderRight: '1px solid rgba(0,0,0,0.08)',
                        borderBottom: `2px solid ${p.headerTo}`,
                        color: '#fff',
                        minWidth: COL_MIN_WIDTH,
                        fontWeight: 800,
                      }}
                    >
                      <div className="flex items-center justify-end gap-1.5">
                        {i === bestIdx && results[i].gmPercent > 0 && <Icon name="trophy" size={10} style={{ color: '#fde68a' }} />}
                        {s.label}
                      </div>
                    </th>
                  );
                })}
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

        {/* GM headline cards beneath the table — colour-coded per scenario */}
        <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${Math.min(scenarios.length, 5)}, minmax(0, 1fr))` }}>
          {results.map((r, i) => {
            const p = paletteFor(i);
            const gc = gmColor(r.gmPercent);
            const isBest = i === bestIdx && r.gmPercent > 0;
            return (
              <div
                key={i}
                className="p-3 rounded-xl"
                style={{
                  background: p.tint,
                  border: `1.5px solid ${isBest ? 'rgba(245, 158, 11, 0.55)' : p.border}`,
                  boxShadow: isBest ? '0 0 0 1px rgba(245, 158, 11, 0.25)' : 'none',
                }}
              >
                <div className="flex items-center justify-between">
                  <span
                    className="px-2 py-0.5 rounded-full text-[10px] uppercase tracking-wider"
                    style={{ background: p.chip, color: p.headerText, fontWeight: 700 }}
                  >
                    {scenarios[i]?.label ?? `Scenario ${i + 1}`}
                  </span>
                  {isBest && <Icon name="trophy" size={11} style={{ color: '#ca8a04' }} />}
                </div>
                <div className="flex items-center gap-1.5 mt-2">
                  {r.gmPercent >= 0
                    ? <Icon name="trendingup" size={13} style={{ color: gc }} />
                    : <Icon name="trendingdown" size={13} style={{ color: gc }} />}
                  <span className="text-xl font-black" style={{ color: gc }}>{r.gmPercent.toFixed(1)}%</span>
                </div>
                <p className="font-mono text-[10px] mt-1" style={{ color: 'rgba(90, 74, 61, 0.6)' }}>
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
