import { useState, useEffect, useCallback } from 'react';
import { RefreshCw, Save, ChevronDown } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { saveCostingCalculation } from '../lib/costings';

// ─── Lookup tables ────────────────────────────────────────────────────────────

const PORT_CLEARANCE: Record<string, Record<string, number>> = {
  'AGT': { 'Felixstowe': 219.71, 'London Gateway': 219.71 },
  'EWL': { 'London Gateway': 219.71, 'Felixstowe': 110.03 },
  'Thermotraffic': { 'Southampton': 226.74 },
  'Seafrigo': { 'Le Havre': 200 },
  'FAR LOGISTICS': { 'London Gateway': 219.71 },
};

const CN_RATES: Record<string, { fullDuty: number; licence: number }> = {
  '16023230': { fullDuty: 0.179, licence: 0.085 },
  '16023219': { fullDuty: 0.325, licence: 0.109 },
};

const FREIGHT_FORWARDERS = ['AGT', 'EWL', 'Thermotraffic', 'Seafrigo', 'FAR LOGISTICS'];
const PORTS = ['Felixstowe', 'London Gateway', 'Southampton', 'Le Havre'];

// ─── Types ────────────────────────────────────────────────────────────────────

interface ProductInputs {
  supplierCode: string;
  productCode: string;
  description: string;
  meatContentPct: number;
  bagsPerCase: number;
  caseWeightKg: number;
  casesPerContainer: number;
  priceUSDPerTonne: number;
}

interface ContainerInputs {
  clearanceType: 'Full Duty' | 'Licence';
  retail: boolean;
  handball: boolean;
  additionalDuty: number;
  cnCode: string;
}

interface ScenarioInputs {
  label: string;
  currency: 'GBP' | 'EUR';
  eurGbpRate: number;
  usdGbpRate: number;
  salesPricePerCase: number;
  incoterms: 'FOB' | 'CFR';
  freightCostUSD: number;
  freightForwarder: string;
  portArrival: string;
  transportCostGBP: number;
  licenceCostPerKg: number;
}

