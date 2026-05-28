import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { Header } from './components/Header';
import { ContainerSelector } from './components/ContainerSelector';
import { ProductForm } from './components/ProductForm';
import { LoadingModeSelector } from './components/LoadingModeSelector';
import { ContainerView2D } from './components/container2d/ContainerView2D';
import { ResultsPanel } from './components/ResultsPanel';
import { MultiContainerPlanner } from './components/MultiContainerPlanner';
import { SavedLoadsPanel } from './components/SavedLoadsPanel';
import { ChatFAB } from './components/chat/ChatFAB';
import { ChatPanel } from './components/chat/ChatPanel';
import { AuthPage } from './pages/AuthPage';
import { LandingPage } from './pages/LandingPage';
import { CostingsPage } from './pages/CostingsPage';
import { useAuth } from './contexts/AuthContext';
import { ContainerType, LoadingMode, PalletConfig, Product, STANDARD_PALLETS, UnitSystem } from './types';
import { CONTAINERS } from './data/containers';
import { calculatePacking, calculateMultiContainer } from './utils/packing';
import { PRODUCT_COLORS, PRODUCT_LABELS, MAX_PRODUCTS } from './utils/colors';
import { saveLoad, SavedLoad } from './lib/loads';
import { AIChatAction, buildChatContext } from './lib/chat';
import { Icon, Spinner } from './components/Icon';

function makeProduct(idx: number): Product {
  return {
    id: `product-${idx}`,
    name: PRODUCT_LABELS[idx] ?? `Product ${idx + 1}`,
    length: 0,
    width: 0,
    height: 0,
    netWeight: 0,
    grossWeight: 0,
    color: PRODUCT_COLORS[idx % PRODUCT_COLORS.length],
    stackable: true,
    fragile: false,
    orientationLock: 'none',
    priority: 5,
  };
}

const UNIT_MULTIPLIERS: Record<UnitSystem, number> = {
  cm: 1,
  mm: 0.1,
  in: 2.54,
};

function LoadingScreen() {
  return (
    <div className="h-screen flex items-center justify-center" style={{ background: '#f0f8f0' }}>
      <div className="flex items-center gap-3 px-6 py-4" style={{
        background: 'rgba(255,255,255,0.72)',
        backdropFilter: 'blur(24px)',
        border: '1px solid rgba(255,255,255,0.85)',
        borderRadius: 100,
        boxShadow: '0 4px 20px rgba(0,0,0,0.07), inset 0 1px 0 rgba(255,255,255,0.95)',
      }}>
        <Spinner size={18}  style={{ color: '#16a34a' }} />
        <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'rgba(20,83,45,0.6)' }}>Loading…</span>
      </div>
    </div>
  );
}

const PREFS_KEY = 'sc_prefs';
const PRODUCTS_KEY = 'sc_products';

interface StoredPrefs {
  containerId?: string;
  unit?: UnitSystem;
  loadingMode?: LoadingMode;
  palletId?: string;
}

function loadPrefs(): StoredPrefs {
  try {
    return JSON.parse(localStorage.getItem(PREFS_KEY) ?? '{}');
  } catch {
    return {};
  }
}

function savePrefs(prefs: StoredPrefs) {
  try {
    localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
  } catch {
    // ignore storage errors
  }
}

