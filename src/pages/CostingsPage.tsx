import { useState, useMemo, useCallback, useEffect } from 'react';
import { Icon, Spinner } from '../components/Icon';
import { useAuth } from '../contexts/AuthContext';
import {
  CostingSettings,
  CostingModelProduct, CostingModelContainer, CostingScenario, ScenarioSummary,
  CostingModelPayload, CostingModelResults, SavedCosting,
  isCostingModelPayload,
} from '../types/costing';
import {
  ImportControl, ImportControlResults, ImportControlHeader, ImportControlClearance,
  ImportControlCosts, ImportControlProduct, SavedImportControl,
} from '../types/importControl';
import {
  AGENT_PORT_RATES, INSURANCE_PER_FCL_GBP, DUTY_RATES,
  DEFAULT_LICENCE_COST_PER_KG, DEFAULT_TRANSPORT_COSTS,
} from '../data/costingRates';
import { computeCostingModelScenario, computeImportControl } from '../utils/costingCalc';
import { exportCostingPdf } from '../utils/costingPdf';
import { exportImportControlPdf } from '../utils/importControlPdf';
import { Product, NewProductInput } from '../types/product';
import { fetchProducts, createProduct, updateProduct, deleteProduct } from '../lib/products';
import { saveCostingCalculation, fetchCostingCalculations, deleteCostingCalculation } from '../lib/costings';
import { saveImportControl, fetchImportControls, deleteImportControl } from '../lib/importControls';
import { MainCostingsTab } from '../components/costings/MainCostingsTab';
import { NpdCostingsTab } from '../components/costings/NpdCostingsTab';
import { BulkCostingsTab } from '../components/costings/BulkCostingsTab';
import { SettingsTab } from '../components/costings/SettingsTab';
import { ImportControlTab } from '../components/importcontrol/ImportControlTab';
import { ProductsTab } from '../components/products/ProductsTab';

// ── Settings persistence ──────────────────────────────────────────────────────

const SETTINGS_KEY = 'io-costingSettings';

function loadSettings(): CostingSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as CostingSettings;
      return {
        dutyRates: { ...DUTY_RATES, ...parsed.dutyRates },
        agentPortRates: { ...AGENT_PORT_RATES, ...parsed.agentPortRates },
        insurancePerFCL: parsed.insurancePerFCL ?? INSURANCE_PER_FCL_GBP,
      };
    }
  } catch { /* ignore */ }
  return { dutyRates: DUTY_RATES, agentPortRates: AGENT_PORT_RATES, insurancePerFCL: INSURANCE_PER_FCL_GBP };
}

// ── Defaults ──────────────────────────────────────────────────────────────────

const DEFAULT_PRODUCT: CostingModelProduct = {
  productCode: '',
  description: '',
  productCategory: 'meat_lt57',
  bagsPerCase: 0,
  caseWeightKg: 0,
  supplier: '',
  priceUSDPerTonne: 0,
};

const DEFAULT_CONTAINER: CostingModelContainer = {
  clearanceType: 'licence',
  retail: false,
  handball: false,
  containerWeightKg: 0,
  insuranceAuto: true,
  insuranceManualGBP: 0,
};

function makeDefaultScenario(i: number): CostingScenario {
  return {
    label: `Scenario ${i + 1}`,
    salesCurrency: 'GBP',
    eurGbpRate: 1.16,
    salesPricePerCase: 0,
    exchangeRateUSDGBP: 1.27,
    casesPerContainer: 0,
    incoterms: 'FOB',
    freightCostUSD: 0,
    agentPort: 'ewl_london_gateway',
    transportCostGBP: DEFAULT_TRANSPORT_COSTS.ewl_london_gateway,
    licenceCostPerKgGBP: DEFAULT_LICENCE_COST_PER_KG,
  };
}

const DEFAULT_SCENARIOS: CostingScenario[] = Array.from({ length: 5 }, (_, i) => makeDefaultScenario(i));

