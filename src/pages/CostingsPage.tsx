import { useState, useMemo, useCallback, useEffect } from 'react';
import {
  Save, Trash2, FolderOpen, RotateCcw, FileDown,
  Package, Layers, BarChart2, Settings, Loader, X,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import {
  CostingSettings,
  CostingModelProduct, CostingModelContainer, CostingScenario, ScenarioSummary,
  CostingModelPayload, CostingModelResults, SavedCosting,
  isCostingModelPayload,
} from '../types/costing';
import {
  AGENT_PORT_RATES, INSURANCE_PER_FCL_GBP, DUTY_RATES,
  DEFAULT_LICENCE_COST_PER_KG, DEFAULT_TRANSPORT_COSTS,
} from '../data/costingRates';
import { computeCostingModelScenario } from '../utils/costingCalc';
import { exportCostingPdf } from '../utils/costingPdf';
import { Product, NewProductInput } from '../types/product';
import { fetchProducts, createProduct } from '../lib/products';
import { saveCostingCalculation, fetchCostingCalculations, deleteCostingCalculation } from '../lib/costings';
import { MainCostingsTab } from '../components/costings/MainCostingsTab';
import { NpdCostingsTab } from '../components/costings/NpdCostingsTab';
import { BulkCostingsTab } from '../components/costings/BulkCostingsTab';
import { SettingsTab } from '../components/costings/SettingsTab';

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

// ── Tab definition ────────────────────────────────────────────────────────────

type Tab = 'main' | 'npd' | 'bulk' | 'settings';

const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
  { id: 'main',     label: 'Costing Model',  icon: <Package size={12} /> },
  { id: 'npd',      label: 'NPD Costings',   icon: <BarChart2 size={12} /> },
  { id: 'bulk',     label: 'Bulk Costings',  icon: <Layers size={12} /> },
  { id: 'settings', label: 'Workings',       icon: <Settings size={12} /> },
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
        style={{ background: 'rgba(255,255,255,0.92)', border: '1px solid rgba(22,163,74,0.2)', boxShadow: '0 24px 64px rgba(0,0,0,0.2)' }}>
        <div className="flex items-center justify-between px-5 py-4"
          style={{ background: 'linear-gradient(135deg, #14532d, #15803d)', borderBottom: '1px solid rgba(22,163,74,0.2)' }}>
          <div className="flex items-center gap-2.5">
            <FolderOpen size={14} className="text-white/80" />
            <span className="text-sm font-bold uppercase tracking-tight text-white">Saved Calculations</span>
          </div>
          <button onClick={onClose} style={{ color: 'rgba(255,255,255,0.5)' }}
            onMouseEnter={e => (e.currentTarget.style.color = '#fff')}
            onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.5)')}>
            <X size={16} />
          </button>
        </div>
        <div className="p-4 max-h-96 overflow-y-auto" style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(22,163,74,0.2) transparent' }}>
          {loading ? (
            <div className="flex justify-center py-8"><Loader size={18} className="animate-spin" style={{ color: 'rgba(20,83,45,0.3)' }} /></div>
          ) : list.length === 0 ? (
            <div className="text-center py-8">
              <Package size={28} className="mx-auto mb-3" style={{ color: 'rgba(20,83,45,0.15)' }} />
              <p className="font-mono text-xs uppercase tracking-widest" style={{ color: 'rgba(20,83,45,0.3)' }}>No saved calculations yet</p>
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
                    style={{ background: 'rgba(255,255,255,0.8)', border: s.id === currentId ? '1.5px solid rgba(22,163,74,0.4)' : '1px solid rgba(22,163,74,0.12)' }}>
                    <button className="flex-1 text-left" onClick={() => { onLoad(s); onClose(); }}>
                      <p className="font-bold text-sm" style={{ color: '#14532d' }}>{s.name}</p>
                      <p className="font-mono text-[10px] mt-0.5" style={{ color: 'rgba(20,83,45,0.45)' }}>
                        {subtitle} · {new Date(s.updated_at).toLocaleDateString('en-GB')}
                        {!isV2 && <span className="ml-1.5 px-1.5 py-0.5 rounded-full" style={{ background: 'rgba(202,138,4,0.15)', color: '#92400e' }}>legacy</span>}
                      </p>
                    </button>
                    <button onClick={() => onDelete(s.id)} className="p-1.5 rounded-full" style={{ color: 'rgba(20,83,45,0.3)' }}
                      onMouseEnter={e => (e.currentTarget.style.color = '#dc2626')}
                      onMouseLeave={e => (e.currentTarget.style.color = 'rgba(20,83,45,0.3)')}>
                      <Trash2 size={12} />
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

  const results: ScenarioSummary[] = useMemo(
    () => scenarios.map(s => computeCostingModelScenario(product, container, s, settings)),
    [product, container, scenarios, settings],
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

  return (
    <div className="flex flex-col h-full overflow-hidden" style={{ background: 'transparent' }}>

      {/* Header */}
      <div
        className="shrink-0"
        style={{ background: 'linear-gradient(135deg, rgba(20,83,45,0.97), rgba(15,70,34,0.95))', backdropFilter: 'blur(24px)', borderBottom: '1px solid rgba(22,163,74,0.25)' }}
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
                <FolderOpen size={12} /> Saved
              </button>
              <button
                onClick={handleReset}
                className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold uppercase tracking-wider"
                style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 100, color: '#fff' }}>
                <RotateCcw size={12} /> Reset
              </button>
              <button
                onClick={handleExportPdf}
                className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold uppercase tracking-wider"
                style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 100, color: '#fff' }}>
                <FileDown size={12} /> PDF
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
                style={{ background: 'rgba(255,255,255,0.95)', borderRadius: 100, color: '#15803d' }}>
                {saving ? <Loader size={12} className="animate-spin" /> : <Save size={12} />}
                Save
              </button>
            </div>
          )}
        </div>
        {saveError && activeTab === 'main' && (
          <p className="px-4 pb-2 font-mono text-[10px] text-red-300">{saveError}</p>
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
                  color: active ? '#15803d' : 'rgba(255,255,255,0.6)',
                  borderBottom: active ? '2px solid #16a34a' : '2px solid transparent',
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
        {activeTab === 'settings' && <SettingsTab settings={settings} onUpdate={updateSettings} />}
      </div>

      {/* Saved modal */}
      {showSaved && (
        <SavedPanel
          list={savedList} loading={loadingList} currentId={currentId}
          onLoad={handleLoad} onDelete={handleDelete} onClose={() => setShowSaved(false)}
        />
      )}
    </div>
  );
}

