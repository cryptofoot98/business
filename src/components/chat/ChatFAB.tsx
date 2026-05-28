import { Icon } from '../Icon';
import { palette, shadows } from '../../data/designTokens';

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
        background: `linear-gradient(135deg, ${palette.amber}, ${palette.amberDeep})`,
        boxShadow: shadows.amber,
        border: '1px solid rgba(255,255,255,0.30)',
        color: '#fff',
      }}
      aria-label={open ? 'Close AI assistant' : 'Open AI assistant'}
    >
      <Icon name={open ? 'close' : 'message'} size={22} style={{ color: '#fff' }} />
    </button>
  );
}