// Import Control defaults
const DEFAULT_IC_HEADER: ImportControlHeader = {
  containerNumber: '', billOfLading: '', fobAgent: 'AGT',
  loadNumber: '', purchaseOrderNo: '', cleared: false,
  shippingCompany: '', transportCompany: '',
  portOfArrival: 'Felixstowe', bulkPo: '', deliveryTo: '',
  arrivalDate: '', collectionDateFromPort: '',
  containerGrossWeightTonnes: 17, exchangeRateUSDGBP: 1.27,
  discountedCostGBP: 0,
};
const DEFAULT_IC_CLEARANCE: ImportControlClearance = {
  ewlCharges: 0, terminalFees: 0, documentFees: 0, customsClearance: 0,
  freightBlendedAdjustment: 0, freeTimeStorageExtra: 0,
  portExamination: 0, portHealth: 0,
  oceanFreightGBP: 0, oceanFreightUSD: 0,
  loLo: 0, demurrage: 0, vehicleDetention: 0, ukTransport: 0,
};
const DEFAULT_IC_COSTS: ImportControlCosts = {
  dutyFromHMCustoms: 0, handball: 0, packagingCosts: 0,
  insurancePerContainer: 0, thaiDutyOnPackaging: 0, bagWastageGL: 0,
  licenceCost: 0, additionsLC: 0, additions2: 0, commissions: 0,
};
function makeDefaultIcProduct(): ImportControlProduct {
  return {
    productCode: '', productDescription: '',
    caseCount: 0, caseWeight: 0, quantity: 0,
    poCostUSD: 0, productCostUSD: 0, salesPricePerCase: 0,
    catalogContainerFillKg: 0,
  };
}
const DEFAULT_IMPORT_CONTROL: ImportControl = {
  header: DEFAULT_IC_HEADER,
  clearance: DEFAULT_IC_CLEARANCE,
  costs: DEFAULT_IC_COSTS,
  products: [makeDefaultIcProduct()],
};

// ── Tab definition ────────────────────────────────────────────────────────────

type Tab = 'main' | 'npd' | 'bulk' | 'import_control' | 'products' | 'settings';

const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
  { id: 'main',           label: 'Costing Model',   icon: <Icon name="package" size={12} /> },
  { id: 'npd',            label: 'NPD Costings',    icon: <Icon name="barchart" size={12} /> },
  { id: 'bulk',           label: 'Bulk Costings',   icon: <Icon name="layers" size={12} /> },
  { id: 'import_control', label: 'Import Control',  icon: <Icon name="ship" size={12} /> },
  { id: 'products',       label: 'Products',        icon: <Icon name="database" size={12} /> },
  { id: 'settings',       label: 'Workings',        icon: <Icon name="settings" size={12} /> },
];

// ── Saved panel modal ─────────────────────────────────────────────────────────

