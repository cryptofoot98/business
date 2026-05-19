import { useEffect, useRef, useState, KeyboardEvent } from 'react';
import { Send, Trash2, Loader, Sparkles, User, X } from 'lucide-react';
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
    if (!open || initialized) return;
    (async () => {
      const existing = await fetchChatMessages(userId);
      if (existing.length === 0) {
        const greeting = await insertChatMessage(
          userId,
          'assistant',
          `Hi ${firstName}. I can see your current load setup. Ask me to optimise it, change dimensions, or explain any result.`,
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
    if (open) setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 80);
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
      if (action && action.type !== 'suggest_only') onApplyAction(action);
    } catch {
      const errMsg = await insertChatMessage(userId, 'assistant', 'Something went wrong. Please try again.', null);
      setMessages(prev => [...prev, errMsg]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
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
      className={`fixed bottom-0 right-0 z-40 flex flex-col transition-all duration-300 ease-out ${
        open ? 'translate-y-0 opacity-100 pointer-events-auto' : 'translate-y-3 opacity-0 pointer-events-none'
      }`}
      style={{ width: 400, height: 'calc(100vh - 64px)' }}
    >
      {/* Panel shell */}
      <div className="flex flex-col h-full" style={{
        background: '#ffffff',
        borderLeft: '1px solid #e2e8f0',
        borderTop: '1px solid #e2e8f0',
        boxShadow: '-4px 0 24px rgba(0,0,0,0.07)',
      }}>

        {/* Header */}
        <div className="shrink-0 flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid #f1f5f9' }}>
          <div className="flex items-center gap-3">
            {/* AI indicator dot */}
            <div className="relative flex items-center justify-center w-9 h-9 rounded-xl" style={{ background: '#eef2ff' }}>
              <Sparkles size={16} style={{ color: '#4f46e5' }} />
              <span className="absolute top-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-white" />
            </div>
            <div>
              <p className="font-semibold text-sm" style={{ color: '#0f172a' }}>AI Loading Advisor</p>
              <p className="text-[10px] font-mono mt-0.5 truncate max-w-52" style={{ color: '#94a3b8' }}>{contextSummary}</p>
            </div>
          </div>
          <button
            onClick={handleClear}
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-[10px] font-semibold uppercase tracking-wider rounded-lg transition-all"
            style={{ color: '#94a3b8', border: '1px solid #e2e8f0' }}
            onMouseEnter={e => { e.currentTarget.style.color = '#e11d48'; e.currentTarget.style.borderColor = '#fca5a5'; }}
            onMouseLeave={e => { e.currentTarget.style.color = '#94a3b8'; e.currentTarget.style.borderColor = '#e2e8f0'; }}
            title="Clear conversation"
          >
            <Trash2 size={11} /> Clear
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-5 space-y-4 scrollbar-brut">
          {messages.map(msg => {
            const isUser = msg.role === 'user';
            return (
              <div key={msg.id} className={`flex items-end gap-2.5 ${isUser ? 'flex-row-reverse' : ''}`}>
                {/* Avatar */}
                <div className="w-7 h-7 shrink-0 rounded-full flex items-center justify-center" style={{
                  background: isUser ? '#4f46e5' : '#f1f5f9',
                  border: isUser ? '1px solid #4338ca' : '1px solid #e2e8f0',
                }}>
                  {isUser
                    ? <User size={12} style={{ color: '#fff' }} />
                    : <Sparkles size={12} style={{ color: '#4f46e5' }} />}
                </div>

                {/* Bubble */}
                <div className="max-w-[78%]" style={{
                  background: isUser ? '#4f46e5' : '#f8fafc',
                  border: isUser ? '1px solid #4338ca' : '1px solid #e2e8f0',
                  borderRadius: isUser ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                  padding: '10px 14px',
                  boxShadow: isUser ? '0 2px 8px rgba(79,70,229,0.2)' : '0 1px 3px rgba(0,0,0,0.04)',
                }}>
                  <p className="text-sm leading-relaxed" style={{ color: isUser ? '#fff' : '#1e293b' }}>
                    {msg.content}
                  </p>
                  {msg.action && msg.action.type !== 'suggest_only' && (
                    <div className="mt-2 pt-2 flex items-center gap-1.5" style={{ borderTop: isUser ? '1px solid rgba(255,255,255,0.2)' : '1px solid #e2e8f0' }}>
                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                      <span className="text-[9px] font-mono font-semibold uppercase tracking-wider" style={{ color: isUser ? 'rgba(255,255,255,0.65)' : '#059669' }}>
                        {msg.action.type === 'setup' && 'Applied: full setup'}
                        {msg.action.type === 'update_product' && `Applied: product ${(msg.action.product_index ?? 0) + 1} updated`}
                        {msg.action.type === 'update_container' && 'Applied: container changed'}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {loading && (
            <div className="flex items-end gap-2.5">
              <div className="w-7 h-7 shrink-0 rounded-full flex items-center justify-center" style={{ background: '#f1f5f9', border: '1px solid #e2e8f0' }}>
                <Sparkles size={12} style={{ color: '#4f46e5' }} />
              </div>
              <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '16px 16px 16px 4px', padding: '12px 16px' }}>
                <div className="flex gap-1.5 items-center">
                  {[0, 1, 2].map(i => (
                    <div key={i} className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-bounce" style={{ animationDelay: `${i * 120}ms` }} />
                  ))}
                </div>
              </div>
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div className="shrink-0 p-4" style={{ borderTop: '1px solid #f1f5f9' }}>
          <div className="flex gap-2 items-end">
            <textarea
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              rows={1}
              placeholder="Ask about fit, optimisation, weight…"
              className="flex-1 resize-none text-sm px-4 py-3 placeholder-slate-400 outline-none leading-relaxed transition-all"
              style={{
                minHeight: 46,
                maxHeight: 120,
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: 12,
                color: '#0f172a',
              }}
              onFocus={e => { e.target.style.borderColor = '#6366f1'; e.target.style.boxShadow = '0 0 0 3px rgba(99,102,241,0.10)'; }}
              onBlur={e => { e.target.style.borderColor = '#e2e8f0'; e.target.style.boxShadow = 'none'; }}
            />
            <button
              onClick={send}
              disabled={!input.trim() || loading}
              className="w-11 h-11 flex items-center justify-center rounded-xl transition-all shrink-0 disabled:opacity-40"
              style={{ background: '#4f46e5', border: '1px solid #4338ca', boxShadow: '0 2px 8px rgba(79,70,229,0.28)' }}
            >
              <Send size={15} style={{ color: '#fff' }} />
            </button>
          </div>
          <p className="mt-2 text-[10px] font-mono" style={{ color: '#cbd5e1' }}>Enter to send · Shift+Enter for new line</p>
        </div>
      </div>
    </div>
  );
}
