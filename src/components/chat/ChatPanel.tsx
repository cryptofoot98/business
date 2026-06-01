import { useEffect, useRef, useState, KeyboardEvent } from 'react';
import { Icon, Spinner } from '../Icon';
import {
  AIChatAction,
  AIChatContext,
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
  context: AIChatContext;
  onApplyAction: (action: AIChatAction) => void;
}

export function ChatPanel({ open, userId, session, firstName, context, onApplyAction }: Props) {
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
          `Hi ${firstName}. I can see your current load setup. Ask me to optimize it, change dimensions, or explain any result.`,
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
      const { message, action } = await callAIChat(history, session, context);

      const assistantMsg = await insertChatMessage(userId, 'assistant', message, action);
      setMessages(prev => [...prev, assistantMsg]);

      if (action && action.type !== 'suggest_only') {
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

  const contextSummary = context.result
    ? `${context.container.name} · ${context.result.total_boxes} boxes · ${context.result.volume_utilization_pct}% vol`
    : `${context.container.name} · no result yet`;

  return (
    <div
      className={`fixed z-40 flex flex-col transition-all duration-300 ease-in-out ${
        open ? 'translate-y-0 opacity-100 pointer-events-auto' : 'translate-y-4 opacity-0 pointer-events-none'
      }`}
      style={{
        width: 'min(420px, calc(100vw - 32px))',
        height: 'min(640px, calc(100vh - 140px))',
        bottom: 96,
        right: 24,
      }}
    >
      <div
        className="flex flex-col h-full overflow-hidden"
        style={{
          background: '#ffffff',
          border: '1px solid rgba(26,20,16,0.06)',
          borderRadius: 24,
          boxShadow: '0 16px 48px rgba(26,20,16,0.14)',
        }}
      >
        {/* Header band — soft amber tint */}
        <div
          className="flex items-center justify-between px-5 py-4 shrink-0"
          style={{
            background: 'linear-gradient(135deg, #fef3c7, #fed7aa)',
            borderBottom: '1px solid rgba(26,20,16,0.06)',
          }}
        >
          <div className="flex flex-col gap-0.5 min-w-0">
            <div className="flex items-center gap-2">
              <span style={{ fontSize: 14 }}>🤖</span>
              <span className="text-xs font-bold uppercase tracking-widest" style={{ color: '#78350f' }}>
                AI Loading Advisor
              </span>
            </div>
            <span className="text-[10px] mt-0.5 truncate" style={{ color: 'rgba(120,53,15,0.65)' }}>{contextSummary}</span>
          </div>
          <button
            onClick={handleClear}
            className="p-1.5 rounded-full transition-colors shrink-0"
            style={{ color: 'rgba(120,53,15,0.6)', background: 'rgba(255,255,255,0.5)' }}
            title="Clear conversation"
          >
            <Icon name="trash" size={13} />
          </button>
        </div>

        {/* Message stream */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3" style={{ background: '#fffaf0' }}>
          {messages.map(msg => {
            const isUser = msg.role === 'user';
            return (
              <div
                key={msg.id}
                className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className="max-w-[85%] px-3.5 py-2.5 text-sm leading-relaxed"
                  style={{
                    background: isUser ? 'linear-gradient(135deg, #f59e0b, #d97706)' : '#ffffff',
                    color: isUser ? '#fff' : '#1a1410',
                    borderRadius: isUser ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                    border: isUser ? 'none' : '1px solid rgba(26,20,16,0.06)',
                    boxShadow: isUser ? '0 4px 12px rgba(245,158,11,0.20)' : '0 2px 8px rgba(26,20,16,0.04)',
                  }}
                >
                  {msg.content}
                  {msg.action && msg.action.type !== 'suggest_only' && (
                    <div className="mt-2 pt-2 text-[10px] uppercase tracking-wider" style={{
                      borderTop: `1px solid ${isUser ? 'rgba(255,255,255,0.25)' : 'rgba(26,20,16,0.08)'}`,
                      color: isUser ? 'rgba(255,255,255,0.85)' : 'rgba(90,74,61,0.7)',
                    }}>
                      {msg.action.type === 'setup' && '✓ Applied — full setup'}
                      {msg.action.type === 'update_product' && `✓ Applied — product ${(msg.action.product_index ?? 0) + 1}`}
                      {msg.action.type === 'update_container' && '✓ Applied — container changed'}
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {loading && (
            <div className="flex justify-start">
              <div
                className="px-3.5 py-2.5"
                style={{
                  background: '#ffffff',
                  borderRadius: '16px 16px 16px 4px',
                  border: '1px solid rgba(26,20,16,0.06)',
                  boxShadow: '0 2px 8px rgba(26,20,16,0.04)',
                }}
              >
                <Spinner size={14} style={{ color: '#d97706' }} />
              </div>
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        {/* Composer */}
        <div
          className="shrink-0 p-3"
          style={{
            background: '#ffffff',
            borderTop: '1px solid rgba(26,20,16,0.06)',
          }}
        >
          <div className="flex gap-2 items-end">
            <textarea
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              rows={1}
              placeholder="Ask about fit, optimization, weight…"
              className="flex-1 resize-none text-sm px-3 py-2.5 outline-none transition-colors leading-relaxed"
              style={{
                minHeight: 42,
                maxHeight: 120,
                background: '#fffaf0',
                border: '1px solid rgba(26,20,16,0.08)',
                borderRadius: 16,
                color: '#1a1410',
              }}
            />
            <button
              onClick={send}
              disabled={!input.trim() || loading}
              className="w-10 h-10 flex items-center justify-center transition-all hover:scale-105 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
              style={{
                background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                color: '#fff',
                borderRadius: 9999,
                boxShadow: '0 6px 20px rgba(245,158,11,0.30)',
                border: '1px solid rgba(255,255,255,0.30)',
              }}
            >
              <Icon name="send" size={14} style={{ color: '#fff' }} />
            </button>
          </div>
          <p className="mt-2 text-[9px] tracking-wider" style={{ color: 'rgba(90,74,61,0.45)' }}>
            ENTER to send · SHIFT+ENTER new line
          </p>
        </div>
      </div>
    </div>
  );
}
