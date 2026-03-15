import { useState, useMemo, useCallback } from 'react';
import { Save, Trash2, FolderOpen, ChevronDown, ChevronUp, RotateCcw } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { CostingInputs, TradeRoute, ContainerSize, Incoterm, PurchaseCurrency } from '../types/costing';
import { TRADE_ROUTES } from '../data/cnCodes';
import { computeCosting } from '../utils/costingCalc';
import { saveCostingCalculation, fetchCostingCalculations, deleteCostingCalculation } from '../lib/costings';
import { CNCodePanel } from '../components/costings/CNCodePanel';
import { CostingResults } from '../components/costings/CostingResults';
import type { SavedCosting } from '../types/costing';

const DEFAULT_INPUTS: CostingInputs = {
  name: '',
  tradeRoute: 'china-uk',
  product: {
    purchasePricePerUnit: 0,
    purchaseCurrency: 'USD',
    exchangeRateToGBP: 1.27,
    unitsPerContainer: 1000,
    numberOfContainers: 1,
    packingCostPerUnit: 0,
    inlandHaulageOrigin: 0,
  },
  freight: {
    incoterm: 'FOB',
    containerSize: '40ft',
    oceanFreightUSD: 2500,
    usdToGBP: 1.27,
    originForwarderFee: 150,
    exportCustomsFee: 100,
    bafSurcharge: 300,
    cafSurcharge: 200,
    pssSurcharge: 250,
    otherSurcharges: 0,
    enableBAF: true,
    enableCAF: false,
    enablePSS: false,
  },
  clearance: {
    cnCode: '',
    dutyRatePercent: 0,
    antiDumpingDutyPercent: 0,
    vatRatePercent: 20,
    vatRegistered: true,
    brokerFee: 250,
    examinationFee: 0,
    portHealthFee: 0,
    customsEntryFee: 85,
  },
  domestic: {
    portToWarehouseHaulage: 450,
    devannningLabour: 150,
    warehousingPerWeek: 0,
    warehousWeeks: 0,
    labellingPerUnit: 0,
    deliveryToCustomer: 0,
  },
  insurance: {
    cargoInsuranceRatePercent: 0.3,
    bankCharges: 0,
    financingDays: 0,
    financingRatePercent: 5,
    miscBufferPercent: 1,
  },
  targetSellingPricePerUnit: 0,
};

interface SectionProps {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}

function Section({ title, subtitle, children, defaultOpen = true }: SectionProps) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border-2 border-slate-700 bg-slate-900" style={{ boxShadow: '3px 3px 0px #0f172a' }}>
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-4 py-3 bg-slate-800 border-b-2 border-slate-700 hover:bg-slate-750 transition-colors"
      >
        <div className="text-left">
          <h3 className="font-black text-xs uppercase tracking-widest text-white">{title}</h3>
          {subtitle && <p className="font-mono text-[10px] text-slate-400 mt-0.5">{subtitle}</p>}
        </div>
        {open ? <ChevronUp size={14} className="text-slate-400" strokeWidth={2.5} /> : <ChevronDown size={14} className="text-slate-400" strokeWidth={2.5} />}
      </button>
      {open && <div className="p-4 space-y-3">{children}</div>}
    </div>
  );
}

interface FieldProps {
  label: string;
  note?: string;
  children: React.ReactNode;
}

function Field({ label, note, children }: FieldProps) {
  return (
    <div>
      <label className="block font-mono text-[10px] uppercase tracking-widest text-slate-400 mb-1">{label}</label>
      {children}
      {note && <p className="font-mono text-[10px] text-slate-500 mt-1">{note}</p>}
    </div>
  );
}

function NumInput({
  value,
  onChange,
  min = 0,
  step = 0.01,
  prefix,
  suffix,
  placeholder = '0.00',
}: {
  value: number;
  onChange: (v: number) => void;
  min?: number;
  step?: number;
  prefix?: string;
  suffix?: string;
  placeholder?: string;
}) {
  return (
    <div className="flex items-center border-2 border-slate-600 bg-slate-800 focus-within:border-sky-500 transition-colors">
      {prefix && <span className="px-2.5 font-mono text-xs text-slate-400 border-r border-slate-600 select-none">{prefix}</span>}
      <input
        type="number"
        value={value || ''}
        onChange={e => onChange(parseFloat(e.target.value) || 0)}
        min={min}
        step={step}
        placeholder={placeholder}
        className="flex-1 px-3 py-2.5 bg-transparent text-white text-sm font-mono focus:outline-none"
      />
      {suffix && <span className="px-2.5 font-mono text-xs text-slate-400 border-l border-slate-600 select-none">{suffix}</span>}
    </div>
  );
}

