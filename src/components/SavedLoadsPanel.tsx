import { useEffect, useState, useRef } from 'react';
import { Icon, Spinner } from './Icon';
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

  const getContainerLabel = (containerId: string) =>
    CONTAINERS.find(c => c.id === containerId)?.shortName ?? containerId;

  if (!open) return null;

  return (
    <>
      <div className="fixed inset-0 z-40" style={{ background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(4px)' }} onClick={onClose} />

      <div
        className="fixed right-0 top-0 h-full w-full max-w-sm z-50 flex flex-col overflow-hidden"
        style={{
          background: 'linear-gradient(180deg, #0a2218 0%, #0d2d1e 100%)',
          borderLeft: '1px solid rgba(255,255,255,0.08)',
          boxShadow: '-20px 0 60px rgba(0,0,0,0.35)',
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-5 py-4 shrink-0"
          style={{ borderBottom: '1px solid rgba(255,255,255,0.07)', background: 'rgba(255,255,255,0.03)' }}
        >
          <div>
            <h2 className="font-bold text-base uppercase tracking-tight text-white leading-none">Saved Loads</h2>
            <p className="font-mono text-[9px] uppercase tracking-widest mt-0.5" style={{ color: 'rgba(255,255,255,0.35)' }}>
              {loads.length} load{loads.length !== 1 ? 's' : ''} saved
            </p>
          </div>
          <button onClick={onClose} className="p-1.5 transition-colors" style={{ color: 'rgba(255,255,255,0.4)' }}
            onMouseEnter={e => (e.currentTarget.style.color = '#fff')}
            onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.4)')}
          >
            <Icon name="close" size={18} />
          </button>
        </div>

        {/* Save section */}
        <div className="p-4 shrink-0" style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
          <p className="font-mono text-[10px] font-semibold uppercase tracking-widest mb-2.5" style={{ color: 'rgba(255,255,255,0.3)' }}>
            Save current configuration
          </p>
          <div className="flex gap-2">
            <input
              ref={saveInputRef}
              type="text"
              value={saveName}
              onChange={e => { setSaveName(e.target.value); setSaveError(null); }}
              onKeyDown={e => e.key === 'Enter' && handleSave()}
              placeholder="e.g. Xmas Shipment 2025"
              maxLength={80}
              className="flex-1 px-3 py-2.5 text-sm font-medium text-white placeholder:text-white/25 focus:outline-none rounded-xl transition-all"
              style={{
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.14)',
              }}
              onFocus={e => (e.currentTarget.style.borderColor = 'rgba(245, 158, 11, 0.5)')}
              onBlur={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.14)')}
            />
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="px-3.5 py-2.5 text-white text-xs font-semibold uppercase tracking-wider flex items-center gap-1.5 shrink-0 transition-all rounded-xl"
              style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)', boxShadow: '0 2px 10px rgba(245, 158, 11, 0.35)' }}
            >
              {isSaving ? <Spinner size={13} /> : <Icon name="bookmarkplus" size={13} />}
              Save
            </button>
          </div>
          {saveError && <p className="font-mono text-[10px] font-semibold mt-1.5" style={{ color: '#f87171' }}>{saveError}</p>}
        </div>

        {/* Load list */}
        <div className="flex-1 overflow-y-auto" style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(245, 158, 11, 0.22) transparent' }}>
          {fetching ? (
            <div className="flex items-center justify-center py-10">
              <Spinner size={18}  style={{ color: 'rgba(255,255,255,0.3)' }} />
            </div>
          ) : loads.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
              <Icon name="folder" size={28} className="mb-3" style={{ color: 'rgba(255,255,255,0.12)' }} />
              <p className="font-mono text-[10px] font-semibold uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.22)' }}>No saved loads yet</p>
              <p className="font-mono text-[9px] mt-1" style={{ color: 'rgba(255,255,255,0.14)' }}>Configure a load above and save it</p>
            </div>
          ) : (
            <div className="p-4 space-y-2.5">
              {loads.map(load => {
                const isEditing = editingId === load.id;
                const isDeleting = deletingId === load.id;

                return (
                  <div
                    key={load.id}
                    className="rounded-2xl overflow-hidden"
                    style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.09)' }}
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
                            className="flex-1 px-2 py-1 text-sm font-medium text-white focus:outline-none rounded-lg"
                            style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(245, 158, 11, 0.4)' }}
                          />
                          <button onClick={() => handleRename(load.id)} style={{ color: '#4ade80' }}>
                            <Icon name="check" size={14} />
                          </button>
                          <button onClick={() => setEditingId(null)} style={{ color: 'rgba(255,255,255,0.3)' }}>
                            <Icon name="close" size={14} />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-start justify-between gap-2 mb-1.5">
                          <span className="font-semibold text-sm text-white leading-tight flex-1">{load.name}</span>
                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              onClick={() => { setEditingId(load.id); setEditName(load.name); }}
                              style={{ color: 'rgba(255,255,255,0.22)', padding: 4 }}
                              onMouseEnter={e => (e.currentTarget.style.color = '#fff')}
                              onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.22)')}
                            >
                              <Icon name="pencil" size={11} />
                            </button>
                            <button
                              onClick={() => handleDelete(load.id)}
                              disabled={isDeleting}
                              style={{ color: 'rgba(255,255,255,0.22)', padding: 4 }}
                              onMouseEnter={e => (e.currentTarget.style.color = '#f87171')}
                              onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.22)')}
                            >
                              {isDeleting ? <Spinner size={11} /> : <Icon name="trash" size={11} />}
                            </button>
                          </div>
                        </div>
                      )}

                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span
                          className="inline-flex items-center px-2 py-0.5 rounded-full font-mono text-[9px] font-semibold uppercase"
                          style={{ background: 'rgba(245, 158, 11, 0.25)', border: '1px solid rgba(245, 158, 11, 0.35)', color: 'rgba(134,239,172,0.9)' }}
                        >
                          {getContainerLabel(load.container_id)}
                        </span>
                        <span
                          className="inline-flex items-center px-2 py-0.5 rounded-full font-mono text-[9px] font-semibold uppercase"
                          style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.45)' }}
                        >
                          {load.loading_mode}
                        </span>
                        <span
                          className="inline-flex items-center px-2 py-0.5 rounded-full font-mono text-[9px] font-semibold uppercase"
                          style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.45)' }}
                        >
                          {(load.products as { id: string }[]).length} product{(load.products as { id: string }[]).length !== 1 ? 's' : ''}
                        </span>
                      </div>

                      <p className="font-mono text-[9px] mt-1.5" style={{ color: 'rgba(255,255,255,0.2)' }}>{timeAgo(load.updated_at)}</p>
                    </div>

                    <button
                      onClick={() => { onLoadSelect(load); onClose(); }}
                      className="w-full py-2.5 text-[10px] font-semibold uppercase tracking-wider text-center transition-all rounded-none"
                      style={{
                        color: 'rgba(134,239,172,0.6)',
                        background: 'rgba(245, 158, 11, 0.07)',
                        borderTop: '1px solid rgba(245, 158, 11, 0.15)',
                      }}
                      onMouseEnter={e => {
                        (e.currentTarget as HTMLButtonElement).style.background = 'rgba(245, 158, 11, 0.18)';
                        (e.currentTarget as HTMLButtonElement).style.color = 'rgba(134,239,172,1)';
                      }}
                      onMouseLeave={e => {
                        (e.currentTarget as HTMLButtonElement).style.background = 'rgba(245, 158, 11, 0.07)';
                        (e.currentTarget as HTMLButtonElement).style.color = 'rgba(134,239,172,0.6)';
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
