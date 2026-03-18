import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
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
import { PoultryModelPage } from './pages/PoultryModelPage';
import { useAuth } from './contexts/AuthContext';
import { ContainerType, LoadingMode, PalletConfig, Product, STANDARD_PALLETS, UnitSystem } from './types';
import { CONTAINERS } from './data/containers';
import { calculatePacking, calculateMultiContainer } from './utils/packing';
import { PRODUCT_COLORS, PRODUCT_LABELS, MAX_PRODUCTS } from './utils/colors';
import { saveLoad, SavedLoad } from './lib/loads';
import { AIChatAction, buildChatContext } from './lib/chat';
import { Loader } from 'lucide-react';

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
    <div className="h-screen bg-brut-hdr flex items-center justify-center">
      <div className="flex items-center gap-3 text-white">
        <Loader size={20} className="animate-spin text-white/60" />
        <span className="font-mono text-xs font-bold uppercase tracking-widest">Loading…</span>
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
  const [sidebarOpen, setSidebarOpen] = useState(false);
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

  const handleAdd = useCallback(() => {
    setProducts(prev => {
      if (prev.length >= MAX_PRODUCTS) return prev;
      return [...prev, makeProduct(prev.length)];
    });
  }, []);

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
      if (prev.length >= MAX_PRODUCTS) return prev;
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

  const [activePage, setActivePage] = useState<'calculator' | 'costings' | 'poultry'>('calculator');

  return (
    <div
      className="flex flex-col h-screen overflow-hidden bg-brut-bg text-brut-black"
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
        onNavigate={setActivePage}
      />

      {activePage === 'costings' && (
        <div className="flex-1 overflow-hidden">
          <CostingsPage />
        </div>
      )}

      {activePage === 'poultry' && (
        <div className="flex-1 overflow-hidden">
          <PoultryModelPage />
        </div>
      )}

      {activePage === 'calculator' && <div className="flex flex-1 overflow-hidden relative">
        {sidebarOpen && (
          <div
            className="fixed inset-0 bg-black/50 z-20 lg:hidden"
            style={{ top: 56 }}
            onClick={() => setSidebarOpen(false)}
          />
        )}

        <aside className={`
          fixed lg:relative
          left-0 lg:left-auto
          top-14 bottom-0 lg:top-auto lg:bottom-auto
          z-30 lg:z-auto
          w-80 shrink-0
          border-r-3 border-brut-hdr-dark
          flex flex-col overflow-hidden
          bg-brut-sidebar dark-chrome
          transition-transform duration-300 ease-in-out
          lg:translate-x-0
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        `}>
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
              <p className="brut-section-label mb-4">Products</p>
              <ProductForm
                products={products}
                unit={unit}
                userId={user?.id}
                onUpdate={handleUpdate}
                onAdd={handleAdd}
                onRemove={handleRemove}
                onImportCSV={handleImportCSV}
                onAddProduct={handleAddProduct}
              />
            </div>
          </div>
        </aside>

        <main className="flex-1 flex flex-col overflow-hidden bg-brut-bg">
          <div className="flex-1 min-h-0 p-2 sm:p-4">
            <div className="w-full h-full border-3 border-brut-black bg-white" style={{ boxShadow: '6px 6px 0px #0d0d0d' }}>
              <ContainerView2D
                result={packingResult}
                productColors={activeProductColors}
                unit={unit}
              />
            </div>
          </div>

          <div className="shrink-0 border-t-3 border-brut-black overflow-y-auto max-h-48 sm:max-h-64 md:max-h-80 lg:max-h-96 p-3 sm:p-5 bg-brut-paper scrollbar-brut">
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
      </div>}

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
