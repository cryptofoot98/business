import { MessageCircle, X } from 'lucide-react';

interface Props {
  open: boolean;
  onClick: () => void;
}

export function ChatFAB({ open, onClick }: Props) {
  return (
    <button
      onClick={onClick}
      className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full bg-brut-hdr flex items-center justify-center shadow-lg border-2 border-brut-hdr-dark transition-transform duration-200 hover:scale-105 active:scale-95"
      style={{ boxShadow: '3px 3px 0px #0d0d0d' }}
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