interface ScenarioResults {
  salesPriceGBP: number;
  containerWeightKg: number;
  productCostGBP: number;
  duty: number;
  freightGBP: number;
  portClearance: number;
  handball: number;
  insurance: number;
  licenceCost: number;
  additions: number;
  transportGBP: number;
  totalCost: number;
  costPerCase: number;
  costPerKg: number;
  gmPercent: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(n: number, dec = 2): string {
  if (!isFinite(n)) return '—';
  return n.toLocaleString('en-GB', { minimumFractionDigits: dec, maximumFractionDigits: dec });
}

function calcScenario(
  product: ProductInputs,
  container: ContainerInputs,
  scenario: ScenarioInputs,
): ScenarioResults {
  const cases = product.casesPerContainer;
  const caseWeight = product.caseWeightKg;
  const containerWeightKg = cases * caseWeight;

  const salesPriceGBP =
    scenario.currency === 'GBP'
      ? scenario.salesPricePerCase
      : scenario.salesPricePerCase / (scenario.eurGbpRate || 1);

  const productCostGBP =
    ((product.priceUSDPerTonne / 1000) * containerWeightKg) / (scenario.usdGbpRate || 1);

  const dutyRate =
    CN_RATES[container.cnCode]?.[
      container.clearanceType === 'Full Duty' ? 'fullDuty' : 'licence'
    ] ?? 0;

  const freightGBP =
    scenario.incoterms === 'FOB'
      ? scenario.freightCostUSD / (scenario.usdGbpRate || 1)
      : 0;

  const duty =
    container.clearanceType === 'Full Duty'
      ? (containerWeightKg / 1000) * dutyRate * 1000
      : (productCostGBP * 1.0006 + freightGBP) * dutyRate;

  const portClearance = PORT_CLEARANCE[scenario.freightForwarder]?.[scenario.portArrival] ?? 0;
  const handballCost = container.handball ? 648.25 : 0;
  const insurance = productCostGBP * 0.0025;
  const licenceCost =
    container.clearanceType === 'Licence'
      ? scenario.licenceCostPerKg * containerWeightKg
      : 0;
  const additions = !container.retail ? 1395 : 0;
  const transportGBP = scenario.transportCostGBP;

  const totalCost =
    productCostGBP +
    duty +
    freightGBP +
    portClearance +
    handballCost +
    insurance +
    licenceCost +
    additions +
    transportGBP;

  const costPerCase = cases > 0 ? totalCost / cases : 0;
  const costPerKg = containerWeightKg > 0 ? totalCost / containerWeightKg : 0;
  const gmPercent = salesPriceGBP > 0 ? ((salesPriceGBP - costPerCase) / salesPriceGBP) * 100 : 0;

  return {
    salesPriceGBP,
    containerWeightKg,
    productCostGBP,
    duty,
    freightGBP,
    portClearance,
    handball: handballCost,
    insurance,
    licenceCost,
    additions,
    transportGBP,
    totalCost,
    costPerCase,
    costPerKg,
    gmPercent,
  };
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function Label({ children }: { children: React.ReactNode }) {
  return (
    <span className="font-mono text-[9px] uppercase tracking-widest text-slate-400 block mb-1">
      {children}
    </span>
  );
}

function Input({
  label,
  value,
  onChange,
  type = 'text',
  step,
  placeholder,
  readOnly,
}: {
  label: string;
  value: string | number;
  onChange?: (v: string) => void;
  type?: string;
  step?: string;
  placeholder?: string;
  readOnly?: boolean;
}) {
  return (
    <div>
      <Label>{label}</Label>
      <input
        type={type}
        value={value}
        readOnly={readOnly}
        onChange={e => onChange?.(e.target.value)}
        placeholder={placeholder}
        step={step}
        className={`w-full px-2.5 py-2 text-xs font-mono bg-slate-800 border border-slate-600 text-white focus:border-sky-500 focus:outline-none transition-colors ${readOnly ? 'opacity-60 cursor-not-allowed' : ''}`}
      />
    </div>
  );
}

function SelectField({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <Label>{label}</Label>
      <div className="relative">
        <select
          value={value}
          onChange={e => onChange(e.target.value)}
          className="w-full appearance-none px-2.5 py-2 text-xs font-mono bg-slate-800 border border-slate-600 text-white focus:border-sky-500 focus:outline-none transition-colors pr-7"
        >
          {options.map(o => (
            <option key={o} value={o}>{o}</option>
          ))}
        </select>
        <ChevronDown size={12} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
      </div>
    </div>
  );
}

function Toggle({
  label,
  value,
  onChange,
}: {
  label: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between">
      <Label>{label}</Label>
      <button
        onClick={() => onChange(!value)}
        className={`flex items-center gap-1 px-3 py-1 text-[10px] font-black uppercase tracking-wider border transition-colors ${
          value
            ? 'bg-emerald-700 border-emerald-500 text-white'
            : 'bg-slate-800 border-slate-600 text-slate-400 hover:border-slate-400'
        }`}
      >
        {value ? 'Yes' : 'No'}
      </button>
    </div>
  );
}

interface GMBadgeProps { gm: number }
function GMBadge({ gm }: GMBadgeProps) {
  const color =
    gm >= 20
      ? 'text-emerald-400 bg-emerald-950 border-emerald-700'
      : gm >= 10
      ? 'text-amber-400 bg-amber-950 border-amber-700'
      : 'text-red-400 bg-red-950 border-red-700';
  return (
    <div className={`text-center p-3 border-2 ${color}`}>
      <div className="font-mono text-[9px] uppercase tracking-widest opacity-70 mb-0.5">GM %</div>
      <div className="font-black text-3xl leading-none">{isFinite(gm) ? gm.toFixed(1) + '%' : '—'}</div>
    </div>
  );
}

interface ResultCardProps {
  label: string;
  results: ScenarioResults;
}
function ResultCard({ label, results: r }: ResultCardProps) {
  const rows: Array<[string, number]> = [
    ['Product Cost', r.productCostGBP],
    ['Duty', r.duty],
    ['Freight', r.freightGBP],
    ['Port Clearance', r.portClearance],
    ['Handball', r.handball],
    ['Insurance', r.insurance],
    ['Licence', r.licenceCost],
    ['Additions', r.additions],
    ['Transport', r.transportGBP],
  ];
  return (
    <div className="bg-slate-800 border border-slate-600 flex flex-col min-w-0">
      <div className="px-3 py-2 bg-slate-700 border-b border-slate-600">
        <p className="font-black text-xs uppercase tracking-wider text-white truncate">{label}</p>
      </div>
      <div className="p-3 space-y-2 flex-1">
        <GMBadge gm={r.gmPercent} />
        <div className="space-y-0.5 mt-2">
          {rows.map(([lbl, val]) => (
            <div key={lbl} className="flex justify-between text-[10px] font-mono py-0.5 border-b border-slate-700 last:border-0">
              <span className="text-slate-400">{lbl}</span>
              <span className="text-white">£{fmt(val)}</span>
            </div>
          ))}
          <div className="flex justify-between text-[11px] font-mono py-1 border-t-2 border-slate-500 mt-1">
            <span className="font-black text-white uppercase">Total</span>
            <span className="font-black text-white">£{fmt(r.totalCost)}</span>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2 pt-1">
          <div className="bg-slate-900 p-2 border border-slate-700 text-center">
            <div className="font-mono text-[8px] uppercase tracking-widest text-slate-400 mb-0.5">Cost/Case</div>
            <div className="font-black text-sm text-white">£{fmt(r.costPerCase)}</div>
          </div>
          <div className="bg-slate-900 p-2 border border-slate-700 text-center">
            <div className="font-mono text-[8px] uppercase tracking-widest text-slate-400 mb-0.5">Cost/KG</div>
            <div className="font-black text-sm text-white">£{fmt(r.costPerKg, 3)}</div>
          </div>
        </div>
        <div className="bg-slate-900 p-2 border border-slate-700 text-center">
          <div className="font-mono text-[8px] uppercase tracking-widest text-slate-400 mb-0.5">Sales Price GBP</div>
          <div className="font-black text-sm text-white">£{fmt(r.salesPriceGBP)}</div>
        </div>
      </div>
    </div>
  );
}

// ─── Default state factories ──────────────────────────────────────────────────

function defaultProduct(): ProductInputs {
  return {
    supplierCode: '',
    productCode: '',
    description: '',
    meatContentPct: 0,
    bagsPerCase: 0,
    caseWeightKg: 0,
    casesPerContainer: 0,
    priceUSDPerTonne: 0,
  };
}

function defaultContainer(): ContainerInputs {
  return {
    clearanceType: 'Full Duty',
    retail: false,
    handball: false,
    additionalDuty: 0,
    cnCode: '16023230',
  };
}

function defaultScenario(index: number, usdGbp = 0.79, eurGbp = 0.86): ScenarioInputs {
  return {
    label: `Scenario ${index + 1}`,
    currency: 'GBP',
    eurGbpRate: eurGbp,
    usdGbpRate: usdGbp,
    salesPricePerCase: 0,
    incoterms: 'FOB',
    freightCostUSD: 0,
    freightForwarder: 'AGT',
    portArrival: 'Felixstowe',
    transportCostGBP: 0,
    licenceCostPerKg: 0.40,
  };
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export function PoultryModelPage() {
  const { user } = useAuth();
  const [product, setProduct] = useState<ProductInputs>(defaultProduct);
  const [container, setContainer] = useState<ContainerInputs>(defaultContainer);
  const [scenarios, setScenarios] = useState<ScenarioInputs[]>(() =>
    Array.from({ length: 5 }, (_, i) => defaultScenario(i)),
  );
  const [ratesLoading, setRatesLoading] = useState(false);
  const [ratesError, setRatesError] = useState('');
  const [saveStatus, setSaveStatus] = useState('');
  const [saveName, setSaveName] = useState('');

  const fetchRates = useCallback(async () => {
    setRatesLoading(true);
    setRatesError('');
    try {
      const res = await fetch('https://api.exchangerate-api.com/v4/latest/USD');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      const usdGbp: number = json.rates?.GBP ?? 0.79;
      // EUR/GBP: how many GBP per 1 EUR = rates.GBP / rates.EUR
      const eurGbp: number =
        json.rates?.EUR ? json.rates.GBP / json.rates.EUR : 0.86;
      setScenarios(prev =>
        prev.map(s => ({ ...s, usdGbpRate: +usdGbp.toFixed(5), eurGbpRate: +eurGbp.toFixed(5) })),
      );
    } catch (e) {
      setRatesError('Could not fetch rates');
    } finally {
      setRatesLoading(false);
    }
  }, []);

  useEffect(() => { fetchRates(); }, [fetchRates]);

  function updateProduct<K extends keyof ProductInputs>(k: K, v: ProductInputs[K]) {
    setProduct(p => ({ ...p, [k]: v }));
  }

  function updateContainer<K extends keyof ContainerInputs>(k: K, v: ContainerInputs[K]) {
    setContainer(c => ({ ...c, [k]: v }));
  }

  function updateScenario<K extends keyof ScenarioInputs>(i: number, k: K, v: ScenarioInputs[K]) {
    setScenarios(prev => prev.map((s, idx) => (idx === i ? { ...s, [k]: v } : s)));
  }

  const dutyRate = CN_RATES[container.cnCode];
  const applicableDuty = dutyRate
    ? container.clearanceType === 'Full Duty'
      ? (dutyRate.fullDuty * 100).toFixed(1) + '%'
      : (dutyRate.licence * 100).toFixed(1) + '%'
    : '—';

  // Compute insurance based on first scenario's product cost as a proxy, or compute per container
  const sampleResults = scenarios.map(s => calcScenario(product, container, s));
  const containerInsurance = sampleResults[0]?.insurance ?? 0;

  async function handleSave() {
    if (!user) return;
    const name = saveName.trim() || `Poultry – ${product.description || 'unnamed'}`;
    setSaveStatus('Saving…');
    try {
      // Package the poultry data into the existing costing schema
      // We store the raw inputs in the `inputs` field as a custom payload
      // and populate a minimal `results` object
      await saveCostingCalculation(
        user.id,
        name,
        'china-uk', // placeholder trade route
        {
          name,
          tradeRoute: 'china-uk',
          product: {
            purchasePricePerUnit: product.priceUSDPerTonne,
            purchaseCurrency: 'USD',
            exchangeRateToGBP: scenarios[0].usdGbpRate,
            unitsPerContainer: product.casesPerContainer,
            numberOfContainers: 1,
            packingCostPerUnit: 0,
            inlandHaulageOrigin: 0,
          },
          freight: {
            incoterm: scenarios[0].incoterms as 'FOB' | 'CFR',
            containerSize: '40ft',
            oceanFreightUSD: scenarios[0].freightCostUSD,
            usdToGBP: scenarios[0].usdGbpRate,
            originForwarderFee: 0,
            exportCustomsFee: 0,
            bafSurcharge: 0,
            cafSurcharge: 0,
            pssSurcharge: 0,
            otherSurcharges: 0,
            enableBAF: false,
            enableCAF: false,
            enablePSS: false,
          },
          clearance: {
            cnCode: container.cnCode,
            dutyRatePercent: (dutyRate?.fullDuty ?? 0) * 100,
            antiDumpingDutyPercent: 0,
            vatRatePercent: 0,
            vatRegistered: false,
            brokerFee: 0,
            examinationFee: 0,
            portHealthFee: 0,
            customsEntryFee: 0,
          },
          domestic: {
            portToWarehouseHaulage: scenarios[0].transportCostGBP,
            devannningLabour: 0,
            warehousingPerWeek: 0,
            warehousWeeks: 0,
            labellingPerUnit: 0,
            deliveryToCustomer: 0,
          },
          insurance: {
            cargoInsuranceRatePercent: 0.25,
            bankCharges: 0,
            financingDays: 0,
            financingRatePercent: 0,
            miscBufferPercent: 0,
          },
          targetSellingPricePerUnit: scenarios[0].salesPricePerCase,
          customFields: [
            // Store extra poultry data in customFields as metadata
            {
              id: 'poultry-data',
              name: JSON.stringify({ product, container, scenarios }),
              basis: 'flat_total' as const,
              value: 0,
              effect: 'cost' as const,
              enabled: false,
            },
          ],
        },
        {
          breakdown: {
            productCostGBP: sampleResults[0].productCostGBP,
            packingCostGBP: 0,
            inlandOriginGBP: 0,
            originForwarderGBP: 0,
            exportCustomsGBP: 0,
            oceanFreightGBP: sampleResults[0].freightGBP,
            surchargesGBP: 0,
            cargoInsuranceGBP: sampleResults[0].insurance,
            cifValueGBP: sampleResults[0].productCostGBP + sampleResults[0].freightGBP,
            customsDutyGBP: sampleResults[0].duty,
            antiDumpingDutyGBP: 0,
            vatGBP: 0,
            brokerFeeGBP: 0,
            examinationFeeGBP: 0,
            portHealthGBP: 0,
            customsEntryGBP: sampleResults[0].portClearance,
            portToWarehouseGBP: sampleResults[0].transportGBP,
            devanningGBP: sampleResults[0].handball,
            warehouseCostGBP: 0,
            labellingCostGBP: 0,
            deliveryCostGBP: 0,
            bankChargesGBP: 0,
            financingCostGBP: 0,
            miscBufferGBP: sampleResults[0].additions,
            customFieldsGBP: 0,
          },
          totalProductCostGBP: sampleResults[0].productCostGBP,
          totalFreightGBP: sampleResults[0].freightGBP,
          totalClearanceGBP: sampleResults[0].duty + sampleResults[0].portClearance,
          totalDomesticGBP: sampleResults[0].transportGBP,
          totalInsuranceOverheadGBP: sampleResults[0].insurance,
          totalLandedCostGBP: sampleResults[0].totalCost,
          landedCostPerUnitGBP: sampleResults[0].costPerCase,
          cifValueGBP: sampleResults[0].productCostGBP + sampleResults[0].freightGBP,
          dutyAndTaxTotalGBP: sampleResults[0].duty,
          revenueGBP: sampleResults[0].salesPriceGBP * product.casesPerContainer,
          grossProfitGBP:
            (sampleResults[0].salesPriceGBP - sampleResults[0].costPerCase) *
            product.casesPerContainer,
          grossProfitPerUnitGBP:
            sampleResults[0].salesPriceGBP - sampleResults[0].costPerCase,
          grossMarginPercent: sampleResults[0].gmPercent,
          breakEvenSellingPriceGBP: sampleResults[0].costPerCase,
          roiPercent:
            sampleResults[0].totalCost > 0
              ? ((sampleResults[0].salesPriceGBP * product.casesPerContainer -
                  sampleResults[0].totalCost) /
                  sampleResults[0].totalCost) *
                100
              : 0,
          totalUnits: product.casesPerContainer,
          customFieldResults: [],
          totalCustomCostsGBP: 0,
          totalCustomBenefitsGBP: 0,
        },
      );
      setSaveStatus('Saved ✓');
      setTimeout(() => setSaveStatus(''), 3000);
    } catch (e) {
      setSaveStatus('Save failed');
    }
  }

  return (
    <div className="flex h-full overflow-hidden bg-slate-900 text-white">
      {/* ── Left Panel ──────────────────────────────────────────────────── */}
      <div className="w-72 shrink-0 border-r border-slate-700 flex flex-col overflow-hidden">
        <div className="px-4 py-3 bg-slate-800 border-b border-slate-700 flex items-center justify-between shrink-0">
          <div>
            <h2 className="font-black text-xs uppercase tracking-widest text-white">Poultry Model</h2>
            <p className="font-mono text-[9px] text-slate-400 mt-0.5">Import Costing Calculator</p>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={fetchRates}
              disabled={ratesLoading}
              className="flex items-center gap-1 px-2 py-1.5 text-[10px] font-black uppercase tracking-wider border border-slate-600 text-slate-300 hover:border-sky-500 hover:text-sky-400 transition-colors bg-slate-800"
              title="Refresh exchange rates"
            >
              <RefreshCw size={11} className={ratesLoading ? 'animate-spin' : ''} />
              FX
            </button>
          </div>
        </div>

        {ratesError && (
          <div className="mx-3 mt-2 px-2 py-1 bg-red-950 border border-red-700 text-red-300 font-mono text-[10px]">
            {ratesError}
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-4 space-y-5">
          {/* Product Inputs */}
          <section>
            <p className="font-mono text-[9px] uppercase tracking-widest text-sky-400 mb-3 border-b border-slate-700 pb-1">
              Product
            </p>
            <div className="space-y-2.5">
              <Input label="Supplier Code" value={product.supplierCode} onChange={v => updateProduct('supplierCode', v)} />
              <Input label="Product Code" value={product.productCode} onChange={v => updateProduct('productCode', v)} />
              <Input label="Description" value={product.description} onChange={v => updateProduct('description', v)} />
              <Input label="Meat Content %" type="number" value={product.meatContentPct || ''} onChange={v => updateProduct('meatContentPct', parseFloat(v) || 0)} step="0.1" />
              <Input label="Bags Per Case" type="number" value={product.bagsPerCase || ''} onChange={v => updateProduct('bagsPerCase', parseFloat(v) || 0)} />
              <Input label="Case Weight kg" type="number" value={product.caseWeightKg || ''} onChange={v => updateProduct('caseWeightKg', parseFloat(v) || 0)} step="0.01" />
              <Input label="Cases Per Container" type="number" value={product.casesPerContainer || ''} onChange={v => updateProduct('casesPerContainer', parseInt(v) || 0)} />
              <Input label="Price USD / Tonne" type="number" value={product.priceUSDPerTonne || ''} onChange={v => updateProduct('priceUSDPerTonne', parseFloat(v) || 0)} step="1" />
            </div>
          </section>

          {/* Container Inputs */}
          <section>
            <p className="font-mono text-[9px] uppercase tracking-widest text-sky-400 mb-3 border-b border-slate-700 pb-1">
              Container
            </p>
            <div className="space-y-2.5">
              <SelectField
                label="CN Code"
                value={container.cnCode}
                options={['16023230', '16023219']}
                onChange={v => updateContainer('cnCode', v)}
              />
              {dutyRate && (
                <div className="flex items-center gap-2 px-2 py-1.5 bg-slate-800 border border-slate-700 text-[10px] font-mono">
                  <span className="text-slate-400">Duty Rate:</span>
                  <span className="text-amber-400 font-bold">{applicableDuty}</span>
                </div>
              )}
              <SelectField
                label="Clearance Type"
                value={container.clearanceType}
                options={['Full Duty', 'Licence']}
                onChange={v => updateContainer('clearanceType', v as 'Full Duty' | 'Licence')}
              />
              <Toggle label="Retail" value={container.retail} onChange={v => updateContainer('retail', v)} />
              <Toggle label="Handball (£648.25)" value={container.handball} onChange={v => updateContainer('handball', v)} />
              <Input
                label="Additional Duty £/100kg"
                type="number"
                value={container.additionalDuty || ''}
                onChange={v => updateContainer('additionalDuty', parseFloat(v) || 0)}
                step="0.01"
              />
              <div>
                <Label>Insurance (auto)</Label>
                <div className="px-2.5 py-2 text-xs font-mono bg-slate-800 border border-slate-700 text-amber-400">
                  £{fmt(containerInsurance)} (0.25% of product cost)
                </div>
              </div>
            </div>
          </section>

          {/* Save */}
          <section>
            <p className="font-mono text-[9px] uppercase tracking-widest text-sky-400 mb-3 border-b border-slate-700 pb-1">
              Save
            </p>
            <div className="space-y-2">
              <Input
                label="Save Name"
                value={saveName}
                onChange={setSaveName}
                placeholder="e.g. Chicken Breast Q3"
              />
              <button
                onClick={handleSave}
                disabled={!user}
                className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-sky-700 hover:bg-sky-600 border border-sky-500 text-white text-xs font-black uppercase tracking-wider transition-colors disabled:opacity-40"
              >
                <Save size={12} />
                Save Calculation
              </button>
              {saveStatus && (
                <p className={`font-mono text-[10px] text-center ${saveStatus.includes('fail') ? 'text-red-400' : 'text-emerald-400'}`}>
                  {saveStatus}
                </p>
              )}
            </div>
          </section>
        </div>
      </div>

      {/* ── Right Panel: Scenarios ───────────────────────────────────────── */}
      <div className="flex-1 overflow-hidden flex flex-col">
        <div className="px-4 py-3 bg-slate-800 border-b border-slate-700 shrink-0">
          <h3 className="font-black text-xs uppercase tracking-widest text-white">5-Scenario Comparison</h3>
          <p className="font-mono text-[9px] text-slate-400 mt-0.5">Configure each scenario below · Results update live</p>
        </div>

        <div className="flex-1 overflow-auto">
          {/* Scenario Inputs Row */}
          <div className="grid grid-cols-5 gap-0 border-b border-slate-700" style={{ minWidth: 900 }}>
            {scenarios.map((s, i) => (
              <div key={i} className={`p-3 space-y-2 ${i < 4 ? 'border-r border-slate-700' : ''}`}>
                <p className="font-mono text-[9px] uppercase tracking-widest text-sky-400 border-b border-slate-700 pb-1">
                  Scenario {i + 1}
                </p>
                <Input label="Label" value={s.label} onChange={v => updateScenario(i, 'label', v)} />

                <div>
                  <Label>Currency</Label>
                  <div className="flex border border-slate-600">
                    {(['GBP', 'EUR'] as const).map(c => (
                      <button
                        key={c}
                        onClick={() => updateScenario(i, 'currency', c)}
                        className={`flex-1 py-1.5 text-[10px] font-black uppercase tracking-wider transition-colors ${
                          s.currency === c
                            ? 'bg-white text-slate-900'
                            : 'bg-slate-800 text-slate-400 hover:text-white'
                        } ${c === 'EUR' ? 'border-l border-slate-600' : ''}`}
                      >
                        {c}
                      </button>
                    ))}
                  </div>
                </div>

                <Input label="USD/GBP Rate" type="number" value={s.usdGbpRate || ''} onChange={v => updateScenario(i, 'usdGbpRate', parseFloat(v) || 0)} step="0.0001" />
                <Input label="EUR/GBP Rate" type="number" value={s.eurGbpRate || ''} onChange={v => updateScenario(i, 'eurGbpRate', parseFloat(v) || 0)} step="0.0001" />
                <Input label="Sales Price / Case" type="number" value={s.salesPricePerCase || ''} onChange={v => updateScenario(i, 'salesPricePerCase', parseFloat(v) || 0)} step="0.01" />

                <div>
                  <Label>Incoterms</Label>
                  <div className="flex border border-slate-600">
                    {(['FOB', 'CFR'] as const).map(inc => (
                      <button
                        key={inc}
                        onClick={() => updateScenario(i, 'incoterms', inc)}
                        className={`flex-1 py-1.5 text-[10px] font-black uppercase tracking-wider transition-colors ${
                          s.incoterms === inc
                            ? 'bg-white text-slate-900'
                            : 'bg-slate-800 text-slate-400 hover:text-white'
                        } ${inc === 'CFR' ? 'border-l border-slate-600' : ''}`}
                      >
                        {inc}
                      </button>
                    ))}
                  </div>
                </div>

                <Input label="Freight Cost $" type="number" value={s.freightCostUSD || ''} onChange={v => updateScenario(i, 'freightCostUSD', parseFloat(v) || 0)} step="1" />

                <SelectField
                  label="Freight Forwarder"
                  value={s.freightForwarder}
                  options={FREIGHT_FORWARDERS}
                  onChange={v => updateScenario(i, 'freightForwarder', v)}
                />
                <SelectField
                  label="Port Arrival"
                  value={s.portArrival}
                  options={PORTS}
                  onChange={v => updateScenario(i, 'portArrival', v)}
                />
                <Input label="Transport Cost £" type="number" value={s.transportCostGBP || ''} onChange={v => updateScenario(i, 'transportCostGBP', parseFloat(v) || 0)} step="1" />
                <Input label="Licence Cost/kg" type="number" value={s.licenceCostPerKg || ''} onChange={v => updateScenario(i, 'licenceCostPerKg', parseFloat(v) || 0)} step="0.01" />

                {/* Port clearance preview */}
                <div>
                  <Label>Port Clearance (auto)</Label>
                  <div className="px-2 py-1.5 text-[10px] font-mono bg-slate-800 border border-slate-700 text-amber-400">
                    £{fmt(PORT_CLEARANCE[s.freightForwarder]?.[s.portArrival] ?? 0)}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Results Row */}
          <div className="grid grid-cols-5 gap-0 p-3" style={{ minWidth: 900 }}>
            {sampleResults.map((r, i) => (
              <div key={i} className={i < 4 ? 'pr-3' : ''}>
                <ResultCard label={scenarios[i].label} results={r} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
