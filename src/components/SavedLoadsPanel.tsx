import { useEffect, useState, useRef } from 'react';
import { X, Trash2, FolderOpen, Loader, BookmarkPlus, Pencil, Check } from 'lucide-react';
import { SavedLoad, fetchLoads, deleteLoad, updateLoad } from '../lib/loads';
import { CONTAINERS } from '../data/containers';

interface Props {
  open: boolean;
  onClose: () => void;
  userId: string;
  onLoadSelect: (load: SavedLoad) => void;
  onSaveRequest: (name: string) => Promise<void>;
  isSaving: boolean;
}

function timeAgo(iso: string): string {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 7 * 86400) return `${Math.floor(diff / 86400)}d ago`;
  return new Date(iso).toLocaleDateString();
}

export function SavedLoadsPanel({ open, onClose, userId, onLoadSelect, onSaveRequest, isSaving }: Props) {
  const [loads, setLoads] = useState<SavedLoad[]>([]);
  const [fetching, setFetching] = useState(false);
  const [saveName, setSaveName] = useState('');
  const [saveError, setSaveError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const saveInputRef = useRef<HTMLInputElement>(null);

  const reload = async () => {
    setFetching(true);
    try {
      const data = await fetchLoads(userId);
      setLoads(data);
    } finally {
      setFetching(false);
    }
  };

  useEffect(() => {
    if (open) {
      reload();
      setTimeout(() => saveInputRef.current?.focus(), 100);
    }
  }, [open]);

  const handleSave = async () => {
    const trimmed = saveName.trim();
    if (!trimmed) { setSaveError('Enter a name for this load.'); return; }
    setSaveError(null);
    await onSaveRequest(trimmed);
    setSaveName('');
    await reload();
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      await deleteLoad(id);
      setLoads(prev => prev.filter(l => l.id !== id));
    } finally {
      setDeletingId(null);
    }
  };

  const handleRename = async (id: string) => {
    const trimmed = editName.trim();
    if (!trimmed) return;
    await updateLoad(id, trimmed);
    setLoads(prev => prev.map(l => l.id === id ? { ...l, name: trimmed } : l));
    setEditingId(null);
  };

  const getContainerLabel = (containerId: string) => {
    return CONTAINERS.find(c => c.id === containerId)?.shortName ?? containerId;
  };

  if (!open) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-40" onClick={onClose} />

      <div
        className="fixed right-0 top-0 h-full w-full max-w-sm z-50 flex flex-col bg-brut-sidebar overflow-hidden"
        style={{ borderLeft: '3px solid #0d0d0d', boxShadow: '-6px 0 0 #0d0d0d' }}
      >
        <div className="flex items-center justify-between px-5 py-4 shrink-0 bg-brut-hdr" style={{ borderBottom: '2px solid rgba(255,255,255,0.10)' }}>
          <div>
            <h2 className="font-black text-base uppercase tracking-tight text-white leading-none">Saved Loads</h2>
            <p className="font-mono text-[9px] uppercase tracking-widest text-white/40 mt-0.5 font-bold">
              {loads.length} load{loads.length !== 1 ? 's' : ''} saved
            </p>
          </div>
          <button onClick={onClose} className="p-1.5 text-white/50 hover:text-white transition-colors">
            <X size={18} strokeWidth={2.5} />
          </button>
        </div>

        <div className="p-4 shrink-0" style={{ borderBottom: '2px solid rgba(255,255,255,0.10)' }}>
          <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-white/38 mb-2.5">Save current configuration</p>
          <div className="flex gap-2">
            <input
              ref={saveInputRef}
              type="text"
              value={saveName}
              onChange={e => { setSaveName(e.target.value); setSaveError(null); }}
              onKeyDown={e => e.key === 'Enter' && handleSave()}
              placeholder="e.g. Xmas Shipment 2025"
              maxLength={80}
              className="flex-1 px-3 py-2.5 text-sm font-bold text-white placeholder-white/25 focus:outline-none"
              style={{
                background: 'rgba(255,255,255,0.07)',
                border: '2px solid rgba(255,255,255,0.18)',
              }}
            />
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="px-3.5 py-2.5 text-white text-xs font-black uppercase tracking-wider flex items-center gap-1.5 shrink-0 transition-colors"
              style={{ background: '#1572b6', border: '2px solid #0e5590' }}
            >
              {isSaving ? <Loader size={13} className="animate-spin" /> : <BookmarkPlus size={13} />}
              Save
            </button>
          </div>
          {saveError && <p className="font-mono text-[10px] font-bold text-brut-red mt-1.5">{saveError}</p>}
        </div>

        <div className="flex-1 overflow-y-auto scrollbar-brut dark-chrome">
          {fetching ? (
            <div className="flex items-center justify-center py-10">
              <Loader size={18} className="animate-spin text-white/40" />
            </div>
          ) : loads.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
              <FolderOpen size={28} className="mb-3" style={{ color: 'rgba(255,255,255,0.15)' }} />
              <p className="font-mono text-[10px] font-bold uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.25)' }}>No saved loads yet</p>
              <p className="font-mono text-[9px] mt-1" style={{ color: 'rgba(255,255,255,0.15)' }}>Configure a load above and save it</p>
            </div>
          ) : (
            <div className="p-4 space-y-2.5">
              {loads.map(load => {
                const isEditing = editingId === load.id;
                const isDeleting = deletingId === load.id;

                return (
                  <div
                    key={load.id}
                    className="overflow-hidden"
                    style={{ border: '2px solid rgba(255,255,255,0.12)', background: 'rgba(255,255,255,0.05)' }}
                  >
                    <div className="px-3.5 pt-3 pb-2.5">
                      {isEditing ? (
                        <div className="flex items-center gap-2 mb-2">
                          <input
                            type="text"
                            value={editName}
                            onChange={e => setEditName(e.target.value)}
                            onKeyDown={e => { if (e.key === 'Enter') handleRename(load.id); if (e.key === 'Escape') setEditingId(null); }}
                            autoFocus
                            maxLength={80}
                            className="flex-1 px-2 py-1 text-sm font-bold text-white focus:outline-none"
                            style={{ background: 'rgba(255,255,255,0.10)', border: '2px solid #1572b6' }}
                          />
                          <button onClick={() => handleRename(load.id)} className="p-1 text-brut-green hover:text-white">
                            <Check size={14} />
                          </button>
                          <button onClick={() => setEditingId(null)} className="p-1 hover:text-white" style={{ color: 'rgba(255,255,255,0.35)' }}>
                            <X size={14} />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-start justify-between gap-2 mb-1.5">
                          <span className="font-black text-sm text-white leading-tight flex-1">{load.name}</span>
                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              onClick={() => { setEditingId(load.id); setEditName(load.name); }}
                              className="p-1 hover:text-white transition-colors"
                              style={{ color: 'rgba(255,255,255,0.25)' }}
                            >
                              <Pencil size={11} />
                            </button>
                            <button
                              onClick={() => handleDelete(load.id)}
                              disabled={isDeleting}
                              className="p-1 hover:text-brut-red transition-colors"
                              style={{ color: 'rgba(255,255,255,0.25)' }}
                            >
                              {isDeleting ? <Loader size={11} className="animate-spin" /> : <Trash2 size={11} />}
                            </button>
                          </div>
                        </div>
                      )}

                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className="inline-flex items-center px-1.5 py-0.5 font-mono text-[9px] font-bold uppercase"
                          style={{ background: 'rgba(27,107,64,0.50)', border: '1px solid rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.75)' }}
                        >
                          {getContainerLabel(load.container_id)}
                        </span>
                        <span
                          className="inline-flex items-center px-1.5 py-0.5 font-mono text-[9px] font-bold uppercase"
                          style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.50)' }}
                        >
                          {load.loading_mode}
                        </span>
                        <span
                          className="inline-flex items-center px-1.5 py-0.5 font-mono text-[9px] font-bold uppercase"
                          style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.50)' }}
                        >
                          {(load.products as { id: string }[]).length} product{(load.products as { id: string }[]).length !== 1 ? 's' : ''}
                        </span>
                      </div>

                      <p className="font-mono text-[9px] mt-1.5" style={{ color: 'rgba(255,255,255,0.25)' }}>{timeAgo(load.updated_at)}</p>
                    </div>

                    <button
                      onClick={() => { onLoadSelect(load); onClose(); }}
                      className="w-full py-2 text-[10px] font-black uppercase tracking-wider text-center transition-all"
                      style={{
                        color: 'rgba(255,255,255,0.50)',
                        background: 'rgba(255,255,255,0.04)',
                        borderTop: '2px solid rgba(255,255,255,0.10)',
                      }}
                      onMouseEnter={e => {
                        (e.currentTarget as HTMLButtonElement).style.background = 'rgba(27,107,64,0.40)';
                        (e.currentTarget as HTMLButtonElement).style.color = '#fff';
                      }}
                      onMouseLeave={e => {
                        (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.04)';
                        (e.currentTarget as HTMLButtonElement).style.color = 'rgba(255,255,255,0.50)';
                      }}
                    >
                      Load this configuration
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
