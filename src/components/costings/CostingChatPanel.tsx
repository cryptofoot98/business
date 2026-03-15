import { useState, useRef, useEffect } from 'react';
import { Send, Loader, Bot, User, Sliders, Plus, Trash2 } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { CostingInputs, CostingResults, CustomField } from '../../types/costing';
import { CostingChatMessage, CostingAIAction, callCostingAI } from '../../lib/costingChat';

interface Props {
  inputs: CostingInputs;
  results: CostingResults;
  onApplyCustomFields: (fields: CustomField[]) => void;
  onClose: () => void;
}

const SUGGESTIONS = [
  'Add Amazon FBA fees per unit',
  'Add a 5% sourcing agency commission',
  'Add a quality inspection fee',
  'Model a duty drawback benefit',
  'Why is my margin low?',
  'What custom costs should I add?',
];

function ActionBadge({ action }: { action: CostingAIAction }) {
  if (action.type === 'suggest_only') return null;

  const labels: Record<string, string> = {
    add_custom_fields: `Added ${action.fields?.length ?? 0} field(s)`,
    replace_custom_fields: `Set ${action.fields?.length ?? 0} field(s)`,
    remove_custom_fields: `Removed ${action.remove_ids?.length ?? 0} field(s)`,
  };

  return (
    <div className="flex items-center gap-1.5 mt-2 px-2 py-1 bg-sky-950 border border-sky-800 w-fit">
      <Sliders size={10} className="text-sky-400 shrink-0" strokeWidth={2.5} />
      <span className="font-mono text-[9px] text-sky-300 uppercase tracking-widest">{labels[action.type] ?? action.type}</span>
    </div>
  );
}

export function CostingChatPanel({ inputs, results, onApplyCustomFields, onClose }: Props) {
  const { session } = useAuth();
  const [messages, setMessages] = useState<CostingChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [appliedActions, setAppliedActions] = useState<Record<number, CostingAIAction>>({});
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  function applyAction(action: CostingAIAction, msgIndex: number) {
    const existing = inputs.customFields ?? [];

    let next: CustomField[] = existing;
    if (action.type === 'add_custom_fields' && action.fields) {
      const newIds = new Set(action.fields.map(f => f.id));
      next = [...existing.filter(f => !newIds.has(f.id)), ...action.fields];
    } else if (action.type === 'replace_custom_fields' && action.fields) {
      next = action.fields;
    } else if (action.type === 'remove_custom_fields' && action.remove_ids) {
      const removeSet = new Set(action.remove_ids);
      next = existing.filter(f => !removeSet.has(f.id));
    }

    onApplyCustomFields(next);
    setAppliedActions(prev => ({ ...prev, [msgIndex]: action }));
  }

  async function send(text?: string) {
    const content = (text ?? input).trim();
    if (!content || loading) return;

    const userMsg: CostingChatMessage = { role: 'user', content };
    const nextMessages = [...messages, userMsg];
    setMessages(nextMessages);
    setInput('');
    setLoading(true);

    try {
      const token = session?.access_token ?? import.meta.env.VITE_SUPABASE_ANON_KEY;
      const resp = await callCostingAI(nextMessages, inputs, results, token);

      const assistantMsg: CostingChatMessage = { role: 'assistant', content: resp.message ?? '' };
      setMessages(prev => [...prev, assistantMsg]);

      if (resp.action && resp.action.type !== 'suggest_only') {
        const msgIdx = nextMessages.length;
        applyAction(resp.action, msgIdx);
      }
    } catch (err) {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'Sorry, something went wrong. Please try again.',
      }]);
    } finally {
      setLoading(false);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }

  function handleKey(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  }

  return (
    <div
      className="fixed bottom-20 right-5 z-40 w-[380px] max-w-[calc(100vw-2.5rem)] flex flex-col bg-slate-900 border-2 border-slate-700"
      style={{ boxShadow: '5px 5px 0 #0f172a', height: 'min(520px, calc(100vh - 120px))' }}
    >
      <div className="shrink-0 px-4 py-3 bg-slate-800 border-b-2 border-slate-700 flex items-center justify-between">
        <div>
          <h4 className="font-black text-xs uppercase tracking-widest text-white">Costing AI</h4>
          <p className="font-mono text-[9px] text-slate-400 mt-0.5">Ask about costs, margins, or custom fields</p>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span className="font-mono text-[9px] text-emerald-400">Live</span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-3 min-h-0">
        {messages.length === 0 && (
          <div className="space-y-3">
            <div className="flex items-start gap-2">
              <div className="w-5 h-5 shrink-0 bg-sky-600 flex items-center justify-center">
                <Bot size={11} className="text-white" strokeWidth={2.5} />
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                Hi! I can add custom cost fields or benefits to your costing, analyse your margins, and suggest what you might be missing. What would you like to do?
              </p>
            </div>
            <div className="flex flex-wrap gap-1.5 pl-7">
              {SUGGESTIONS.map(s => (
                <button
                  key={s}
                  onClick={() => send(s)}
                  className="px-2 py-1 border border-slate-600 text-[10px] text-slate-300 hover:border-sky-500 hover:text-sky-300 transition-colors font-mono"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, i) => {
          const isUser = msg.role === 'user';
          const appliedAction = appliedActions[i];
          return (
            <div key={i} className={`flex items-start gap-2 ${isUser ? 'flex-row-reverse' : ''}`}>
              <div className={`w-5 h-5 shrink-0 flex items-center justify-center ${isUser ? 'bg-slate-600' : 'bg-sky-600'}`}>
                {isUser
                  ? <User size={10} className="text-white" strokeWidth={2.5} />
                  : <Bot size={10} className="text-white" strokeWidth={2.5} />
                }
              </div>
              <div className={`flex-1 ${isUser ? 'items-end' : 'items-start'} flex flex-col`}>
                <div className={`px-3 py-2 text-xs leading-relaxed ${
                  isUser
                    ? 'bg-sky-900 border border-sky-700 text-sky-100'
                    : 'bg-slate-800 border border-slate-700 text-slate-200'
                }`}>
                  {msg.content}
                </div>
                {appliedAction && <ActionBadge action={appliedAction} />}
              </div>
            </div>
          );
        })}

        {loading && (
          <div className="flex items-start gap-2">
            <div className="w-5 h-5 shrink-0 bg-sky-600 flex items-center justify-center">
              <Bot size={10} className="text-white" strokeWidth={2.5} />
            </div>
            <div className="px-3 py-2 bg-slate-800 border border-slate-700">
              <Loader size={12} className="text-sky-400 animate-spin" strokeWidth={2.5} />
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      <div className="shrink-0 border-t-2 border-slate-700 p-2 flex gap-2">
        <textarea
          ref={inputRef}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKey}
          placeholder="Ask about costs, add fields, analyse margins…"
          rows={2}
          disabled={loading}
          className="flex-1 px-3 py-2 bg-slate-800 border border-slate-600 text-white text-xs font-mono focus:border-sky-500 focus:outline-none transition-colors resize-none disabled:opacity-50 placeholder:text-slate-500"
        />
        <button
          onClick={() => send()}
          disabled={loading || !input.trim()}
          className="w-9 shrink-0 flex items-center justify-center border-2 border-sky-600 bg-sky-600 text-white hover:bg-sky-500 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <Send size={13} strokeWidth={2.5} />
        </button>
      </div>
    </div>
  );
}
