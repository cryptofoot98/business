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
      <div className="fixed inset-0 z-40" style={{ background: 'rgba(26,20,16,0.35)', backdropFilter: 'blur(4px)' }} onClick={onClose} />

      <div
        className="fixed right-3 top-3 bottom-3 w-full max-w-sm z-50 flex flex-col overflow-hidden"
        style={{
          background: '#ffffff',
          border: '1px solid rgba(26,20,16,0.06)',
          borderRadius: 24,
          boxShadow: '0 16px 48px rgba(26,20,16,0.14)',
        }}
      >
        {/* Header — soft amber band, matches chat panel header */}
        <div
          className="flex items-center justify-between px-5 py-4 shrink-0"
          style={{
            background: 'linear-gradient(135deg, #fef3c7, #fed7aa)',
            borderBottom: '1px solid rgba(26,20,16,0.06)',
          }}
        >
          <div className="flex items-center gap-2 min-w-0">
            <span style={{ fontSize: 16 }}>📁</span>
            <div>
              <h2 className="text-xs font-bold uppercase tracking-widest" style={{ color: '#78350f' }}>
                Saved Loads
              </h2>
              <p className="text-[10px] mt-0.5" style={{ color: 'rgba(120,53,15,0.65)' }}>
                {loads.length} load{loads.length !== 1 ? 's' : ''} saved
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full transition-colors shrink-0"
            style={{ color: 'rgba(120,53,15,0.6)', background: 'rgba(255,255,255,0.5)' }}
          >
            <Icon name="close" size={14} />
          </button>
        </div>

        {/* Save section */}
        <div className="p-4 shrink-0" style={{ borderBottom: '1px solid rgba(26,20,16,0.06)', background: '#ffffff' }}>
          <p className="text-[10px] font-semibold uppercase tracking-widest mb-2.5" style={{ color: 'rgba(90,74,61,0.55)' }}>
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
              className="flex-1 px-3 py-2.5 text-sm focus:outline-none transition-all"
              style={{
                background: '#fffaf0',
                border: '1px solid rgba(26,20,16,0.08)',
                borderRadius: 12,
                color: '#1a1410',
              }}
              onFocus={e => (e.currentTarget.style.borderColor = '#f59e0b')}
              onBlur={e => (e.currentTarget.style.borderColor = 'rgba(26,20,16,0.08)')}
            />
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="px-3.5 py-2.5 text-xs font-semibold uppercase tracking-wider flex items-center gap-1.5 shrink-0 transition-all disabled:opacity-40"
              style={{
                background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                color: '#fff',
                borderRadius: 12,
                boxShadow: '0 6px 20px rgba(245, 158, 11, 0.30)',
                border: '1px solid rgba(255,255,255,0.30)',
              }}
            >
              {isSaving ? <Spinner size={13} /> : <Icon name="bookmarkplus" size={13} />}
              Save
            </button>
          </div>
          {saveError && (
            <p className="text-[10px] mt-1.5 font-semibold" style={{ color: '#dc2626' }}>{saveError}</p>
          )}
        </div>

        {/* Load list */}
        <div className="flex-1 overflow-y-auto" style={{ background: '#fffaf0' }}>
          {fetching ? (
            <div className="flex items-center justify-center py-10">
              <Spinner size={18} style={{ color: '#d97706' }} />
            </div>
          ) : loads.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
              <Icon name="folder" size={28} className="mb-3" style={{ color: 'rgba(90,74,61,0.25)' }} />
              <p className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: 'rgba(90,74,61,0.55)' }}>
                No saved loads yet
              </p>
              <p className="text-[10px] mt-1" style={{ color: 'rgba(90,74,61,0.4)' }}>
                Configure a load above and save it
              </p>
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
                    style={{
                      background: '#ffffff',
                      border: '1px solid rgba(26,20,16,0.06)',
                      borderRadius: 16,
                      boxShadow: '0 2px 8px rgba(26,20,16,0.04)',
                    }}
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
                            className="flex-1 px-2 py-1 text-sm focus:outline-none"
                            style={{ background: '#fffaf0', border: '1px solid #f59e0b', borderRadius: 8, color: '#1a1410' }}
                          />
                          <button onClick={() => handleRename(load.id)} className="p-1.5 rounded-full" style={{ color: '#10b981', background: 'rgba(16,185,129,0.10)' }}>
                            <Icon name="check" size={12} />
                          </button>
                          <button onClick={() => setEditingId(null)} className="p-1.5 rounded-full" style={{ color: 'rgba(90,74,61,0.5)', background: '#fffaf0' }}>
                            <Icon name="close" size={12} />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <span className="font-semibold text-sm leading-tight flex-1" style={{ color: '#1a1410' }}>{load.name}</span>
                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              onClick={() => { setEditingId(load.id); setEditName(load.name); }}
                              className="p-1.5 rounded-full transition-colors"
                              style={{ color: 'rgba(90,74,61,0.5)' }}
                              onMouseEnter={e => { e.currentTarget.style.color = '#d97706'; e.currentTarget.style.background = '#fef3c7'; }}
                              onMouseLeave={e => { e.currentTarget.style.color = 'rgba(90,74,61,0.5)'; e.currentTarget.style.background = 'transparent'; }}
                              title="Rename"
                            >
                              <Icon name="pencil" size={11} />
                            </button>
                            <button
                              onClick={() => handleDelete(load.id)}
                              disabled={isDeleting}
                              className="p-1.5 rounded-full transition-colors"
                              style={{ color: 'rgba(90,74,61,0.5)' }}
                              onMouseEnter={e => { e.currentTarget.style.color = '#dc2626'; e.currentTarget.style.background = 'rgba(220,38,38,0.08)'; }}
                              onMouseLeave={e => { e.currentTarget.style.color = 'rgba(90,74,61,0.5)'; e.currentTarget.style.background = 'transparent'; }}
                              title="Delete"
                            >
                              {isDeleting ? <Spinner size={11} /> : <Icon name="trash" size={11} />}
                            </button>
                          </div>
                        </div>
                      )}

                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span
                          className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wide"
                          style={{ background: '#fef3c7', border: '1px solid rgba(245,158,11,0.28)', color: '#78350f' }}
                        >
                          {getContainerLabel(load.container_id)}
                        </span>
                        <span
                          className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wide"
                          style={{ background: '#fffaf0', border: '1px solid rgba(26,20,16,0.08)', color: 'rgba(90,74,61,0.75)' }}
                        >
                          {load.loading_mode}
                        </span>
                        <span
                          className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wide"
                          style={{ background: '#fffaf0', border: '1px solid rgba(26,20,16,0.08)', color: 'rgba(90,74,61,0.75)' }}
                        >
                          {(load.products as { id: string }[]).length} product{(load.products as { id: string }[]).length !== 1 ? 's' : ''}
                        </span>
                      </div>

                      <p className="text-[10px] mt-2" style={{ color: 'rgba(90,74,61,0.45)' }}>{timeAgo(load.updated_at)}</p>
                    </div>

                    <button
                      onClick={() => { onLoadSelect(load); onClose(); }}
                      className="w-full py-2.5 text-[10px] font-semibold uppercase tracking-wider text-center transition-all"
                      style={{
                        color: '#d97706',
                        background: '#fef3c7',
                        borderTop: '1px solid rgba(245,158,11,0.20)',
                      }}
                      onMouseEnter={e => {
                        (e.currentTarget as HTMLButtonElement).style.background = '#fed7aa';
                        (e.currentTarget as HTMLButtonElement).style.color = '#b45309';
                      }}
                      onMouseLeave={e => {
                        (e.currentTarget as HTMLButtonElement).style.background = '#fef3c7';
                        (e.currentTarget as HTMLButtonElement).style.color = '#d97706';
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