function loadSavedProducts(): Product[] | null {
  try {
    const raw = localStorage.getItem(PRODUCTS_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function saveProducts(products: Product[]) {
  try {
    localStorage.setItem(PRODUCTS_KEY, JSON.stringify(products));
  } catch {
    // ignore storage errors
  }
}

function MainApp() {
  const { user, session, profile } = useAuth();

  const prefs = useMemo(() => loadPrefs(), []);

  const [selectedContainer, setSelectedContainer] = useState<ContainerType>(
    () => CONTAINERS.find(c => c.id === prefs.containerId) ?? CONTAINERS[1],
  );
  const [products, setProducts] = useState<Product[]>(() => {
    const saved = loadSavedProducts();
    if (saved && saved.length > 0) {
      return saved.map((p, idx) => ({
        stackable: true,
        fragile: false,
        orientationLock: 'none' as const,
        priority: 5,
        ...p,
        color: PRODUCT_COLORS[idx % PRODUCT_COLORS.length],
      }));
    }
    return [makeProduct(0)];
  });
  const [unit, setUnit] = useState<UnitSystem>(prefs.unit ?? 'cm');
  const [loadingMode, setLoadingMode] = useState<LoadingMode>(prefs.loadingMode ?? 'handload');
  const [palletConfig, setPalletConfig] = useState<PalletConfig>(
    () => STANDARD_PALLETS.find(p => p.id === prefs.palletId) ?? STANDARD_PALLETS[0],
  );
  const [savesOpen, setSavesOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [multiContainerIndex, setMultiContainerIndex] = useState(0);
  const [sidebarOpen, setSidebarOpen] = useState(false);          // mobile open/close
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false); // desktop collapse to icon strip
  const [productMode, setProductMode] = useState<'single' | 'multi'>('single');
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);

  useEffect(() => {
    savePrefs({
      containerId: selectedContainer.id,
      unit,
      loadingMode,
      palletId: palletConfig.id,
    });
  }, [selectedContainer.id, unit, loadingMode, palletConfig.id]);

  useEffect(() => {
    saveProducts(products);
  }, [products]);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  }, []);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    const startX = touchStartX.current;
    const startY = touchStartY.current;
    if (startX === null || startY === null) return;

    const endX = e.changedTouches[0].clientX;
    const endY = e.changedTouches[0].clientY;
    const dx = endX - startX;
    const dy = endY - startY;

    touchStartX.current = null;
    touchStartY.current = null;

    // Only trigger if horizontal swipe is dominant and long enough
    if (Math.abs(dx) < 50 || Math.abs(dx) < Math.abs(dy) * 1.5) return;

    if (dx > 0 && startX < 40) {
      // Swipe right from left edge — open sidebar
      setSidebarOpen(true);
    } else if (dx < 0) {
      // Swipe left anywhere — close sidebar
      setSidebarOpen(false);
    }
  }, []);

  const firstName = profile?.full_name?.split(' ')[0] ?? 'there';

  const convertedProducts = useMemo<Product[]>(() => {
    const mul = UNIT_MULTIPLIERS[unit];
    return products.map(p => ({
      ...p,
      length: p.length * mul,
      width: p.width * mul,
      height: p.height * mul,
    }));
  }, [products, unit]);

  const hasQuantities = useMemo(
    () => convertedProducts.some(p => p.quantity && p.quantity > 0),
    [convertedProducts],
  );

  const multiContainerResult = useMemo(() => {
    if (!hasQuantities) return null;
    return calculateMultiContainer(selectedContainer, convertedProducts, loadingMode, palletConfig);
  }, [hasQuantities, selectedContainer, convertedProducts, loadingMode, palletConfig]);

  const packingResult = useMemo(
    () =>
      multiContainerResult
        ? (multiContainerResult.results[multiContainerIndex] ?? multiContainerResult.results[0])
        : calculatePacking(selectedContainer, convertedProducts, loadingMode, palletConfig),
    [multiContainerResult, multiContainerIndex, selectedContainer, convertedProducts, loadingMode, palletConfig],
  );

  const handleUpdate = useCallback((id: string, field: keyof Product, value: unknown) => {
    setProducts(prev => prev.map(p => (p.id === id ? { ...p, [field]: value } : p)));
    setMultiContainerIndex(0);
  }, []);

  const productLimit = productMode === 'single' ? 1 : 3;

  const handleAdd = useCallback(() => {
    setProducts(prev => {
      if (prev.length >= productLimit) return prev;
      return [...prev, makeProduct(prev.length)];
    });
  }, [productLimit]);

  const handleRemove = useCallback((id: string) => {
    setProducts(prev => prev.filter(p => p.id !== id));
    setMultiContainerIndex(0);
  }, []);

  const handleImportCSV = useCallback((imported: Product[]) => {
    setProducts(prev => {
      const combined = [...prev, ...imported];
      return combined.slice(0, MAX_PRODUCTS);
    });
    setMultiContainerIndex(0);
  }, []);

  const handleAddProduct = useCallback((data: Omit<Product, 'id' | 'color'>) => {
    setProducts(prev => {
      if (prev.length >= productLimit) return prev;
      const idx = prev.length;
      return [...prev, {
        ...data,
        id: `product-${Date.now()}`,
        color: PRODUCT_COLORS[idx % PRODUCT_COLORS.length],
      }];
    });
    setMultiContainerIndex(0);
  }, []);

  const handleSaveRequest = useCallback(async (name: string) => {
    if (!user) return;
    setIsSaving(true);
    try {
      await saveLoad(user.id, {
        name,
        container_id: selectedContainer.id,
        loading_mode: loadingMode,
        pallet_config: loadingMode === 'pallet' ? palletConfig : null,
        products,
        unit,
      });
    } catch (err) {
      console.error('Save failed:', err);
      alert(`Save failed: ${err instanceof Error ? err.message : JSON.stringify(err)}`);
    } finally {
      setIsSaving(false);
    }
  }, [user, selectedContainer, loadingMode, palletConfig, products, unit]);

  const handleLoadSelect = useCallback((load: SavedLoad) => {
    const container = CONTAINERS.find(c => c.id === load.container_id);
    if (container) setSelectedContainer(container);
    setLoadingMode(load.loading_mode as LoadingMode);
    if (load.pallet_config) setPalletConfig(load.pallet_config as PalletConfig);
    const rawProducts = load.products as Product[];
    setProducts(
      rawProducts.map((p, idx) => ({
        stackable: true,
        fragile: false,
        orientationLock: 'none' as const,
        priority: 5,
        ...p,
        color: PRODUCT_COLORS[idx % PRODUCT_COLORS.length],
      })),
    );
    setUnit(load.unit as UnitSystem);
    setMultiContainerIndex(0);
  }, []);

  const handleAIAction = useCallback((action: AIChatAction) => {
    if (action.type === 'setup') {
      const container = CONTAINERS.find(c => c.id === action.container_id);
      if (container) setSelectedContainer(container);
      if (action.unit) setUnit(action.unit);
      if (action.loading_mode) setLoadingMode(action.loading_mode);
      if (action.loading_mode === 'pallet' && action.pallet_id) {
        const pallet = STANDARD_PALLETS.find(p => p.id === action.pallet_id);
        if (pallet) setPalletConfig(pallet);
      }
      if (action.products) {
        const newProducts = action.products.slice(0, MAX_PRODUCTS).map((p, idx) => ({
          id: `product-${idx}`,
          name: p.name ?? (PRODUCT_LABELS[idx] ?? `Product ${idx + 1}`),
          color: PRODUCT_COLORS[idx % PRODUCT_COLORS.length],
          length: p.length,
          width: p.width,
          height: p.height,
          netWeight: p.net_weight,
          grossWeight: p.gross_weight,
          stackable: true,
          fragile: false,
          orientationLock: 'none' as const,
          priority: 5,
        }));
        setProducts(newProducts);
      }
      setMultiContainerIndex(0);
    } else if (action.type === 'update_container') {
      const container = CONTAINERS.find(c => c.id === action.container_id);
      if (container) {
        setSelectedContainer(container);
        setMultiContainerIndex(0);
      }
    } else if (action.type === 'update_product') {
      const idx = action.product_index ?? 0;
      setProducts(prev => prev.map((p, i) => {
        if (i !== idx) return p;
        return {
          ...p,
          length: action.length ?? p.length,
          width: action.width ?? p.width,
          height: action.height ?? p.height,
          netWeight: action.net_weight ?? p.netWeight,
          grossWeight: action.gross_weight ?? p.grossWeight,
        };
      }));
      setMultiContainerIndex(0);
    }
  }, []);

  const chatContext = useMemo(
    () => buildChatContext(selectedContainer, products, unit, loadingMode, packingResult),
    [selectedContainer, products, unit, loadingMode, packingResult],
  );

  const activeProductColors = products.map(p => p.color);

  // ── Routing ────────────────────────────────────────────────────────────────
  // Derive activePage from the current URL so the Header can light up the
  // correct tab. The Routes block below renders the actual page content.
  const location = useLocation();
  const navigate = useNavigate();
  const activePage: 'calculator' | 'costings' =
    location.pathname.startsWith('/costings') ? 'costings' : 'calculator';

  const navigateTo = useCallback(
    (page: 'calculator' | 'costings') => {
      navigate(page === 'costings' ? '/costings' : '/container');
    },
    [navigate],
  );

  // The calculator screen content (kept inline to preserve shared state +
  // chat context). The Routes block below mounts it at /container.
  const calculatorContent = (
    <div className="flex flex-1 overflow-hidden relative px-2 sm:px-3 pb-3 gap-3">
        {sidebarOpen && (
          <div
            className="fixed inset-0 bg-black/40 z-20 lg:hidden"
            style={{ top: 72 }}
            onClick={() => setSidebarOpen(false)}
          />
        )}

        <aside className={`
          fixed lg:relative
          left-2 lg:left-auto
          top-20 bottom-3 lg:top-auto lg:bottom-auto
          z-30 lg:z-auto
          shrink-0
          flex flex-col overflow-hidden
          transition-all duration-300 ease-in-out
          lg:translate-x-0
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-[120%]'}
        `}
          style={{
            background: '#ffffff',
            border: '1px solid rgba(26,20,16,0.06)',
            borderRadius: 24,
            boxShadow: '0 4px 24px rgba(26,20,16,0.06)',
            width: sidebarCollapsed ? 64 : 320,
          }}
        >
          {/* Collapse toggle */}
          <button
            onClick={() => setSidebarCollapsed(c => !c)}
            className="hidden lg:flex shrink-0 items-center justify-center gap-1.5 px-3 py-2 text-[10px] font-semibold uppercase tracking-widest transition-colors"
            style={{
              color: '#5a4a3d',
              borderBottom: '1px solid rgba(26,20,16,0.06)',
              background: '#fffaf0',
            }}
            title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            <span style={{ fontSize: 12 }}>{sidebarCollapsed ? '▶' : '◀'}</span>
            {!sidebarCollapsed && <span>Collapse</span>}
          </button>

          {sidebarCollapsed ? (
            // Collapsed mode — show only section icon stripes
            <div className="flex-1 flex flex-col items-center gap-4 p-3">
              <button
                onClick={() => setSidebarCollapsed(false)}
                className="w-10 h-10 flex items-center justify-center rounded-xl"
                style={{ background: '#fffaf0', border: '1px solid rgba(26,20,16,0.06)' }}
                title="Loading Method"
              >
                <span style={{ fontSize: 18 }}>🧱</span>
              </button>
              <button
                onClick={() => setSidebarCollapsed(false)}
                className="w-10 h-10 flex items-center justify-center rounded-xl"
                style={{ background: '#fffaf0', border: '1px solid rgba(26,20,16,0.06)' }}
                title="Container"
              >
                <span style={{ fontSize: 18 }}>🟧</span>
              </button>
              <button
                onClick={() => setSidebarCollapsed(false)}
                className="w-10 h-10 flex items-center justify-center rounded-xl"
                style={{ background: '#fffaf0', border: '1px solid rgba(26,20,16,0.06)' }}
                title="Products"
              >
                <span style={{ fontSize: 18 }}>📦</span>
              </button>
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto p-5 space-y-6 scrollbar-brut">
              <div>
                <p className="brut-section-label mb-4">Loading Method</p>
                <LoadingModeSelector
                  mode={loadingMode}
                  palletConfig={palletConfig}
                  onModeChange={setLoadingMode}
                  onPalletChange={setPalletConfig}
                />
              </div>

              <div className="brut-divider" />

              <div>
                <p className="brut-section-label mb-4">Container</p>
                <ContainerSelector
                  selected={selectedContainer}
                  onSelect={setSelectedContainer}
                />
              </div>

              <div className="brut-divider" />

              <div>
                <div className="flex items-center justify-between mb-3">
                  <p className="brut-section-label">Products</p>
                  <div className="flex p-0.5" style={{
                    background: '#fffaf0',
                    border: '1px solid rgba(26,20,16,0.06)',
                    borderRadius: 100,
                  }}>
                    {(['single', 'multi'] as const).map(mode => (
                      <button
                        key={mode}
                        onClick={() => {
                          setProductMode(mode);
                          if (mode === 'single') setProducts(prev => prev.slice(0, 1));
                        }}
                        className="px-3 py-1 text-[9px] font-semibold uppercase tracking-wider transition-all"
                        style={productMode === mode ? {
                          background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                          border: '1px solid rgba(255,255,255,0.28)',
                          borderRadius: 100,
                          color: '#fff',
                          boxShadow: '0 3px 12px rgba(245,158,11,0.30)',
                        } : {
                          background: 'transparent',
                          border: '1px solid transparent',
                          borderRadius: 100,
                          color: '#a89a8d',
                        }}
                      >
                        {mode === 'single' ? 'Single' : 'Multi (2–3)'}
                      </button>
                    ))}
                  </div>
                </div>
                <ProductForm
                  products={products}
                  unit={unit}
                  userId={user?.id}
                  onUpdate={handleUpdate}
                  onAdd={handleAdd}
                  onRemove={handleRemove}
                  onImportCSV={handleImportCSV}
                  onAddProduct={handleAddProduct}
                  maxProducts={productLimit}
                />
              </div>
            </div>
          )}
        </aside>

        {/* Centre — preview card. Capped width so it doesn't eat the results column. */}
        <main className="flex-1 min-w-0 flex flex-col overflow-hidden" style={{ background: 'transparent' }}>
          <div
            className="flex-1 min-h-0 mx-auto w-full overflow-hidden"
            style={{
              maxWidth: 880,
              background: '#ffffff',
              border: '1px solid rgba(26,20,16,0.06)',
              borderRadius: 24,
              boxShadow: '0 4px 24px rgba(26,20,16,0.06)',
            }}
          >
            <ContainerView2D
              result={packingResult}
              productColors={activeProductColors}
              unit={unit}
            />
          </div>

          {/* Below-preview drawer is only used at < lg — see right column for desktop */}
          <div className="lg:hidden shrink-0 overflow-y-auto max-h-48 sm:max-h-64 md:max-h-80 mt-3 p-4 scrollbar-brut" style={{
            background: '#ffffff',
            border: '1px solid rgba(26,20,16,0.06)',
            borderRadius: 24,
            boxShadow: '0 4px 24px rgba(26,20,16,0.06)',
          }}>
            {multiContainerResult && (
              <div className="mb-5">
                <MultiContainerPlanner
                  result={multiContainerResult}
                  selectedIndex={multiContainerIndex}
                  onSelectContainer={idx => setMultiContainerIndex(idx)}
                />
                <div className="brut-divider mt-5" />
              </div>
            )}
            <ResultsPanel
              result={packingResult}
              productColors={activeProductColors}
              unit={unit}
            />
          </div>
        </main>

        {/* Right results column — desktop only */}
        <aside
          className="hidden lg:flex flex-col overflow-hidden shrink-0"
          style={{
            width: 380,
            background: '#ffffff',
            border: '1px solid rgba(26,20,16,0.06)',
            borderRadius: 24,
            boxShadow: '0 4px 24px rgba(26,20,16,0.06)',
          }}
        >
          <div className="flex-1 overflow-y-auto p-4 scrollbar-brut">
            {multiContainerResult && (
              <div className="mb-4">
                <MultiContainerPlanner
                  result={multiContainerResult}
                  selectedIndex={multiContainerIndex}
                  onSelectContainer={idx => setMultiContainerIndex(idx)}
                />
                <div className="brut-divider mt-4" />
              </div>
            )}
            <ResultsPanel
              result={packingResult}
              productColors={activeProductColors}
              unit={unit}
            />
          </div>
        </aside>
      </div>
  );

  return (
    <div
      className="flex flex-col h-screen overflow-hidden"
      style={{ color: '#1a1410' }}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      <Header
        unit={unit}
        onUnitChange={setUnit}
        onOpenSaves={() => setSavesOpen(true)}
        sidebarOpen={sidebarOpen}
        onToggleSidebar={() => setSidebarOpen(o => !o)}
        activePage={activePage}
        onNavigate={navigateTo}
      />

      <Routes>
        <Route path="/" element={<Navigate to="/container" replace />} />
        <Route path="/container" element={calculatorContent} />
        <Route path="/costings" element={<div className="flex-1 overflow-hidden"><CostingsPage /></div>} />
        <Route path="*" element={<Navigate to="/container" replace />} />
      </Routes>

      {user && (
        <SavedLoadsPanel
          open={savesOpen}
          onClose={() => setSavesOpen(false)}
          userId={user.id}
          onLoadSelect={handleLoadSelect}
          onSaveRequest={handleSaveRequest}
          isSaving={isSaving}
        />
      )}

      {user && session && (
        <>
          <ChatPanel
            open={chatOpen}
            userId={user.id}
            session={session.access_token}
            firstName={firstName}
            context={chatContext}
            onApplyAction={handleAIAction}
          />
          <ChatFAB open={chatOpen} onClick={() => setChatOpen(o => !o)} />
        </>
      )}
    </div>
  );
}

export default function App() {
  const { user, loading } = useAuth();
  const [showAuth, setShowAuth] = useState(false);

  if (loading) return <LoadingScreen />;
  if (!user) {
    if (showAuth) return <AuthPage />;
    return <LandingPage onGetStarted={() => setShowAuth(true)} />;
  }
  return <MainApp />;
}