function SavedPanel({
  list, loading, currentId, onLoad, onDelete, onClose,
}: {
  list: SavedCosting[]; loading: boolean; currentId: string | null;
  onLoad: (s: SavedCosting) => void; onDelete: (id: string) => void; onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(6px)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="w-full max-w-md rounded-2xl overflow-hidden"
        style={{ background: 'rgba(255,255,255,0.92)', border: '1px solid rgba(245, 158, 11, 0.2)', boxShadow: '0 24px 64px rgba(0,0,0,0.2)' }}>
        <div className="flex items-center justify-between px-5 py-4"
          style={{ background: 'linear-gradient(135deg, #1a1410, #d97706)', borderBottom: '1px solid rgba(245, 158, 11, 0.2)' }}>
          <div className="flex items-center gap-2.5">
            <Icon name="folder" size={14} className="text-white/80" />
            <span className="text-sm font-bold uppercase tracking-tight text-white">Saved Calculations</span>
          </div>
          <button onClick={onClose} style={{ color: 'rgba(255,255,255,0.5)' }}
            onMouseEnter={e => (e.currentTarget.style.color = '#fff')}
            onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.5)')}>
            <Icon name="close" size={16} />
          </button>
        </div>
        <div className="p-4 max-h-96 overflow-y-auto" style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(245, 158, 11, 0.2) transparent' }}>
          {loading ? (
            <div className="flex justify-center py-8"><Spinner size={18}  style={{ color: 'rgba(90, 74, 61, 0.3)' }} /></div>
          ) : list.length === 0 ? (
            <div className="text-center py-8">
              <Icon name="package" size={28} className="mx-auto mb-3" style={{ color: 'rgba(90, 74, 61, 0.15)' }} />
              <p className="font-mono text-xs uppercase tracking-widest" style={{ color: 'rgba(90, 74, 61, 0.3)' }}>No saved calculations yet</p>
            </div>
          ) : (
            <div className="space-y-2">
              {list.map(s => {
                const isV2 = isCostingModelPayload(s.inputs);
                const subtitle = isV2
                  ? `${s.inputs.product.productCode || s.inputs.product.description || '—'} · ${s.inputs.scenarios.length} scenarios`
                  : `${s.inputs.productName || '—'}`;
                return (
                  <div key={s.id} className="flex items-center gap-3 px-3 py-2.5 rounded-xl"
                    style={{ background: 'rgba(255,255,255,0.8)', border: s.id === currentId ? '1.5px solid rgba(245, 158, 11, 0.4)' : '1px solid rgba(245, 158, 11, 0.12)' }}>
                    <button className="flex-1 text-left" onClick={() => { onLoad(s); onClose(); }}>
                      <p className="font-bold text-sm" style={{ color: '#1a1410' }}>{s.name}</p>
                      <p className="font-mono text-[10px] mt-0.5" style={{ color: 'rgba(90, 74, 61, 0.45)' }}>
                        {subtitle} · {new Date(s.updated_at).toLocaleDateString('en-GB')}
                        {!isV2 && <span className="ml-1.5 px-1.5 py-0.5 rounded-full" style={{ background: 'rgba(202,138,4,0.15)', color: '#92400e' }}>legacy</span>}
                      </p>
                    </button>
                    <button onClick={() => onDelete(s.id)} className="p-1.5 rounded-full" style={{ color: 'rgba(90, 74, 61, 0.3)' }}
                      onMouseEnter={e => (e.currentTarget.style.color = '#dc2626')}
                      onMouseLeave={e => (e.currentTarget.style.color = 'rgba(90, 74, 61, 0.3)')}>
                      <Icon name="trash" size={12} />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export function CostingsPage() {
  const { user } = useAuth();

  const [activeTab, setActiveTab] = useState<Tab>('main');
  const [settings, setSettings] = useState<CostingSettings>(loadSettings);

  // Main tab state — Costing Model triplet
  const [product, setProduct]     = useState<CostingModelProduct>(DEFAULT_PRODUCT);
  const [container, setContainer] = useState<CostingModelContainer>(DEFAULT_CONTAINER);
  const [scenarios, setScenarios] = useState<CostingScenario[]>(DEFAULT_SCENARIOS);

  // Save/load state
  const [savedList, setSavedList] = useState<SavedCosting[]>([]);
  const [currentId, setCurrentId] = useState<string | null>(null);
  const [showSaved, setShowSaved] = useState(false);
  const [loadingList, setLoadingList] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveName, setSaveName] = useState('');
  const [saveError, setSaveError] = useState<string | null>(null);

  // Products catalog (shared across users — sourced from DataFeed)
  const [productCatalog, setProductCatalog] = useState<Product[]>([]);

  // Import Control tab state
  const [importControl, setImportControl] = useState<ImportControl>(DEFAULT_IMPORT_CONTROL);
  const [icSavedList, setIcSavedList] = useState<SavedImportControl[]>([]);
  const [icCurrentId, setIcCurrentId] = useState<string | null>(null);
  const [icShowSaved, setIcShowSaved] = useState(false);
  const [icSaving, setIcSaving] = useState(false);
  const [icSaveName, setIcSaveName] = useState('');
  const [icSaveError, setIcSaveError] = useState<string | null>(null);

  const results: ScenarioSummary[] = useMemo(
    () => scenarios.map(s => computeCostingModelScenario(product, container, s, settings)),
    [product, container, scenarios, settings],
  );

  const icResults: ImportControlResults = useMemo(
    () => computeImportControl(importControl),
    [importControl],
  );

  // ── Setters ────────────────────────────────────────────────────────────────
  const setProductField = useCallback(<K extends keyof CostingModelProduct>(key: K, val: CostingModelProduct[K]) => {
    setProduct(prev => ({ ...prev, [key]: val }));
  }, []);

  const setContainerField = useCallback(<K extends keyof CostingModelContainer>(key: K, val: CostingModelContainer[K]) => {
    setContainer(prev => ({ ...prev, [key]: val }));
  }, []);

  const setScenarioField = useCallback(<K extends keyof CostingScenario>(i: number, key: K, val: CostingScenario[K]) => {
    setScenarios(prev => {
      const next = [...prev];
      next[i] = { ...next[i], [key]: val };
      return next;
    });
  }, []);

  const addScenario = useCallback(() => {
    setScenarios(prev => prev.length >= 5 ? prev : [...prev, makeDefaultScenario(prev.length)]);
  }, []);

  const removeScenario = useCallback((i: number) => {
    setScenarios(prev => prev.length <= 1 ? prev : prev.filter((_, idx) => idx !== i));
  }, []);

  // ── Settings ───────────────────────────────────────────────────────────────
  function updateSettings(s: CostingSettings) {
    setSettings(s);
    const merged: CostingSettings = {
      dutyRates: { ...DUTY_RATES, ...s.dutyRates },
      agentPortRates: { ...AGENT_PORT_RATES, ...s.agentPortRates },
      insurancePerFCL: s.insurancePerFCL,
    };
    try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(merged)); } catch { /* ignore */ }
  }

  // ── Products catalog ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!user) return;
    fetchProducts().then(setProductCatalog).catch(e => console.error('Failed to load products:', e));
  }, [user]);

  const handleProductCatalogSelect = useCallback((p: Product) => {
    setProduct(prev => ({
      ...prev,
      productCode: p.product_no,
      description: p.description,
      caseWeightKg: p.net_weight_kg || prev.caseWeightKg,
      bagsPerCase: p.packs_per_case || prev.bagsPerCase,
    }));
    // Default each scenario's cases-per-container from the catalog row if empty
    setScenarios(prev => prev.map(s => ({
      ...s,
      casesPerContainer: s.casesPerContainer > 0 ? s.casesPerContainer : p.container_fill_cases,
    })));
  }, []);

  const handleProductCatalogCreate = useCallback(async (input: NewProductInput): Promise<Product> => {
    if (!user) throw new Error('Not signed in');
    const created = await createProduct(user.id, input);
    setProductCatalog(prev => [...prev, created].sort((a, b) => a.product_no.localeCompare(b.product_no)));
    return created;
  }, [user]);

  const handleProductCatalogUpdate = useCallback(async (id: string, patch: Partial<NewProductInput>): Promise<Product> => {
    const updated = await updateProduct(id, patch);
    setProductCatalog(prev => prev.map(p => (p.id === id ? updated : p))
      .sort((a, b) => a.product_no.localeCompare(b.product_no)));
    return updated;
  }, []);

  const handleProductCatalogDelete = useCallback(async (id: string): Promise<void> => {
    await deleteProduct(id);
    setProductCatalog(prev => prev.filter(p => p.id !== id));
  }, []);

  // ── Import Control setters ────────────────────────────────────────────────
  const setIcHeader = useCallback(<K extends keyof ImportControlHeader>(key: K, val: ImportControlHeader[K]) => {
    setImportControl(prev => ({ ...prev, header: { ...prev.header, [key]: val } }));
  }, []);
  const setIcClearance = useCallback(<K extends keyof ImportControlClearance>(key: K, val: ImportControlClearance[K]) => {
    setImportControl(prev => ({ ...prev, clearance: { ...prev.clearance, [key]: val } }));
  }, []);
  const setIcCosts = useCallback(<K extends keyof ImportControlCosts>(key: K, val: ImportControlCosts[K]) => {
    setImportControl(prev => ({ ...prev, costs: { ...prev.costs, [key]: val } }));
  }, []);
  const setIcProduct = useCallback(<K extends keyof ImportControlProduct>(i: number, key: K, val: ImportControlProduct[K]) => {
    setImportControl(prev => {
      const next = [...prev.products];
      next[i] = { ...next[i], [key]: val };
      return { ...prev, products: next };
    });
  }, []);
  const addIcProduct = useCallback(() => {
    setImportControl(prev => prev.products.length >= 4 ? prev : { ...prev, products: [...prev.products, makeDefaultIcProduct()] });
  }, []);
  const removeIcProduct = useCallback((i: number) => {
    setImportControl(prev => prev.products.length <= 1 ? prev : { ...prev, products: prev.products.filter((_, idx) => idx !== i) });
  }, []);

  const handleIcProductCatalogSelect = useCallback((i: number, p: Product) => {
    setImportControl(prev => {
      const next = [...prev.products];
      const existing = next[i];
      next[i] = {
        ...existing,
        productCode: p.product_no,
        productDescription: p.description,
        caseWeight: existing.caseWeight > 0 ? existing.caseWeight : p.net_weight_kg,
        caseCount: existing.caseCount > 0 ? existing.caseCount : p.container_fill_cases,
        catalogContainerFillKg: p.container_fill_kg || existing.catalogContainerFillKg,
      };
      return { ...prev, products: next };
    });
  }, []);

  // ── Save / load ────────────────────────────────────────────────────────────
  useEffect(() => { if (user) loadList(); }, [user]);

  async function loadList() {
    setLoadingList(true);
    try { setSavedList(await fetchCostingCalculations(user!.id)); }
    catch (e) { console.error(e); }
    finally { setLoadingList(false); }
  }

  async function handleSave() {
    if (!user || !saveName.trim()) { setSaveError('Enter a name first.'); return; }
    setSaving(true); setSaveError(null);
    try {
      const payload: CostingModelPayload = { kind: 'model_v2', product, container, scenarios };
      const resultsPayload: CostingModelResults = { kind: 'model_v2', scenarios: results };
      const saved = await saveCostingCalculation(user.id, saveName.trim(), payload, resultsPayload, currentId ?? undefined);
      if (saved) {
        setCurrentId(saved.id);
        setSavedList(prev => {
          const idx = prev.findIndex(s => s.id === saved.id);
          if (idx >= 0) { const n = [...prev]; n[idx] = saved; return n; }
          return [saved, ...prev];
        });
      }
    } catch (e) { setSaveError(e instanceof Error ? e.message : String(e)); }
    finally { setSaving(false); }
  }

  function handleLoad(s: SavedCosting) {
    if (isCostingModelPayload(s.inputs)) {
      setProduct(s.inputs.product);
      setContainer(s.inputs.container);
      setScenarios(s.inputs.scenarios);
      setCurrentId(s.id);
      setSaveName(s.name);
      setActiveTab('main');
    } else {
      // Legacy single-scenario entry — load what we can into Product Details + Scenario 1
      const legacy = s.inputs;
      setProduct({
        productCode: '',
        description: legacy.productName,
        productCategory: legacy.productCategory,
        bagsPerCase: 0,
        caseWeightKg: legacy.caseWeightKg,
        supplier: legacy.supplier,
        priceUSDPerTonne: legacy.costPerTonneUSD,
      });
      setContainer({
        clearanceType: legacy.clearanceType,
        retail: false,
        handball: legacy.handballing,
        containerWeightKg: 0,
        insuranceAuto: legacy.insuranceAuto,
        insuranceManualGBP: legacy.insuranceManualGBP,
      });
      const s1: CostingScenario = {
        ...makeDefaultScenario(0),
        salesPricePerCase: legacy.sellingPricePerCase,
        exchangeRateUSDGBP: legacy.exchangeRateUSDGBP,
        casesPerContainer: legacy.casesPerContainer,
        freightCostUSD: legacy.freightCostUSD,
        agentPort: legacy.agentPort,
        transportCostGBP: legacy.transportCostGBP,
      };
      setScenarios([s1, ...DEFAULT_SCENARIOS.slice(1, 5).map((_, i) => makeDefaultScenario(i + 1))]);
      setCurrentId(null); // Don't overwrite the legacy record on next save
      setSaveName(`${s.name} (migrated)`);
      setActiveTab('main');
    }
  }

  async function handleDelete(id: string) {
    try {
      await deleteCostingCalculation(id);
      setSavedList(prev => prev.filter(s => s.id !== id));
      if (currentId === id) setCurrentId(null);
    } catch (e) { console.error(e); }
  }

  function handleReset() {
    setProduct(DEFAULT_PRODUCT);
    setContainer(DEFAULT_CONTAINER);
    setScenarios(DEFAULT_SCENARIOS.map((_, i) => makeDefaultScenario(i)));
    setCurrentId(null);
    setSaveName('');
    setSaveError(null);
  }

  function handleExportPdf() {
    exportCostingPdf({
      name: saveName.trim() || product.productCode || product.description || 'Costing',
      product, container, scenarios, results, settings,
    });
  }

  // ── Import Control save / load / reset / PDF ─────────────────────────────
  useEffect(() => { if (user) loadIcList(); }, [user]);

  async function loadIcList() {
    try { setIcSavedList(await fetchImportControls(user!.id)); }
    catch (e) { console.error(e); }
  }

  async function handleIcSave() {
    if (!user || !icSaveName.trim()) { setIcSaveError('Enter a name first.'); return; }
    setIcSaving(true); setIcSaveError(null);
    try {
      const saved = await saveImportControl(user.id, icSaveName.trim(), importControl, icResults, icCurrentId ?? undefined);
      if (saved) {
        setIcCurrentId(saved.id);
        setIcSavedList(prev => {
          const idx = prev.findIndex(s => s.id === saved.id);
          if (idx >= 0) { const n = [...prev]; n[idx] = saved; return n; }
          return [saved, ...prev];
        });
      }
    } catch (e) { setIcSaveError(e instanceof Error ? e.message : String(e)); }
    finally { setIcSaving(false); }
  }

  function handleIcLoad(s: SavedImportControl) {
    setImportControl(s.data);
    setIcCurrentId(s.id);
    setIcSaveName(s.name);
    setActiveTab('import_control');
  }

  async function handleIcDelete(id: string) {
    try {
      await deleteImportControl(id);
      setIcSavedList(prev => prev.filter(s => s.id !== id));
      if (icCurrentId === id) setIcCurrentId(null);
    } catch (e) { console.error(e); }
  }

  function handleIcReset() {
    setImportControl(DEFAULT_IMPORT_CONTROL);
    setIcCurrentId(null);
    setIcSaveName('');
    setIcSaveError(null);
  }

  function handleIcExportPdf() {
    exportImportControlPdf({
      name: icSaveName.trim() || importControl.header.containerNumber || 'Import Control',
      ic: importControl, results: icResults,
    });
  }

  return (
    <div className="flex flex-col h-full overflow-hidden" style={{ background: 'transparent' }}>

      {/* Header — warm orange gradient strip with title + actions + tab bar */}
      <div
        className="shrink-0 mx-3 mt-3 overflow-hidden"
        style={{
          background: 'linear-gradient(135deg, #f59e0b 0%, #ea580c 50%, #c2410c 100%)',
          borderRadius: 24,
          boxShadow: '0 10px 30px rgba(217,119,6,0.25), 0 4px 12px rgba(0,0,0,0.06)',
          border: '1px solid rgba(255,255,255,0.20)',
        }}
      >
        <div className="px-4 pt-3 pb-2 flex items-center justify-between gap-3 flex-wrap">
          <div>
            <h2 className="font-black text-sm uppercase tracking-widest text-white">Food Import Costing</h2>
            <p className="font-mono text-[10px] mt-0.5" style={{ color: 'rgba(255,255,255,0.5)' }}>
              5-scenario costing model · spreadsheet-faithful
            </p>
          </div>

          {activeTab === 'main' && (
            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={() => { setShowSaved(true); if (!showSaved) loadList(); }}
                className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold uppercase tracking-wider"
                style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 100, color: '#fff' }}>
                <Icon name="folder" size={12} /> Saved
              </button>
              <button
                onClick={handleReset}
                className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold uppercase tracking-wider"
                style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 100, color: '#fff' }}>
                <Icon name="reset" size={12} /> Reset
              </button>
              <button
                onClick={handleExportPdf}
                className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold uppercase tracking-wider"
                style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 100, color: '#fff' }}>
                <Icon name="filedown" size={12} /> PDF
              </button>
              <input
                type="text" value={saveName} onChange={e => { setSaveName(e.target.value); setSaveError(null); }}
                onKeyDown={e => e.key === 'Enter' && handleSave()}
                placeholder="Calculation name…"
                className="px-3 py-2 text-xs font-mono focus:outline-none w-40"
                style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 12, color: '#fff' }}
              />
              <button
                onClick={handleSave} disabled={saving}
                className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold uppercase tracking-wider disabled:opacity-40"
                style={{ background: 'rgba(255,255,255,0.95)', borderRadius: 100, color: '#d97706' }}>
                {saving ? <Spinner size={12} /> : <Icon name="save" size={12} />}
                Save
              </button>
            </div>
          )}

          {activeTab === 'import_control' && (
            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={() => { setIcShowSaved(true); if (!icShowSaved) loadIcList(); }}
                className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold uppercase tracking-wider"
                style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 100, color: '#fff' }}>
                <Icon name="folder" size={12} /> Saved
              </button>
              <button
                onClick={handleIcReset}
                className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold uppercase tracking-wider"
                style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 100, color: '#fff' }}>
                <Icon name="reset" size={12} /> Reset
              </button>
              <button
                onClick={handleIcExportPdf}
                className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold uppercase tracking-wider"
                style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 100, color: '#fff' }}>
                <Icon name="filedown" size={12} /> PDF
              </button>
              <input
                type="text" value={icSaveName} onChange={e => { setIcSaveName(e.target.value); setIcSaveError(null); }}
                onKeyDown={e => e.key === 'Enter' && handleIcSave()}
                placeholder="Container name…"
                className="px-3 py-2 text-xs font-mono focus:outline-none w-40"
                style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 12, color: '#fff' }}
              />
              <button
                onClick={handleIcSave} disabled={icSaving}
                className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold uppercase tracking-wider disabled:opacity-40"
                style={{ background: 'rgba(255,255,255,0.95)', borderRadius: 100, color: '#d97706' }}>
                {icSaving ? <Spinner size={12} /> : <Icon name="save" size={12} />}
                Save
              </button>
            </div>
          )}
        </div>
        {saveError && activeTab === 'main' && (
          <p className="px-4 pb-2 font-mono text-[10px] text-red-300">{saveError}</p>
        )}
        {icSaveError && activeTab === 'import_control' && (
          <p className="px-4 pb-2 font-mono text-[10px] text-red-300">{icSaveError}</p>
        )}

        <div className="flex px-4 gap-0.5">
          {TABS.map(tab => {
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className="flex items-center gap-1.5 px-3.5 py-2.5 text-[10px] font-bold uppercase tracking-wider transition-all"
                style={{
                  borderRadius: '10px 10px 0 0',
                  background: active ? 'rgba(255,255,255,0.97)' : 'rgba(255,255,255,0.08)',
                  color: active ? '#d97706' : 'rgba(255,255,255,0.6)',
                  borderBottom: active ? '2px solid #f59e0b' : '2px solid transparent',
                }}
              >
                <span style={{ opacity: active ? 1 : 0.7 }}>{tab.icon}</span>
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-hidden flex flex-col">
        {activeTab === 'main' && (
          <MainCostingsTab
            product={product}
            container={container}
            scenarios={scenarios}
            results={results}
            settings={settings}
            productCatalog={productCatalog}
            onSetProduct={setProductField}
            onSetContainer={setContainerField}
            onSetScenario={setScenarioField}
            onAddScenario={addScenario}
            onRemoveScenario={removeScenario}
            onProductCatalogSelect={handleProductCatalogSelect}
            onProductCatalogCreate={handleProductCatalogCreate}
          />
        )}
        {activeTab === 'npd' && <NpdCostingsTab settings={settings} />}
        {activeTab === 'bulk' && <BulkCostingsTab settings={settings} />}
        {activeTab === 'import_control' && (
          <ImportControlTab
            ic={importControl}
            results={icResults}
            productCatalog={productCatalog}
            onSetHeader={setIcHeader}
            onSetClearance={setIcClearance}
            onSetCosts={setIcCosts}
            onSetProduct={setIcProduct}
            onAddProduct={addIcProduct}
            onRemoveProduct={removeIcProduct}
            onProductCatalogSelect={handleIcProductCatalogSelect}
            onProductCatalogCreate={handleProductCatalogCreate}
          />
        )}
        {activeTab === 'products' && (
          <ProductsTab
            products={productCatalog}
            onCreate={handleProductCatalogCreate}
            onUpdate={handleProductCatalogUpdate}
            onDelete={handleProductCatalogDelete}
          />
        )}
        {activeTab === 'settings' && <SettingsTab settings={settings} onUpdate={updateSettings} />}
      </div>

      {/* Saved modal — Costing Model */}
      {showSaved && (
        <SavedPanel
          list={savedList} loading={loadingList} currentId={currentId}
          onLoad={handleLoad} onDelete={handleDelete} onClose={() => setShowSaved(false)}
        />
      )}

      {/* Saved modal — Import Control */}
      {icShowSaved && (
        <IcSavedPanel
          list={icSavedList} currentId={icCurrentId}
          onLoad={handleIcLoad} onDelete={handleIcDelete} onClose={() => setIcShowSaved(false)}
        />
      )}
    </div>
  );
}

// ── Import Control saved-panel modal ─────────────────────────────────────────

function IcSavedPanel({
  list, currentId, onLoad, onDelete, onClose,
}: {
  list: SavedImportControl[]; currentId: string | null;
  onLoad: (s: SavedImportControl) => void; onDelete: (id: string) => void; onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(6px)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="w-full max-w-md rounded-2xl overflow-hidden"
        style={{ background: 'rgba(255,255,255,0.92)', border: '1px solid rgba(245, 158, 11, 0.2)', boxShadow: '0 24px 64px rgba(0,0,0,0.2)' }}>
        <div className="flex items-center justify-between px-5 py-4"
          style={{ background: 'linear-gradient(135deg, #1a1410, #d97706)' }}>
          <div className="flex items-center gap-2.5">
            <Icon name="ship" size={14} className="text-white/80" />
            <span className="text-sm font-bold uppercase tracking-tight text-white">Saved Containers</span>
          </div>
          <button onClick={onClose} style={{ color: 'rgba(255,255,255,0.5)' }}>
            <Icon name="close" size={16} />
          </button>
        </div>
        <div className="p-4 max-h-96 overflow-y-auto">
          {list.length === 0 ? (
            <div className="text-center py-8">
              <Icon name="ship" size={28} className="mx-auto mb-3" style={{ color: 'rgba(90, 74, 61, 0.15)' }} />
              <p className="text-xs uppercase tracking-widest" style={{ color: 'rgba(90, 74, 61, 0.3)' }}>No saved containers yet</p>
            </div>
          ) : (
            <div className="space-y-2">
              {list.map(s => (
                <div key={s.id} className="flex items-center gap-3 px-3 py-2.5 rounded-xl"
                  style={{ background: 'rgba(255,255,255,0.8)', border: s.id === currentId ? '1.5px solid rgba(245, 158, 11, 0.4)' : '1px solid rgba(245, 158, 11, 0.12)' }}>
                  <button className="flex-1 text-left" onClick={() => { onLoad(s); onClose(); }}>
                    <p className="font-bold text-sm" style={{ color: '#1a1410' }}>{s.name}</p>
                    <p className="font-mono text-[10px] mt-0.5" style={{ color: 'rgba(90, 74, 61, 0.45)' }}>
                      {s.data?.header?.containerNumber || '—'} · {s.data?.products?.length ?? 0} products · {new Date(s.updated_at).toLocaleDateString('en-GB')}
                    </p>
                  </button>
                  <button onClick={() => onDelete(s.id)} className="p-1.5 rounded-full" style={{ color: 'rgba(90, 74, 61, 0.3)' }}>
                    <Icon name="trash" size={12} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

