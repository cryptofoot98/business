import { MessageCircle, X } from 'lucide-react';

interface Props {
  open: boolean;
  onClick: () => void;
}

export function ChatFAB({ open, onClick }: Props) {
  return (
    <button
      onClick={onClick}
      className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full flex items-center justify-center transition-all duration-200 hover:scale-105 active:scale-95"
      style={{
        background: 'linear-gradient(135deg, #16a34a, #15803d)',
        boxShadow: '0 4px 20px rgba(22,163,74,0.45), 0 2px 8px rgba(0,0,0,0.15)',
        border: '1px solid rgba(255,255,255,0.2)',
      }}
      aria-label={open ? 'Close AI assistant' : 'Open AI assistant'}
    >
      {open ? (
        <X size={22} className="text-white" />
      ) : (
        <MessageCircle size={22} className="text-white" />
      )}
    </button>
  );
}
