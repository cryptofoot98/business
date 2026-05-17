import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import {
  Save, Trash2, FolderOpen, RotateCcw, MessageCircle, X,
  Package, Layers, BarChart2, Settings, Loader, Send, Bot, User,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { FoodCostingInputs, FoodCostingResult, SavedCosting, AgentPortKey, CostingSettings } from '../types/costing';
import {
  AGENT_PORT_RATES, INSURANCE_PER_FCL_GBP, DEFAULT_TRANSPORT_COSTS, DUTY_RATES,
} from '../data/costingRates';
import { computeFoodCosting } from '../utils/costingCalc';
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
      // Merge with current defaults so new categories/agents are always included
      return {
        dutyRates: { ...DUTY_RATES, ...parsed.dutyRates },
        agentPortRates: { ...AGENT_PORT_RATES, ...parsed.agentPortRates },
        insurancePerFCL: parsed.insurancePerFCL ?? INSURANCE_PER_FCL_GBP,
      };
    }
  } catch { /* ignore */ }
  return { dutyRates: DUTY_RATES, agentPortRates: AGENT_PORT_RATES, insurancePerFCL: INSURANCE_PER_FCL_GBP };
}

// ── Default main-tab state ────────────────────────────────────────────────────

const DEFAULT_ROUTE_TRANSPORTS = { ...DEFAULT_TRANSPORT_COSTS };

const DEFAULT_INPUTS: FoodCostingInputs = {
  productName: '',
  supplier: '',
  costPerTonneUSD: 0,
  caseWeightKg: 0,
  casesPerContainer: 0,
  exchangeRateUSDGBP: 1.27,
  freightCostUSD: 0,
  productCategory: 'meat_lt57',
  clearanceType: 'licence',
  agentPort: 'ewl_london_gateway',
  transportCostGBP: DEFAULT_ROUTE_TRANSPORTS.ewl_london_gateway,
  handballing: false,
  handballingCostGBP: 300,
  insuranceAuto: true,
  insuranceManualGBP: 0,
  addition1Label: 'Addition 1',
  addition1GBP: 0,
  addition2Label: 'Addition 2',
  addition2GBP: 0,
  sellingPricePerCase: 0,
};

// ── Tab definition ────────────────────────────────────────────────────────────

type Tab = 'main' | 'npd' | 'bulk' | 'settings';

