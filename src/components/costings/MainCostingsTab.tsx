import { Package, Truck, Zap, ArrowLeftRight, Shield, TrendingUp, TrendingDown, Check } from 'lucide-react';
import {
  NumInput, TextInput, SelectInput, Field, Section, CostBar, gmColor,
} from './shared';
import { FoodCostingInputs, FoodCostingResult, CostingSettings, AgentPortKey } from '../../types/costing';
import { PRODUCT_CATEGORIES, AGENT_PORT_RATES, INSURANCE_PER_FCL_GBP } from '../../data/costingRates';
import { computeFoodCosting } from '../../utils/costingCalc';

// ── Results panel ─────────────────────────────────────────────────────────────

function ResultsPanel({ inputs, result }: { inputs: FoodCostingInputs; result: FoodCostingResult }) {
  const fmt2 = (v: number) => v.toFixed(2);
  const fmt4 = (v: number) => v.toFixed(4);
  const gc = gmColor(result.gmPercent);

  const bars: { label: string; value: number; color: string }[] = [
    { label: 'Product cost',  value: result.productCostPerCase,   color: '#4f46e5' },
    { label: 'Freight',       value: result.freightPerCase,        color: '#6366f1' },
    { label: 'Duty',          value: result.dutyPerCase,           color: '#f59e0b' },
    { label: 'Port clearance',value: result.portClearancePerCase,  color: '#0891b2' },
    { label: 'Transport',     value: result.transportPerCase,      color: '#8b5cf6' },
    { label: 'Handballing',   value: result.handballingPerCase,    color: '#ec4899' },
    { label: 'Insurance',     value: result.insurancePerCase,      color: '#059669' },
    { label: inputs.addition1Label || 'Addition 1', value: result.addition1PerCase, color: '#14b8a6' },
    { label: inputs.addition2Label || 'Addition 2', value: result.addition2PerCase, color: '#0d9488' },
  ].filter(b => b.value > 0);

  return (
    <div className="space-y-4">
      {/* Key metrics */}
      <div style={{ background: 'linear-gradient(135deg, #4f46e5, #4338ca)', borderRadius: 16, padding: '20px 20px 16px' }}>
        <p className="font-mono text-[9px] uppercase tracking-widest mb-3" style={{ color: 'rgba(255,255,255,0.5)' }}>Cost per case</p>
        <span className="text-4xl font-black text-white">£{fmt2(result.totalCostPerCase)}</span>
        <div className="flex items-center gap-4 mt-3 pt-3" style={{ borderTop: '1px solid rgba(255,255,255,0.12)' }}>
          <div>
            <p className="font-mono text-[9px] uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.45)' }}>Cost / kg</p>
            <p className="font-bold text-sm text-white mt-0.5">£{fmt4(result.costPerKg)}</p>
          </div>
          <div>
            <p className="font-mono text-[9px] uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.45)' }}>Total / container</p>
            <p className="font-bold text-sm text-white mt-0.5">£{result.totalCostPerContainer.toLocaleString('en-GB', { maximumFractionDigits: 2 })}</p>
          </div>
          <div>
            <p className="font-mono text-[9px] uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.45)' }}>Duty rate</p>
            <p className="font-bold text-sm text-white mt-0.5">{result.dutyRateLabel}</p>
          </div>
        </div>
      </div>

      {/* GM card */}
      {inputs.sellingPricePerCase > 0 && (
        <div style={{ background: '#ffffff', border: `1px solid ${gc}30`, borderRadius: 16, padding: '16px 20px', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-mono text-[10px] uppercase tracking-widest mb-1" style={{ color: '#94a3b8' }}>Gross Margin</p>
              <div className="flex items-center gap-2">
                {result.gmPercent >= 0
                  ? <TrendingUp size={16} style={{ color: gc }} />
                  : <TrendingDown size={16} style={{ color: gc }} />}
                <span className="text-3xl font-black" style={{ color: gc }}>{result.gmPercent.toFixed(1)}%</span>
              </div>
            </div>
            <div className="text-right">
              <p className="font-mono text-[10px] uppercase tracking-widest mb-1" style={{ color: '#94a3b8' }}>GP / case</p>
              <p className="font-bold text-lg" style={{ color: gc }}>
                {result.gmGBPPerCase >= 0 ? '+' : ''}£{fmt2(result.gmGBPPerCase)}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Cost breakdown */}
      <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 16, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
        <div className="px-4 py-3" style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
          <p className="font-bold text-[10px] uppercase tracking-widest" style={{ color: '#334155' }}>Cost breakdown / case</p>
        </div>
        <div className="p-4 space-y-2.5">
          {bars.length === 0 ? (
            <p className="font-mono text-[10px] text-center py-4" style={{ color: '#cbd5e1' }}>Enter product details to see breakdown</p>
          ) : (
            bars.map(b => (
              <CostBar key={b.label} label={b.label} value={b.value} total={result.totalCostPerCase} color={b.color} />
            ))
          )}
        </div>
        {bars.length > 0 && (
          <div className="px-4 pb-4 space-y-0.5">
            {[
              { label: 'Product cost',   value: result.productCostPerCase },
              { label: 'Freight',        value: result.freightPerCase },
              { label: 'Duty',           value: result.dutyPerCase },
              { label: 'Port clearance', value: result.portClearancePerCase },
              { label: 'Transport',      value: result.transportPerCase },
              ...(result.handballingPerCase > 0 ? [{ label: 'Handballing', value: result.handballingPerCase }] : []),
              { label: 'Insurance',      value: result.insurancePerCase },
              ...(result.addition1PerCase > 0 ? [{ label: inputs.addition1Label || 'Addition 1', value: result.addition1PerCase }] : []),
              ...(result.addition2PerCase > 0 ? [{ label: inputs.addition2Label || 'Addition 2', value: result.addition2PerCase }] : []),
            ].map(row => (
              <div key={row.label} className="flex items-center justify-between py-1.5" style={{ borderBottom: '1px solid #f1f5f9' }}>
                <span className="font-mono text-[10px]" style={{ color: '#64748b' }}>{row.label}</span>
                <span className="font-mono text-[10px] font-bold" style={{ color: '#1e293b' }}>£{row.value.toFixed(4)}</span>
              </div>
            ))}
            <div className="flex items-center justify-between pt-2 mt-1">
              <span className="font-mono text-[10px] font-bold uppercase tracking-wide" style={{ color: '#334155' }}>Total cost / case</span>
              <span className="font-mono text-sm font-black" style={{ color: '#0f172a' }}>£{fmt2(result.totalCostPerCase)}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Route comparison ──────────────────────────────────────────────────────────

function RouteCompare({
  inputs, routeTransports, settings,
  onSelectRoute, onTransportChange,
}: {
  inputs: FoodCostingInputs;
  routeTransports: Record<AgentPortKey, number>;
  settings: CostingSettings;
  onSelectRoute: (key: AgentPortKey) => void;
  onTransportChange: (key: AgentPortKey, val: number) => void;
}) {
  const agentRates = settings.agentPortRates;
  const keys = Object.keys(agentRates) as AgentPortKey[];

  return (
    <div className="space-y-2">
      <p className="font-mono text-[10px] uppercase tracking-widest" style={{ color: '#94a3b8' }}>
        Compare all routes — enter transport (£/container) then click to select
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {keys.map(key => {
          const info = agentRates[key];
          const portInputs: FoodCostingInputs = { ...inputs, agentPort: key, transportCostGBP: routeTransports[key] ?? 0 };
          const portResult = computeFoodCosting(portInputs, settings);
          const isSelected = inputs.agentPort === key;

          return (
            <div
              key={key}
              style={{
                background: isSelected ? 'rgba(79,70,229,0.05)' : '#ffffff',
                border: isSelected ? '1.5px solid rgba(79,70,229,0.35)' : '1px solid #e2e8f0',
                borderRadius: 12,
                overflow: 'hidden',
              }}
            >
              <div className="px-3 py-2.5" style={{ borderBottom: '1px solid #f1f5f9' }}>
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-bold text-xs truncate" style={{ color: '#0f172a' }}>{info.agent}</p>
                    <p className="font-mono text-[9px] truncate" style={{ color: '#94a3b8' }}>{info.port}</p>
                  </div>
                  {isSelected && (
                    <span className="shrink-0 flex items-center gap-1 px-2 py-0.5 rounded-full font-mono text-[8px] font-bold uppercase"
                      style={{ background: 'rgba(79,70,229,0.1)', color: '#4f46e5', border: '1px solid rgba(79,70,229,0.2)' }}>
                      <Check size={8} /> Active
                    </span>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-1 mt-2 text-[9px] font-mono" style={{ color: '#94a3b8' }}>
                  <span>Health: £{info.healthExamGBP.toFixed(2)}</span>
                  <span>Port: £{info.portChargesGBP.toFixed(2)}</span>
                </div>
              </div>
              <div className="px-3 py-2 flex items-center gap-2">
                <span className="font-mono text-[9px] shrink-0" style={{ color: '#94a3b8' }}>Transport £</span>
                <input
                  type="number" min={0} step={10}
                  value={routeTransports[key] ?? ''}
                  onChange={e => onTransportChange(key, parseFloat(e.target.value) || 0)}
                  className="flex-1 px-2 py-1 text-xs font-mono focus:outline-none rounded-lg min-w-0"
                  style={{ background: '#f8fafc', border: '1px solid #e2e8f0', color: '#0f172a' }}
                />
              </div>
              <div className="px-3 pb-2.5 flex items-center justify-between gap-2">
                <div>
                  <span className="font-mono text-[9px]" style={{ color: '#94a3b8' }}>Total / case: </span>
                  <span className="font-mono text-xs font-black" style={{ color: '#0f172a' }}>£{portResult.totalCostPerCase.toFixed(2)}</span>
                </div>
                {!isSelected && (
                  <button
                    onClick={() => onSelectRoute(key)}
                    className="px-2.5 py-1 text-[9px] font-bold uppercase tracking-wide rounded-full"
                    style={{ background: 'linear-gradient(135deg, #4f46e5, #4338ca)', color: '#fff' }}
                  >
                    Use
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Main costings form ────────────────────────────────────────────────────────

interface Props {
  inputs: FoodCostingInputs;
  result: FoodCostingResult;
  routeTransports: Record<AgentPortKey, number>;
  settings: CostingSettings;
  onSet: <K extends keyof FoodCostingInputs>(key: K, val: FoodCostingInputs[K]) => void;
  onSelectRoute: (key: AgentPortKey) => void;
  onRouteTransportChange: (key: AgentPortKey, val: number) => void;
}

export function MainCostingsTab({
  inputs, result, routeTransports, settings,
  onSet, onSelectRoute, onRouteTransportChange,
}: Props) {
  const agentRates = settings.agentPortRates;
  const agentOptions = (Object.entries(agentRates) as [AgentPortKey, typeof agentRates[AgentPortKey]][])
    .map(([k, v]) => ({ value: k, label: v.label }));

  const insuranceDefault = settings.insurancePerFCL;

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="grid grid-cols-1 xl:grid-cols-[1fr_360px] min-h-full">

        {/* ── Left: form ── */}
        <div className="p-4 space-y-3 xl:overflow-y-auto" style={{ borderRight: '1px solid #e2e8f0' }}>

          <Section title="Product & Rates" icon={<Package size={13} />}>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Product name">
                <TextInput value={inputs.productName} onChange={v => onSet('productName', v)} placeholder="e.g. Chicken Spring Rolls" />
              </Field>
              <Field label="Supplier">
                <TextInput value={inputs.supplier} onChange={v => onSet('supplier', v)} placeholder="e.g. Thai Foods Co." />
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Cost per tonne (USD)" note="Ex-works or FOB cost">
                <NumInput value={inputs.costPerTonneUSD} onChange={v => onSet('costPerTonneUSD', v)} prefix="$" placeholder="1500.00" />
              </Field>
              <Field label="Case weight (kg)" note="Gross weight per case">
                <NumInput value={inputs.caseWeightKg} onChange={v => onSet('caseWeightKg', v)} suffix="kg" step={0.1} placeholder="10.00" />
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Cases per container" note="Number of cases in 1 FCL">
                <NumInput value={inputs.casesPerContainer} onChange={v => onSet('casesPerContainer', Math.max(1, Math.floor(v)))} step={1} placeholder="1000" />
              </Field>
              <Field label="USD → GBP exchange rate">
                <NumInput value={inputs.exchangeRateUSDGBP} onChange={v => onSet('exchangeRateUSDGBP', v)} min={0.01} step={0.001} placeholder="1.270" />
              </Field>
            </div>
          </Section>

          <Section title="Freight" icon={<Truck size={13} />}>
            <Field label="Freight cost per container (USD)" note="Total ocean freight for 1 FCL">
              <NumInput value={inputs.freightCostUSD} onChange={v => onSet('freightCostUSD', v)} prefix="$" placeholder="3500.00" />
            </Field>
            <div className="p-3 rounded-xl" style={{ background: '#f8fafc', border: '1px solid #e2e8f0' }}>
              <p className="font-mono text-[9px] uppercase tracking-widest mb-1.5" style={{ color: '#94a3b8' }}>
                Using rate: $1 = £{(1 / inputs.exchangeRateUSDGBP).toFixed(4)}
              </p>
              <p className="font-mono text-[10px] font-bold" style={{ color: '#1e293b' }}>
                Freight per case: £{inputs.casesPerContainer > 0 && inputs.freightCostUSD > 0
                  ? (inputs.freightCostUSD / inputs.exchangeRateUSDGBP / inputs.casesPerContainer).toFixed(4)
                  : '—'}
              </p>
            </div>
          </Section>

          <Section title="Classification & Duty" icon={<Zap size={13} />}>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Product category" note="Determines duty rate">
                <SelectInput value={inputs.productCategory} onChange={v => onSet('productCategory', v)} options={PRODUCT_CATEGORIES} />
              </Field>
              <Field label="Clearance type">
                <SelectInput
                  value={inputs.clearanceType} onChange={v => onSet('clearanceType', v)}
                  options={[
                    { value: 'licence', label: 'Licence (lower rate)' },
                    { value: 'full_duty', label: 'Full Duty' },
                  ]}
                />
              </Field>
            </div>
            <div className="p-3 rounded-xl" style={{ background: '#f8fafc', border: '1px solid #e2e8f0' }}>
              <p className="font-mono text-[9px] uppercase tracking-widest mb-1" style={{ color: '#94a3b8' }}>Applicable duty rate</p>
              <p className="font-mono text-sm font-black" style={{ color: '#0f172a' }}>{result.dutyRateLabel}</p>
              {inputs.caseWeightKg > 0 && (
                <p className="font-mono text-[10px] mt-0.5" style={{ color: '#64748b' }}>
                  = £{result.dutyPerCase.toFixed(4)}/case at {inputs.caseWeightKg}kg/case
                </p>
              )}
            </div>
          </Section>

          <Section title="Import Route" icon={<ArrowLeftRight size={13} />}>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Customs agent & port">
                <SelectInput
                  value={inputs.agentPort}
                  onChange={v => { onSet('agentPort', v); onSet('transportCostGBP', routeTransports[v] ?? 0); }}
                  options={agentOptions}
                />
              </Field>
              <Field label="Transport: port → warehouse (£/container)">
                <NumInput
                  value={inputs.transportCostGBP}
                  onChange={v => { onSet('transportCostGBP', v); onRouteTransportChange(inputs.agentPort, v); }}
                  prefix="£" placeholder="650.00"
                />
              </Field>
            </div>

            {(() => {
              const info = agentRates[inputs.agentPort];
              return (
                <div className="p-3 rounded-xl" style={{ background: '#f8fafc', border: '1px solid #e2e8f0' }}>
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <p className="font-mono text-[9px] uppercase tracking-widest" style={{ color: '#94a3b8' }}>Health exam</p>
                      <p className="font-mono text-xs font-bold mt-0.5" style={{ color: '#1e293b' }}>£{info.healthExamGBP.toFixed(2)}</p>
                    </div>
                    <div>
                      <p className="font-mono text-[9px] uppercase tracking-widest" style={{ color: '#94a3b8' }}>Port charges</p>
                      <p className="font-mono text-xs font-bold mt-0.5" style={{ color: '#1e293b' }}>£{info.portChargesGBP.toFixed(2)}</p>
                    </div>
                    <div>
                      <p className="font-mono text-[9px] uppercase tracking-widest" style={{ color: '#94a3b8' }}>Total</p>
                      <p className="font-mono text-xs font-bold mt-0.5" style={{ color: '#1e293b' }}>£{(info.healthExamGBP + info.portChargesGBP).toFixed(2)}</p>
                    </div>
                  </div>
                </div>
              );
            })()}

            <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 12, padding: '12px' }}>
              <p className="font-bold text-[10px] uppercase tracking-widest mb-2.5" style={{ color: '#334155' }}>Compare all routes</p>
              <RouteCompare
                inputs={inputs} routeTransports={routeTransports} settings={settings}
                onSelectRoute={onSelectRoute} onTransportChange={onRouteTransportChange}
              />
            </div>
          </Section>

          <Section title="Optional Costs" icon={<Shield size={13} />} defaultOpen={false}>
            <div className="p-3 rounded-xl space-y-2" style={{ background: '#f8fafc', border: '1px solid #e2e8f0' }}>
              <label className="flex items-center gap-2.5 cursor-pointer">
                <input type="checkbox" checked={inputs.handballing} onChange={e => onSet('handballing', e.target.checked)}
                  className="w-3.5 h-3.5" style={{ accentColor: '#4f46e5' }} />
                <span className="font-mono text-xs font-bold" style={{ color: '#334155' }}>Handballing (manual unloading)</span>
              </label>
              {inputs.handballing && (
                <Field label="Handballing cost (£/container)">
                  <NumInput value={inputs.handballingCostGBP} onChange={v => onSet('handballingCostGBP', v)} prefix="£" />
                </Field>
              )}
            </div>

            <div className="p-3 rounded-xl space-y-2" style={{ background: '#f8fafc', border: '1px solid #e2e8f0' }}>
              <p className="font-mono text-[10px] uppercase tracking-widest" style={{ color: '#94a3b8' }}>Insurance</p>
              <label className="flex items-center gap-2.5 cursor-pointer">
                <input type="checkbox" checked={inputs.insuranceAuto} onChange={e => onSet('insuranceAuto', e.target.checked)}
                  className="w-3.5 h-3.5" style={{ accentColor: '#4f46e5' }} />
                <span className="font-mono text-xs" style={{ color: '#334155' }}>
                  Auto: £{insuranceDefault}/FCL flat rate
                </span>
              </label>
              {!inputs.insuranceAuto && (
                <Field label="Manual insurance (£/container)">
                  <NumInput value={inputs.insuranceManualGBP} onChange={v => onSet('insuranceManualGBP', v)} prefix="£" />
                </Field>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Addition 1 label">
                <TextInput value={inputs.addition1Label} onChange={v => onSet('addition1Label', v)} placeholder="e.g. Labelling" />
              </Field>
              <Field label="Addition 1 (£/container)">
                <NumInput value={inputs.addition1GBP} onChange={v => onSet('addition1GBP', v)} prefix="£" />
              </Field>
              <Field label="Addition 2 label">
                <TextInput value={inputs.addition2Label} onChange={v => onSet('addition2Label', v)} placeholder="e.g. Palletising" />
              </Field>
              <Field label="Addition 2 (£/container)">
                <NumInput value={inputs.addition2GBP} onChange={v => onSet('addition2GBP', v)} prefix="£" />
              </Field>
            </div>
          </Section>

          <Section title="Selling Price & Margin" icon={<TrendingUp size={13} />}>
            <Field label="Selling price per case (£)" note="Enter target selling price to calculate gross margin">
              <NumInput value={inputs.sellingPricePerCase} onChange={v => onSet('sellingPricePerCase', v)} prefix="£" placeholder="0.00" />
            </Field>
            {inputs.sellingPricePerCase > 0 && result.totalCostPerCase > 0 && (
              <div className="grid grid-cols-3 gap-2">
                {[
                  { label: 'Cost / case', value: `£${result.totalCostPerCase.toFixed(2)}` },
                  { label: 'GP / case',   value: `${result.gmGBPPerCase >= 0 ? '+' : ''}£${result.gmGBPPerCase.toFixed(2)}` },
                  { label: 'Margin',      value: `${result.gmPercent.toFixed(1)}%` },
                ].map(cell => (
                  <div key={cell.label} className="p-2.5 text-center rounded-xl"
                    style={{ background: 'rgba(79,70,229,0.05)', border: '1px solid rgba(79,70,229,0.12)' }}>
                    <p className="font-mono text-[9px] uppercase tracking-wider" style={{ color: '#94a3b8' }}>{cell.label}</p>
                    <p className="font-mono font-black text-sm mt-1" style={{ color: result.gmPercent >= 0 ? '#0f172a' : '#dc2626' }}>{cell.value}</p>
                  </div>
                ))}
              </div>
            )}
          </Section>
        </div>

        {/* ── Right: results ── */}
        <div className="p-4 xl:overflow-y-auto" style={{ background: 'rgba(238,242,255,0.25)' }}>
          <div className="xl:sticky xl:top-4">
            <ResultsPanel inputs={inputs} result={result} />
          </div>
        </div>

      </div>
    </div>
  );
}
