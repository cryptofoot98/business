import { useEffect, useRef, useState, KeyboardEvent } from 'react';
import { Send, Trash2, Loader } from 'lucide-react';
import {
  AIChatAction,
  ChatMessage,
  callAIChat,
  clearChatMessages,
  fetchChatMessages,
  insertChatMessage,
} from '../../lib/chat';

interface Props {
  open: boolean;
  userId: string;
  session: string;
  firstName: string;
  onApplyAction: (action: AIChatAction) => void;
}

export function ChatPanel({ open, userId, session, firstName, onApplyAction }: Props) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [initialized, setInitialized] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!open) return;
    if (initialized) return;

    (async () => {
      const existing = await fetchChatMessages(userId);
      if (existing.length === 0) {
        const greeting = await insertChatMessage(
          userId,
          'assistant',
          `Hi ${firstName}`,
          null,
        );
        setMessages([greeting]);
      } else {
        setMessages(existing);
      }
      setInitialized(true);
    })();
  }, [open, userId, firstName, initialized]);

  useEffect(() => {
    if (open) {
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 80);
    }
  }, [messages, open]);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 150);
  }, [open]);

  const send = async () => {
    const text = input.trim();
    if (!text || loading) return;
    setInput('');

    const userMsg = await insertChatMessage(userId, 'user', text, null);
    setMessages(prev => [...prev, userMsg]);

    setLoading(true);
    try {
      const history = [...messages, userMsg].map(m => ({ role: m.role, content: m.content }));
      const { message, action } = await callAIChat(history, session);

      const assistantMsg = await insertChatMessage(userId, 'assistant', message, action);
      setMessages(prev => [...prev, assistantMsg]);

      if (action) {
        onApplyAction(action);
      }
    } catch {
      const errMsg = await insertChatMessage(
        userId,
        'assistant',
        'Something went wrong. Please try again.',
        null,
      );
      setMessages(prev => [...prev, errMsg]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  const handleClear = async () => {
    await clearChatMessages(userId);
    setMessages([]);
    setInitialized(false);
  };

  return (
    <div
      className={`fixed bottom-0 right-0 z-40 flex flex-col transition-all duration-300 ease-in-out ${
        open ? 'translate-y-0 opacity-100 pointer-events-auto' : 'translate-y-4 opacity-0 pointer-events-none'
      }`}
      style={{
        width: '420px',
        height: 'calc(100vh - 64px)',
        bottom: '0',
        right: '0',
      }}
    >
      <div
        className="flex flex-col h-full border-l-2 border-t-2 border-brut-hdr-dark"
        style={{ backgroundColor: '#091520' }}
      >
        <div
          className="flex items-center justify-between px-5 py-4 border-b-2 border-brut-hdr-dark shrink-0"
          style={{ backgroundColor: '#0e1a14' }}
        >
          <div className="flex items-center gap-2.5">
            <div className="w-2 h-2 rounded-full bg-brut-hdr" />
            <span className="font-mono text-xs font-bold uppercase tracking-widest text-white/70">
              AI Assistant
            </span>
          </div>
          <button
            onClick={handleClear}
            className="text-white/40 hover:text-white/70 transition-colors"
            title="Clear conversation"
          >
            <Trash2 size={14} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 scrollbar-brut">
          {messages.map(msg => (
            <div
              key={msg.id}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[85%] px-4 py-3 text-sm leading-relaxed ${
                  msg.role === 'user'
                    ? 'bg-brut-hdr text-white border-2 border-brut-hdr-dark'
                    : 'bg-white/10 text-white/90 border-2 border-white/10'
                }`}
                style={{
                  boxShadow: msg.role === 'user'
                    ? '2px 2px 0px rgba(0,0,0,0.4)'
                    : '2px 2px 0px rgba(0,0,0,0.2)',
                }}
              >
                {msg.content}
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex justify-start">
              <div
                className="px-4 py-3 bg-white/10 border-2 border-white/10"
                style={{ boxShadow: '2px 2px 0px rgba(0,0,0,0.2)' }}
              >
                <Loader size={14} className="animate-spin text-white/50" />
              </div>
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        <div
          className="shrink-0 border-t-2 border-brut-hdr-dark p-4"
          style={{ backgroundColor: '#0e1a14' }}
        >
          <div className="flex gap-3 items-end">
            <textarea
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              rows={1}
              placeholder="Ask me about your container load..."
              className="flex-1 resize-none bg-white/8 border-2 border-white/15 text-white text-sm px-4 py-3 placeholder-white/30 outline-none focus:border-brut-hdr transition-colors leading-relaxed"
              style={{
                minHeight: '46px',
                maxHeight: '120px',
                backgroundColor: 'rgba(255,255,255,0.06)',
              }}
            />
            <button
              onClick={send}
              disabled={!input.trim() || loading}
              className="w-11 h-11 bg-brut-hdr flex items-center justify-center border-2 border-brut-hdr-dark transition-all hover:scale-105 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
              style={{ boxShadow: '2px 2px 0px #0d0d0d' }}
            >
              <Send size={15} className="text-white" />
            </button>
          </div>
          <p className="mt-2 font-mono text-[9px] text-white/25 tracking-wider">
            ENTER to send · SHIFT+ENTER for new line
          </p>
        </div>
      </div>
    </div>
  );
}