const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
  { id: 'main',     label: 'Main Costings',  icon: <Package size={12} /> },
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
              {list.map(s => (
                <div key={s.id} className="flex items-center gap-3 px-3 py-2.5 rounded-xl"
                  style={{ background: 'rgba(255,255,255,0.8)', border: s.id === currentId ? '1.5px solid rgba(22,163,74,0.4)' : '1px solid rgba(22,163,74,0.12)' }}>
                  <button className="flex-1 text-left" onClick={() => { onLoad(s); onClose(); }}>
                    <p className="font-bold text-sm" style={{ color: '#14532d' }}>{s.name}</p>
                    <p className="font-mono text-[10px] mt-0.5" style={{ color: 'rgba(20,83,45,0.45)' }}>
                      {s.inputs.productName || '—'} · {new Date(s.updated_at).toLocaleDateString('en-GB')}
                    </p>
                  </button>
                  <button onClick={() => onDelete(s.id)} className="p-1.5 rounded-full" style={{ color: 'rgba(20,83,45,0.3)' }}
                    onMouseEnter={e => (e.currentTarget.style.color = '#dc2626')}
                    onMouseLeave={e => (e.currentTarget.style.color = 'rgba(20,83,45,0.3)')}>
                    <Trash2 size={12} />
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

// ── Chat panel ────────────────────────────────────────────────────────────────

function SimpleChatPanel({ inputs, result, onClose }: {
  inputs: FoodCostingInputs; result: FoodCostingResult; onClose: () => void;
}) {
  const { session, profile } = useAuth();
  const firstName = profile?.full_name?.split(' ')[0] ?? '';
  const [messages, setMessages] = useState<{ role: 'user' | 'assistant'; content: string }[]>([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const taRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, loading]);

  useEffect(() => {
    function outside(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        const fab = document.getElementById('costings-advisor-fab');
        if (fab?.contains(e.target as Node)) return;
        onClose();
      }
    }
    document.addEventListener('mousedown', outside);
    return () => document.removeEventListener('mousedown', outside);
  }, [onClose]);

  async function send() {
    const content = inputText.trim();
    if (!content || loading) return;
    const next = [...messages, { role: 'user' as const, content }];
    setMessages(next);
    setInputText('');
    setLoading(true);
    try {
      const token = session?.access_token ?? import.meta.env.VITE_SUPABASE_ANON_KEY;
      const ctx = `Current food import costing:
Product: ${inputs.productName} (${inputs.supplier})
Cost/tonne: $${inputs.costPerTonneUSD} | Case weight: ${inputs.caseWeightKg}kg | Cases/container: ${inputs.casesPerContainer}
Exchange rate: $${inputs.exchangeRateUSDGBP}/£ | Freight: $${inputs.freightCostUSD}/FCL
Category: ${inputs.productCategory} | Clearance: ${inputs.clearanceType}
Route: ${AGENT_PORT_RATES[inputs.agentPort]?.label} | Transport: £${inputs.transportCostGBP}/FCL
Results: Cost/case: £${result.totalCostPerCase.toFixed(4)} | Cost/kg: £${result.costPerKg.toFixed(4)} | GM: ${result.gmPercent.toFixed(1)}%`;
      const resp = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/costing-chat`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ messages: next.map(m => ({ role: m.role, content: m.content })), context: ctx }),
        }
      );
      const data = await resp.json();
      setMessages(prev => [...prev, { role: 'assistant', content: data.message ?? 'I could not get a response.' }]);
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Sorry, something went wrong. Please try again.' }]);
    } finally {
      setLoading(false);
      setTimeout(() => taRef.current?.focus(), 50);
    }
  }

  return (
    <div
      ref={panelRef}
      className="fixed bottom-20 right-5 z-40 flex flex-col"
      style={{
        width: 380, maxWidth: 'calc(100vw - 2.5rem)',
        height: 'min(520px, calc(100vh - 120px))',
        background: 'rgba(10,34,24,0.97)', backdropFilter: 'blur(24px)',
        border: '1px solid rgba(255,255,255,0.1)', borderRadius: 20,
        boxShadow: '0 24px 64px rgba(0,0,0,0.4)', overflow: 'hidden',
      }}
    >
      <div className="shrink-0 flex items-center justify-between px-4 py-3"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.07)', background: 'rgba(255,255,255,0.03)' }}>
        <div>
          <h4 className="font-bold text-xs uppercase tracking-widest text-white">Costings Advisor</h4>
          <p className="font-mono text-[9px] mt-0.5" style={{ color: 'rgba(255,255,255,0.35)' }}>AI · costs · margins · duties</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse inline-block" />
          <span className="font-mono text-[9px] text-emerald-400">Live</span>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-3 space-y-3 min-h-0" style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(22,163,74,0.2) transparent' }}>
        {messages.length === 0 && (
          <div className="flex items-start gap-2">
            <div className="w-5 h-5 shrink-0 rounded-full flex items-center justify-center" style={{ background: 'rgba(22,163,74,0.3)' }}>
              <Bot size={10} className="text-white" />
            </div>
            <p className="text-xs leading-relaxed" style={{ color: 'rgba(255,255,255,0.7)' }}>
              Hi {firstName || 'there'}. I can see your current costing. Ask me about margins, duty rates, route comparisons, or how to improve your landed cost.
            </p>
          </div>
        )}
        {messages.map((msg, i) => {
          const isUser = msg.role === 'user';
          return (
            <div key={i} className={`flex items-start gap-2 ${isUser ? 'flex-row-reverse' : ''}`}>
              <div className="w-5 h-5 shrink-0 rounded-full flex items-center justify-center"
                style={{ background: isUser ? 'rgba(255,255,255,0.15)' : 'rgba(22,163,74,0.3)' }}>
                {isUser ? <User size={9} className="text-white" /> : <Bot size={9} className="text-white" />}
              </div>
              <div className="flex-1 px-3 py-2 text-xs leading-relaxed" style={{
                borderRadius: 12,
                background: isUser ? 'rgba(22,163,74,0.15)' : 'rgba(255,255,255,0.07)',
                border: isUser ? '1px solid rgba(22,163,74,0.25)' : '1px solid rgba(255,255,255,0.1)',
                color: 'rgba(255,255,255,0.85)',
              }}>
                {msg.content}
              </div>
            </div>
          );
        })}
        {loading && (
          <div className="flex items-start gap-2">
            <div className="w-5 h-5 shrink-0 rounded-full flex items-center justify-center" style={{ background: 'rgba(22,163,74,0.3)' }}>
              <Bot size={9} className="text-white" />
            </div>
            <div className="px-3 py-2 rounded-xl" style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)' }}>
              <Loader size={11} className="animate-spin" style={{ color: 'rgba(255,255,255,0.4)' }} />
            </div>
          </div>
        )}
        <div ref={endRef} />
      </div>
      <div className="shrink-0 p-3 flex gap-2" style={{ borderTop: '1px solid rgba(255,255,255,0.07)' }}>
        <textarea
          ref={taRef} value={inputText} onChange={e => setInputText(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
          placeholder="Ask about costs, margins, duties…" rows={2} disabled={loading}
          className="flex-1 px-3 py-2 text-xs font-mono focus:outline-none resize-none disabled:opacity-50"
          style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 12, color: '#fff' }}
        />
        <button onClick={send} disabled={loading || !inputText.trim()}
          className="w-9 shrink-0 flex items-center justify-center rounded-xl transition-all disabled:opacity-40"
          style={{ background: 'linear-gradient(135deg, #16a34a, #15803d)' }}>
          <Send size={13} className="text-white" />
        </button>
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export function CostingsPage() {
  const { user } = useAuth();

  const [activeTab, setActiveTab] = useState<Tab>('main');
  const [settings, setSettings] = useState<CostingSettings>(loadSettings);

  // Main tab state
  const [inputs, setInputs] = useState<FoodCostingInputs>(DEFAULT_INPUTS);
  const [routeTransports, setRouteTransports] = useState<Record<AgentPortKey, number>>({ ...DEFAULT_ROUTE_TRANSPORTS });

  // Save/load state
  const [savedList, setSavedList] = useState<SavedCosting[]>([]);
  const [currentId, setCurrentId] = useState<string | null>(null);
  const [showSaved, setShowSaved] = useState(false);
  const [loadingList, setLoadingList] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveName, setSaveName] = useState('');
  const [saveError, setSaveError] = useState<string | null>(null);
  const [chatOpen, setChatOpen] = useState(false);

  const result = useMemo(() => computeFoodCosting(inputs, settings), [inputs, settings]);

  const set = useCallback(<K extends keyof FoodCostingInputs>(key: K, value: FoodCostingInputs[K]) => {
    setInputs(prev => ({ ...prev, [key]: value }));
  }, []);

  function updateSettings(s: CostingSettings) {
    setSettings(s);
    // Merge new settings with existing ones from localStorage to preserve all keys
    const merged: CostingSettings = {
      dutyRates: { ...DUTY_RATES, ...s.dutyRates },
      agentPortRates: { ...AGENT_PORT_RATES, ...s.agentPortRates },
      insurancePerFCL: s.insurancePerFCL,
    };
    try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(merged)); } catch { /* ignore */ }
  }

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
      const saved = await saveCostingCalculation(user.id, saveName.trim(), inputs, result, currentId ?? undefined);
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
    setInputs(s.inputs);
    setCurrentId(s.id);
    setSaveName(s.name);
    setActiveTab('main');
  }

  async function handleDelete(id: string) {
    try {
      await deleteCostingCalculation(id);
      setSavedList(prev => prev.filter(s => s.id !== id));
      if (currentId === id) setCurrentId(null);
    } catch (e) { console.error(e); }
  }

  function handleReset() {
    setInputs(DEFAULT_INPUTS);
    setRouteTransports({ ...DEFAULT_ROUTE_TRANSPORTS });
    setCurrentId(null);
    setSaveName('');
    setSaveError(null);
  }

  function handleSelectRoute(key: AgentPortKey) {
    setInputs(prev => ({ ...prev, agentPort: key, transportCostGBP: routeTransports[key] ?? 0 }));
  }

  function handleRouteTransportChange(key: AgentPortKey, val: number) {
    setRouteTransports(prev => ({ ...prev, [key]: val }));
    if (inputs.agentPort === key) setInputs(prev => ({ ...prev, transportCostGBP: val }));
  }

  return (
    <div className="flex flex-col h-full overflow-hidden" style={{ background: 'transparent' }}>

      {/* Header */}
      <div
        className="shrink-0"
        style={{ background: 'linear-gradient(135deg, rgba(20,83,45,0.97), rgba(15,70,34,0.95))', backdropFilter: 'blur(24px)', borderBottom: '1px solid rgba(22,163,74,0.25)' }}
      >
        {/* Title row */}
        <div className="px-4 pt-3 pb-2 flex items-center justify-between gap-3 flex-wrap">
          <div>
            <h2 className="font-black text-sm uppercase tracking-widest text-white">Food Import Costing</h2>
            <p className="font-mono text-[10px] mt-0.5" style={{ color: 'rgba(255,255,255,0.5)' }}>
              Live cost-per-case · duty lookup · route comparison
            </p>
          </div>

          {/* Save controls — only relevant on Main tab */}
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

        {/* Tab bar */}
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
            inputs={inputs}
            result={result}
            routeTransports={routeTransports}
            settings={settings}
            onSet={set}
            onSelectRoute={handleSelectRoute}
            onRouteTransportChange={handleRouteTransportChange}
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

      {/* Chat FAB */}
      <button
        id="costings-advisor-fab"
        onClick={() => setChatOpen(o => !o)}
        className="fixed bottom-6 right-6 z-50 w-14 h-14 flex items-center justify-center transition-transform duration-200 hover:scale-105 active:scale-95"
        style={{ background: 'linear-gradient(135deg, #16a34a, #15803d)', borderRadius: '100%', boxShadow: '0 4px 20px rgba(22,163,74,0.45)' }}
        aria-label={chatOpen ? 'Close Costings Advisor' : 'Open Costings Advisor'}
      >
        {chatOpen ? <X size={22} style={{ color: '#fff' }} /> : <MessageCircle size={22} style={{ color: '#fff' }} />}
      </button>

      {chatOpen && (
        <SimpleChatPanel inputs={inputs} result={result} onClose={() => setChatOpen(false)} />
      )}
    </div>
  );
}
