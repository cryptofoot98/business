import { useState, useEffect } from 'react';
import { Icon, Spinner } from './Icon';
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
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(6px)' }}
    >
      <div
        className="w-full max-w-md rounded-2xl overflow-hidden"
        style={{ background: 'rgba(255,255,255,0.92)', border: '1px solid rgba(245, 158, 11, 0.18)', boxShadow: '0 20px 60px rgba(0,0,0,0.18), 0 4px 20px rgba(245, 158, 11, 0.12)' }}
      >
        {/* Modal header */}
        <div
          className="flex items-center justify-between px-5 py-4"
          style={{ background: 'linear-gradient(135deg, #1a1410, #d97706)', borderBottom: '1px solid rgba(245, 158, 11, 0.2)' }}
        >
          <div className="flex items-center gap-2.5">
            <Icon name="package" size={15} className="text-white/80" />
            <span className="text-sm font-semibold uppercase tracking-tight text-white">Saved Products</span>
          </div>
          <button
            onClick={onClose}
            className="transition-colors"
            style={{ color: 'rgba(255,255,255,0.5)' }}
            onMouseEnter={e => (e.currentTarget.style.color = '#fff')}
            onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.5)')}
          >
            <Icon name="close" size={16} />
          </button>
        </div>

        {/* Product list */}
        <div className="p-4 max-h-96 overflow-y-auto" style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(245, 158, 11, 0.22) transparent' }}>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Spinner size={18}  style={{ color: 'rgba(90, 74, 61, 0.3)' }} />
            </div>
          ) : products.length === 0 ? (
            <div className="text-center py-8">
              <Icon name="package" size={28} className="mx-auto mb-3" style={{ color: 'rgba(90, 74, 61, 0.15)' }} />
              <p className="font-mono text-xs font-semibold uppercase tracking-widest" style={{ color: 'rgba(90, 74, 61, 0.3)' }}>No saved products yet</p>
              <p className="font-mono text-[10px] mt-1.5" style={{ color: 'rgba(90, 74, 61, 0.22)' }}>Use the bookmark icon on any product to save it</p>
            </div>
          ) : (
            <div className="space-y-2">
              {products.map((sp, idx) => {
                const color = PRODUCT_COLORS[idx % PRODUCT_COLORS.length];
                return (
                  <div
                    key={sp.id}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all"
                    style={{ background: 'rgba(255,255,255,0.8)', border: '1px solid rgba(245, 158, 11, 0.12)', borderLeft: `3px solid ${color}` }}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-mono text-xs font-semibold uppercase truncate" style={{ color: '#1a1410' }}>
                        {sp.name || 'Untitled'}
                      </p>
                      <p className="font-mono text-[10px] mt-0.5" style={{ color: 'rgba(90, 74, 61, 0.4)' }}>
                        {sp.length} × {sp.width} × {sp.height} cm &bull; {sp.gross_weight} kg
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        onClick={() => handleLoad(sp)}
                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-full text-[10px] font-semibold uppercase tracking-wider text-white transition-all"
                        style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)', boxShadow: '0 2px 8px rgba(245, 158, 11, 0.3)' }}
                      >
                        <Icon name="plus" size={9} />
                        Load
                      </button>
                      <button
                        onClick={() => handleDelete(sp.id)}
                        disabled={deletingId === sp.id}
                        className="p-1.5 rounded-full transition-all disabled:opacity-40"
                        style={{ color: 'rgba(90, 74, 61, 0.35)' }}
                        onMouseEnter={e => (e.currentTarget.style.color = '#dc2626')}
                        onMouseLeave={e => (e.currentTarget.style.color = 'rgba(90, 74, 61, 0.35)')}
                      >
                        {deletingId === sp.id ? <Spinner size={11} /> : <Icon name="trash" size={11} />}
                      </button>
                    </div>
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