function Select<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string }[];
}) {
  return (
    <select
      value={value}
      onChange={e => onChange(e.target.value as T)}
      className="w-full px-3 py-2.5 bg-slate-800 border-2 border-slate-600 text-white text-sm font-mono focus:border-sky-500 focus:outline-none transition-colors appearance-none"
    >
      {options.map(o => (
        <option key={o.value} value={o.value}>{o.label}</option>
      ))}
    </select>
  );
}

export function CostingsPage() {
  const { user } = useAuth();
  const [inputs, setInputs] = useState<CostingInputs>(DEFAULT_INPUTS);
  const [savedList, setSavedList] = useState<SavedCosting[]>([]);
  const [currentId, setCurrentId] = useState<string | null>(null);
  const [showSaved, setShowSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loadingList, setLoadingList] = useState(false);
  const [saveName, setSaveName] = useState('');

  const results = useMemo(() => computeCosting(inputs), [inputs]);
  const tradeRoute = TRADE_ROUTES.find(r => r.id === inputs.tradeRoute)!;
  const isChina = inputs.tradeRoute.startsWith('china');

  const setProduct = useCallback((patch: Partial<typeof inputs.product>) => {
    setInputs(prev => ({ ...prev, product: { ...prev.product, ...patch } }));
  }, []);
  const setFreight = useCallback((patch: Partial<typeof inputs.freight>) => {
    setInputs(prev => ({ ...prev, freight: { ...prev.freight, ...patch } }));
  }, []);
  const setClearance = useCallback((patch: Partial<typeof inputs.clearance>) => {
    setInputs(prev => ({ ...prev, clearance: { ...prev.clearance, ...patch } }));
  }, []);
  const setDomestic = useCallback((patch: Partial<typeof inputs.domestic>) => {
    setInputs(prev => ({ ...prev, domestic: { ...prev.domestic, ...patch } }));
  }, []);
  const setInsurance = useCallback((patch: Partial<typeof inputs.insurance>) => {
    setInputs(prev => ({ ...prev, insurance: { ...prev.insurance, ...patch } }));
  }, []);

  async function loadSavedList() {
    if (!user) return;
    setLoadingList(true);
    try {
      const list = await fetchCostingCalculations(user.id);
      setSavedList(list);
    } catch {
    } finally {
      setLoadingList(false);
    }
  }

  async function handleSave() {
    if (!user || !saveName.trim()) return;
    setSaving(true);
    try {
      const saved = await saveCostingCalculation(
        user.id,
        saveName.trim(),
        inputs.tradeRoute,
        inputs,
        results,
        currentId ?? undefined
      );
      if (saved) {
        setCurrentId(saved.id);
        setSavedList(prev => {
          const idx = prev.findIndex(s => s.id === saved.id);
          if (idx >= 0) {
            const next = [...prev];
            next[idx] = saved;
            return next;
          }
          return [saved, ...prev];
        });
      }
    } catch {
    } finally {
      setSaving(false);
    }
  }

  function loadCosting(saved: SavedCosting) {
    setInputs(saved.inputs);
    setCurrentId(saved.id);
    setSaveName(saved.name);
    setShowSaved(false);
  }

  async function handleDelete(id: string) {
    try {
      await deleteCostingCalculation(id);
      setSavedList(prev => prev.filter(s => s.id !== id));
      if (currentId === id) {
        setCurrentId(null);
      }
    } catch {
    }
  }

  function handleReset() {
    setInputs(DEFAULT_INPUTS);
    setCurrentId(null);
    setSaveName('');
  }

  const currencySymbols: Record<PurchaseCurrency, string> = {
    CNY: '¥', THB: '฿', USD: '$', EUR: '€', GBP: '£',
  };

  return (
    <div className="flex flex-col h-full overflow-hidden bg-slate-950">
      <div className="shrink-0 px-4 py-3 bg-slate-900 border-b-2 border-slate-800 flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h2 className="font-black text-sm uppercase tracking-widest text-white">Import Costing Calculator</h2>
          <p className="font-mono text-[10px] text-slate-400 mt-0.5">
            Asia → UK/EU · All costs in GBP
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => { setShowSaved(o => !o); if (!showSaved) loadSavedList(); }}
            className="flex items-center gap-1.5 px-3 py-2 border-2 border-slate-600 text-slate-300 hover:border-sky-500 hover:text-white transition-all text-xs font-black uppercase tracking-wider"
            style={{ background: 'rgba(255,255,255,0.04)' }}
          >
            <FolderOpen size={12} strokeWidth={2.5} />
            Saved
          </button>
          <button
            onClick={handleReset}
            className="flex items-center gap-1.5 px-3 py-2 border-2 border-slate-600 text-slate-300 hover:border-slate-400 hover:text-white transition-all text-xs font-black uppercase tracking-wider"
            style={{ background: 'rgba(255,255,255,0.04)' }}
          >
            <RotateCcw size={12} strokeWidth={2.5} />
            Reset
          </button>
          <input
            type="text"
            value={saveName}
            onChange={e => setSaveName(e.target.value)}
            placeholder="Calculation name..."
            className="px-3 py-2 bg-slate-800 border-2 border-slate-600 text-white text-xs font-mono focus:border-sky-500 focus:outline-none transition-colors w-44"
          />
          <button
            onClick={handleSave}
            disabled={saving || !saveName.trim()}
            className="flex items-center gap-1.5 px-3 py-2 border-2 border-sky-600 bg-sky-600 text-white hover:bg-sky-500 hover:border-sky-500 transition-all text-xs font-black uppercase tracking-wider disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Save size={12} strokeWidth={2.5} />
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>

      {showSaved && (
        <div className="shrink-0 border-b-2 border-slate-800 bg-slate-900 px-4 py-3 max-h-56 overflow-y-auto">
          {loadingList ? (
            <p className="font-mono text-xs text-slate-400">Loading...</p>
          ) : savedList.length === 0 ? (
            <p className="font-mono text-xs text-slate-400">No saved calculations yet.</p>
          ) : (
            <div className="space-y-1">
              {savedList.map(s => (
                <div key={s.id} className="flex items-center justify-between gap-2 px-3 py-2 bg-slate-800 border border-slate-700 hover:border-sky-600 transition-colors group">
                  <button onClick={() => loadCosting(s)} className="flex-1 text-left">
                    <span className="text-sm text-white font-bold">{s.name}</span>
                    <span className="ml-3 font-mono text-[10px] text-slate-400">
                      {TRADE_ROUTES.find(r => r.id === s.trade_route)?.label}
                    </span>
                    <span className="ml-3 font-mono text-[10px] text-slate-500">
                      {new Date(s.updated_at).toLocaleDateString('en-GB')}
                    </span>
                  </button>
                  <button
                    onClick={() => handleDelete(s.id)}
                    className="p-1.5 text-slate-600 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"
                  >
                    <Trash2 size={12} strokeWidth={2.5} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="flex-1 overflow-y-auto">
        <div className="grid grid-cols-1 xl:grid-cols-[1fr_380px] gap-0 min-h-full">
          <div className="p-4 space-y-4 overflow-y-auto border-r border-slate-800">

            <Section title="A — Trade Route & Product Cost" subtitle="Origin, currency & unit economics">
              <Field label="Trade Route">
                <Select<TradeRoute>
                  value={inputs.tradeRoute}
                  onChange={v => setInputs(prev => ({
                    ...prev,
                    tradeRoute: v,
                    clearance: {
                      ...prev.clearance,
                      vatRatePercent: TRADE_ROUTES.find(r => r.id === v)?.defaultVAT ?? 20,
                    },
                  }))}
                  options={TRADE_ROUTES.map(r => ({ value: r.id, label: r.label }))}
                />
              </Field>

              <div className="grid grid-cols-2 gap-3">
                <Field label="Purchase Price / Unit" note="Ex-works or FOB unit cost">
                  <NumInput
                    value={inputs.product.purchasePricePerUnit}
                    onChange={v => setProduct({ purchasePricePerUnit: v })}
                    prefix={currencySymbols[inputs.product.purchaseCurrency]}
                  />
                </Field>
                <Field label="Purchase Currency">
                  <Select<PurchaseCurrency>
                    value={inputs.product.purchaseCurrency}
                    onChange={v => setProduct({ purchaseCurrency: v })}
                    options={[
                      { value: 'CNY', label: 'CNY — Chinese Yuan' },
                      { value: 'THB', label: 'THB — Thai Baht' },
                      { value: 'USD', label: 'USD — US Dollar' },
                      { value: 'EUR', label: 'EUR — Euro' },
                      { value: 'GBP', label: 'GBP — British Pound' },
                    ]}
                  />
                </Field>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Field label={`Exchange Rate (${inputs.product.purchaseCurrency} → GBP)`} note="How many units of your currency equal 1 GBP">
                  <NumInput
                    value={inputs.product.exchangeRateToGBP}
                    onChange={v => setProduct({ exchangeRateToGBP: v })}
                    min={0.01}
                    step={0.0001}
                    placeholder="e.g. 1.27"
                  />
                </Field>
                <Field label="Number of Containers">
                  <NumInput
                    value={inputs.product.numberOfContainers}
                    onChange={v => setProduct({ numberOfContainers: Math.max(1, Math.floor(v)) })}
                    min={1}
                    step={1}
                    placeholder="1"
                  />
                </Field>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Field label="Units per Container">
                  <NumInput
                    value={inputs.product.unitsPerContainer}
                    onChange={v => setProduct({ unitsPerContainer: Math.max(1, Math.floor(v)) })}
                    min={1}
                    step={1}
                    placeholder="1000"
                  />
                </Field>
                <Field label="Packing Cost / Unit" note="Carton, packing material">
                  <NumInput
                    value={inputs.product.packingCostPerUnit}
                    onChange={v => setProduct({ packingCostPerUnit: v })}
                    prefix={currencySymbols[inputs.product.purchaseCurrency]}
                  />
                </Field>
              </div>

              <Field label="Inland Haulage to Port of Origin (£/container)" note="Factory to origin port">
                <NumInput
                  value={inputs.product.inlandHaulageOrigin}
                  onChange={v => setProduct({ inlandHaulageOrigin: v })}
                  prefix="£"
                />
              </Field>
            </Section>

            <Section title="B — CN Code & Import Licence" subtitle="Commodity classification, duty rates & compliance">
              <CNCodePanel
                cnCode={inputs.clearance.cnCode}
                dutyRate={inputs.clearance.dutyRatePercent}
                antiDumpingRate={inputs.clearance.antiDumpingDutyPercent}
                isChina={isChina}
                onCNCodeChange={v => setClearance({ cnCode: v })}
                onDutyRateChange={v => setClearance({ dutyRatePercent: v })}
                onAntiDumpingChange={v => setClearance({ antiDumpingDutyPercent: v })}
                destCode={tradeRoute.destCode}
              />
            </Section>

            <Section title="C — Freight & Origin Charges" subtitle="Ocean freight, surcharges & incoterms">
              <div className="grid grid-cols-2 gap-3">
                <Field label="Incoterm">
                  <Select<Incoterm>
                    value={inputs.freight.incoterm}
                    onChange={v => setFreight({ incoterm: v })}
                    options={[
                      { value: 'EXW', label: 'EXW — Ex Works' },
                      { value: 'FOB', label: 'FOB — Free On Board' },
                      { value: 'CFR', label: 'CFR — Cost & Freight' },
                      { value: 'CIF', label: 'CIF — Cost, Insurance & Freight' },
                      { value: 'DDP', label: 'DDP — Delivered Duty Paid' },
                    ]}
                  />
                </Field>
                <Field label="Container Size">
                  <Select<ContainerSize>
                    value={inputs.freight.containerSize}
                    onChange={v => setFreight({ containerSize: v })}
                    options={[
                      { value: '20ft', label: "20ft Standard" },
                      { value: '40ft', label: "40ft Standard" },
                      { value: '40ft-hc', label: "40ft High Cube" },
                    ]}
                  />
                </Field>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Field label="Ocean Freight (USD/container)" note="FCL rate from carrier or forwarder">
                  <NumInput
                    value={inputs.freight.oceanFreightUSD}
                    onChange={v => setFreight({ oceanFreightUSD: v })}
                    prefix="$"
                    placeholder="2500"
                  />
                </Field>
                <Field label="USD → GBP Exchange Rate">
                  <NumInput
                    value={inputs.freight.usdToGBP}
                    onChange={v => setFreight({ usdToGBP: v })}
                    min={0.01}
                    step={0.0001}
                    placeholder="1.27"
                  />
                </Field>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Field label="Origin Forwarder Fee (£/container)">
                  <NumInput
                    value={inputs.freight.originForwarderFee}
                    onChange={v => setFreight({ originForwarderFee: v })}
                    prefix="£"
                  />
                </Field>
                <Field label="Export Customs Fee (£/container)">
                  <NumInput
                    value={inputs.freight.exportCustomsFee}
                    onChange={v => setFreight({ exportCustomsFee: v })}
                    prefix="£"
                  />
                </Field>
              </div>

              <div className="border border-slate-700 p-3 space-y-2">
                <p className="font-mono text-[10px] uppercase tracking-widest text-slate-400">Surcharges (per container)</p>
                <div className="grid grid-cols-1 gap-2">
                  {[
                    { key: 'enableBAF', amtKey: 'bafSurcharge', label: 'BAF — Bunker Adjustment Factor' },
                    { key: 'enableCAF', amtKey: 'cafSurcharge', label: 'CAF — Currency Adjustment Factor' },
                    { key: 'enablePSS', amtKey: 'pssSurcharge', label: 'PSS — Peak Season Surcharge' },
                  ].map(({ key, amtKey, label }) => (
                    <div key={key} className="flex items-center gap-3">
                      <label className="flex items-center gap-2 cursor-pointer shrink-0">
                        <input
                          type="checkbox"
                          checked={inputs.freight[key as keyof typeof inputs.freight] as boolean}
                          onChange={e => setFreight({ [key]: e.target.checked })}
                          className="w-3.5 h-3.5 accent-sky-500"
                        />
                        <span className="font-mono text-[10px] text-slate-300 w-52">{label}</span>
                      </label>
                      <div className="flex-1">
                        <NumInput
                          value={inputs.freight[amtKey as keyof typeof inputs.freight] as number}
                          onChange={v => setFreight({ [amtKey]: v })}
                          prefix="£"
                        />
                      </div>
                    </div>
                  ))}
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-[10px] text-slate-300 w-56 shrink-0">Other surcharges (EBS, GRI, etc.)</span>
                    <div className="flex-1">
                      <NumInput
                        value={inputs.freight.otherSurcharges}
                        onChange={v => setFreight({ otherSurcharges: v })}
                        prefix="£"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </Section>

            <Section title="D — Import Clearance & Customs" subtitle="Duties, VAT, broker & port fees">
              <div className="grid grid-cols-2 gap-3">
                <Field label="Customs Duty Rate (%)" note="Set automatically from CN code, or override">
                  <NumInput
                    value={inputs.clearance.dutyRatePercent}
                    onChange={v => setClearance({ dutyRatePercent: v })}
                    suffix="%"
                    step={0.1}
                  />
                </Field>
                {isChina && (
                  <Field label="Anti-Dumping Duty (%)" note="China-specific trade remedy">
                    <NumInput
                      value={inputs.clearance.antiDumpingDutyPercent}
                      onChange={v => setClearance({ antiDumpingDutyPercent: v })}
                      suffix="%"
                      step={0.1}
                    />
                  </Field>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Field label="VAT Rate (%)">
                  <NumInput
                    value={inputs.clearance.vatRatePercent}
                    onChange={v => setClearance({ vatRatePercent: v })}
                    suffix="%"
                    step={0.1}
                  />
                </Field>
                <Field label="VAT Registration">
                  <label className="flex items-center gap-2 px-3 py-2.5 bg-slate-800 border-2 border-slate-600 cursor-pointer hover:border-sky-500 transition-colors">
                    <input
                      type="checkbox"
                      checked={inputs.clearance.vatRegistered}
                      onChange={e => setClearance({ vatRegistered: e.target.checked })}
                      className="w-3.5 h-3.5 accent-sky-500"
                    />
                    <span className="text-sm text-slate-300 font-mono">VAT registered (defer on import)</span>
                  </label>
                </Field>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Field label="Customs Broker Fee (£/container)">
                  <NumInput
                    value={inputs.clearance.brokerFee}
                    onChange={v => setClearance({ brokerFee: v })}
                    prefix="£"
                  />
                </Field>
                <Field label="Customs Entry Fee (£/container)" note="HMRC C88 / SAD entry">
                  <NumInput
                    value={inputs.clearance.customsEntryFee}
                    onChange={v => setClearance({ customsEntryFee: v })}
                    prefix="£"
                  />
                </Field>
                <Field label="Examination / Scanning Fee (£/container)">
                  <NumInput
                    value={inputs.clearance.examinationFee}
                    onChange={v => setClearance({ examinationFee: v })}
                    prefix="£"
                  />
                </Field>
                <Field label="Port Health / Phytosanitary (£/container)" note="Food, plants, animals">
                  <NumInput
                    value={inputs.clearance.portHealthFee}
                    onChange={v => setClearance({ portHealthFee: v })}
                    prefix="£"
                  />
                </Field>
              </div>
            </Section>

            <Section title="E — UK/EU Domestic Costs" subtitle="Port to warehouse, handling & distribution" defaultOpen={false}>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Port to Warehouse Haulage (£/container)">
                  <NumInput
                    value={inputs.domestic.portToWarehouseHaulage}
                    onChange={v => setDomestic({ portToWarehouseHaulage: v })}
                    prefix="£"
                  />
                </Field>
                <Field label="Devanning / Unloading Labour (£/container)">
                  <NumInput
                    value={inputs.domestic.devannningLabour}
                    onChange={v => setDomestic({ devannningLabour: v })}
                    prefix="£"
                  />
                </Field>
                <Field label="Warehousing (£/week/container)">
                  <NumInput
                    value={inputs.domestic.warehousingPerWeek}
                    onChange={v => setDomestic({ warehousingPerWeek: v })}
                    prefix="£"
                  />
                </Field>
                <Field label="Number of Weeks Storage">
                  <NumInput
                    value={inputs.domestic.warehousWeeks}
                    onChange={v => setDomestic({ warehousWeeks: v })}
                    step={1}
                  />
                </Field>
                <Field label="Labelling / Rework Cost (£/unit)">
                  <NumInput
                    value={inputs.domestic.labellingPerUnit}
                    onChange={v => setDomestic({ labellingPerUnit: v })}
                    prefix="£"
                  />
                </Field>
                <Field label="Delivery to Customer (£/container)">
                  <NumInput
                    value={inputs.domestic.deliveryToCustomer}
                    onChange={v => setDomestic({ deliveryToCustomer: v })}
                    prefix="£"
                  />
                </Field>
              </div>
            </Section>

            <Section title="F — Insurance & Financial Overheads" subtitle="Cargo insurance, bank charges & contingency" defaultOpen={false}>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Cargo Insurance Rate (%)" note="Applied to CIF value. Typical: 0.2–0.5%">
                  <NumInput
                    value={inputs.insurance.cargoInsuranceRatePercent}
                    onChange={v => setInsurance({ cargoInsuranceRatePercent: v })}
                    suffix="%"
                    step={0.05}
                  />
                </Field>
                <Field label="Bank Charges / LC Fee (£)">
                  <NumInput
                    value={inputs.insurance.bankCharges}
                    onChange={v => setInsurance({ bankCharges: v })}
                    prefix="£"
                  />
                </Field>
                <Field label="Financing Days" note="Days capital tied up">
                  <NumInput
                    value={inputs.insurance.financingDays}
                    onChange={v => setInsurance({ financingDays: v })}
                    step={1}
                  />
                </Field>
                <Field label="Financing Rate (% per annum)">
                  <NumInput
                    value={inputs.insurance.financingRatePercent}
                    onChange={v => setInsurance({ financingRatePercent: v })}
                    suffix="%"
                    step={0.1}
                  />
                </Field>
                <Field label="Miscellaneous Buffer (%)" note="Applied to total landed cost. Typical: 1–3%">
                  <NumInput
                    value={inputs.insurance.miscBufferPercent}
                    onChange={v => setInsurance({ miscBufferPercent: v })}
                    suffix="%"
                    step={0.5}
                  />
                </Field>
              </div>
            </Section>

          </div>

          <div className="p-4 bg-slate-950 border-t xl:border-t-0 border-slate-800">
            <div className="sticky top-4">
              <CostingResults
                results={results}
                targetSellingPrice={inputs.targetSellingPricePerUnit}
                onTargetSellingPriceChange={v => setInputs(prev => ({ ...prev, targetSellingPricePerUnit: v }))}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
