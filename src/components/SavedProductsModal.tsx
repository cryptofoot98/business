import { useState, useEffect } from 'react';
import { Trash2, Plus, Package } from 'lucide-react';
import { SavedProduct, fetchSavedProducts, deleteSavedProduct } from '../lib/savedProducts';
import { Product } from '../types';
import { PRODUCT_COLORS } from '../utils/colors';

interface Props {
  userId: string;
  onLoad: (product: Omit<Product, 'id' | 'color'>) => void;
  onClose: () => void;
}

export function SavedProductsModal({ userId, onLoad, onClose }: Props) {
  const [products, setProducts] = useState<SavedProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    fetchSavedProducts(userId)
      .then(setProducts)
      .finally(() => setLoading(false));
  }, [userId]);

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    await deleteSavedProduct(id);
    setProducts(prev => prev.filter(p => p.id !== id));
    setDeletingId(null);
  };

  const handleLoad = (sp: SavedProduct) => {
    onLoad({
      name: sp.name,
      length: sp.length,
      width: sp.width,
      height: sp.height,
      netWeight: sp.net_weight,
      grossWeight: sp.gross_weight,
      quantity: sp.quantity ?? undefined,
      stackable: sp.stackable,
      fragile: sp.fragile,
      orientationLock: sp.orientation_lock,
      priority: sp.priority,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-md bg-brut-paper border-3 border-brut-black overflow-hidden" style={{ boxShadow: '8px 8px 0px #0d0d0d' }}>
        <div className="flex items-center justify-between px-5 py-4 bg-brut-black">
          <div className="flex items-center gap-2">
            <Package size={14} className="text-white" />
            <span className="text-sm font-black uppercase tracking-tight text-white">Saved Products</span>
          </div>
          <button onClick={onClose} className="text-white/60 hover:text-white transition-colors">
            ✕
          </button>
        </div>

        <div className="p-4 max-h-96 overflow-y-auto">
          {loading ? (
            <p className="font-mono text-xs text-brut-black/40 uppercase text-center py-6">Loading...</p>
          ) : products.length === 0 ? (
            <div className="text-center py-8">
              <Package size={28} className="mx-auto mb-3 text-brut-black/20" />
              <p className="font-mono text-xs font-bold uppercase tracking-widest text-brut-black/30">No saved products yet</p>
              <p className="font-mono text-[10px] text-brut-black/25 mt-1.5">Use the bookmark icon on any product to save it</p>
            </div>
          ) : (
            <div className="space-y-2">
              {products.map((sp, idx) => (
                <div
                  key={sp.id}
                  className="flex items-center gap-3 p-3 border-2 border-brut-black bg-white hover:bg-brut-bg transition-all"
                  style={{ boxShadow: `3px 3px 0px ${PRODUCT_COLORS[idx % PRODUCT_COLORS.length]}` }}
                >
                  <div
                    className="w-3 h-3 shrink-0 border border-brut-black/20"
                    style={{ backgroundColor: PRODUCT_COLORS[idx % PRODUCT_COLORS.length] }}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="font-mono text-xs font-black uppercase truncate text-brut-black">{sp.name || 'Untitled'}</p>
                    <p className="font-mono text-[10px] text-brut-black/40">
                      {sp.length} × {sp.width} × {sp.height} cm &bull; {sp.gross_weight} kg
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      onClick={() => handleLoad(sp)}
                      className="flex items-center gap-1 px-2.5 py-1.5 bg-brut-black text-white text-[10px] font-black uppercase tracking-wider hover:bg-brut-red transition-all border-2 border-brut-black"
                    >
                      <Plus size={9} />
                      Load
                    </button>
                    <button
                      onClick={() => handleDelete(sp.id)}
                      disabled={deletingId === sp.id}
                      className="p-1.5 border-2 border-brut-black bg-white hover:bg-brut-red hover:text-white text-brut-black/50 transition-all disabled:opacity-40"
                    >
                      <Trash2 size={11} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
