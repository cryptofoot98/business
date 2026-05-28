// CostingsChatPanel — advisory chat for the Costings page. Hits the
// `costing-chat` edge function with a costings-aware context string. Mirrors
// the visual shape of ChatPanel but stays advisory only (no auto-apply
// actions) and uses transient in-memory messages.

import { useEffect, useRef, useState, KeyboardEvent } from 'react';
import { Icon, Spinner } from '../Icon';
import { useAuth } from '../../contexts/AuthContext';
import { callCostingChat } from '../../lib/chat';
import {
  CostingModelProduct, CostingModelContainer, CostingScenario, ScenarioSummary,
} from '../../types/costing';
import { PRODUCT_CATEGORIES } from '../../data/costingRates';

interface Props {
  open: boolean;
  product: CostingModelProduct;
  container: CostingModelContainer;
  scenarios: CostingScenario[];
  results: ScenarioSummary[];
  onClose: () => void;
}

interface Msg { role: 'user' | 'assistant'; content: string; }

function categoryLabel(cat: string): string {
  return PRODUCT_CATEGORIES.find(c => c.value === cat)?.label ?? cat;
}

// Build a compact natural-language summary of the user's current costing
// so the model has just enough state to answer "is this margin good?",
// "which scenario is cheapest?", etc.
function buildContext(
  product: CostingModelProduct,
  container: CostingModelContainer,
  scenarios: CostingScenario[],
  results: ScenarioSummary[],
): string {
  const lines: string[] = [];
  lines.push('Current Costing Model:');
  lines.push(`Product: ${product.productCode || '(no code)'} ${product.description || ''}`.trim());
  lines.push(`Category: ${categoryLabel(product.productCategory)} · Case weight: ${product.caseWeightKg}kg · Bags/case: ${product.bagsPerCase}`);
  lines.push(`USD/tonne: $${product.priceUSDPerTonne} · Supplier: ${product.supplier || '—'}`);
  lines.push(`Container: ${container.clearanceType}, retail=${container.retail ? 'Yes' : 'No'}, handball=${container.handball ? 'Yes' : 'No'}, gross weight ${container.containerWeightKg}kg`);
  lines.push('Scenarios:');
  scenarios.forEach((s, i) => {
    const r = results[i];
    const gm = r ? `${r.gmPercent.toFixed(1)}%` : '—';
    const cpc = r ? `£${r.costPerCaseGBP.toFixed(2)}` : '—';
    lines.push(
      `  ${s.label}: ${s.incoterms} ${s.salesCurrency}@${s.eurGbpRate.toFixed(2)} · ` +
      `cases=${s.casesPerContainer} · freight=$${s.freightCostUSD} · ` +
      `agent=${s.agentPort} · transport=£${s.transportCostGBP} · licence=£${s.licenceCostPerKgGBP}/kg · ` +
      `Sales=${s.salesCurrency === 'GBP' ? '£' : '€'}${s.salesPricePerCase}/case · ` +
      `Cost/case=${cpc} · GM=${gm}`,
    );
  });
  return lines.join('\n');
}

export function CostingsChatPanel({ open, product, container, scenarios, results, onClose }: Props) {
  const { session, profile } = useAuth();
  const firstName = profile?.full_name?.split(' ')[0] ?? '';
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (open) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
      setTimeout(() => inputRef.current?.focus(), 120);
    }
  }, [messages, open]);

  async function send() {
    const text = input.trim();
    if (!text || loading) return;
    const next: Msg[] = [...messages, { role: 'user', content: text }];
    setMessages(next);
    setInput('');
    setLoading(true);
    try {
      const ctx = buildContext(product, container, scenarios, results);
      const token = session?.access_token ?? import.meta.env.VITE_SUPABASE_ANON_KEY;
      const reply = await callCostingChat(
        next.map(m => ({ role: m.role, content: m.content })),
        token,
        ctx,
      );
      setMessages(prev => [...prev, { role: 'assistant', content: reply }]);
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Sorry — something went wrong reaching the costings advisor.' }]);
    } finally {
      setLoading(false);
    }
  }

  function handleKey(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
  }

  const bestIdx = results.length > 0
    ? results.reduce((best, r, i) => r.gmPercent > results[best].gmPercent ? i : best, 0)
    : -1;
  const summary = bestIdx >= 0 && results[bestIdx]
    ? `${scenarios[bestIdx]?.label || `Scenario ${bestIdx + 1}`} is the leader · GM ${results[bestIdx].gmPercent.toFixed(1)}%`
    : 'No scenarios calculated yet';

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
        {/* Header band — soft amber */}
        <div
          className="flex items-center justify-between px-5 py-4 shrink-0"
          style={{
            background: 'linear-gradient(135deg, #fef3c7, #fed7aa)',
            borderBottom: '1px solid rgba(26,20,16,0.06)',
          }}
        >
          <div className="flex flex-col gap-0.5 min-w-0">
            <div className="flex items-center gap-2">
              <span style={{ fontSize: 14 }}>🧮</span>
              <span className="text-xs font-bold uppercase tracking-widest" style={{ color: '#78350f' }}>
                AI Costings Advisor
              </span>
            </div>
            <span className="text-[10px] mt-0.5 truncate" style={{ color: 'rgba(120,53,15,0.65)' }}>{summary}</span>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full transition-colors shrink-0"
            style={{ color: 'rgba(120,53,15,0.6)', background: 'rgba(255,255,255,0.5)' }}
            title="Close"
          >
            <Icon name="close" size={13} />
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3" style={{ background: '#fffaf0' }}>
          {messages.length === 0 && (
            <div
              className="px-3.5 py-2.5 text-sm leading-relaxed"
              style={{
                background: '#ffffff',
                color: '#1a1410',
                borderRadius: '16px 16px 16px 4px',
                border: '1px solid rgba(26,20,16,0.06)',
                boxShadow: '0 2px 8px rgba(26,20,16,0.04)',
              }}
            >
              Hi {firstName || 'there'} — I can see your costing model. Ask me about margins, duty rates, route comparisons, FX impact, or how to improve your landed cost per case.
            </div>
          )}
          {messages.map((m, i) => {
            const isUser = m.role === 'user';
            return (
              <div key={i} className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
                <div
                  className="max-w-[85%] px-3.5 py-2.5 text-sm leading-relaxed whitespace-pre-wrap"
                  style={{
                    background: isUser ? 'linear-gradient(135deg, #f59e0b, #d97706)' : '#ffffff',
                    color: isUser ? '#fff' : '#1a1410',
                    borderRadius: isUser ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                    border: isUser ? 'none' : '1px solid rgba(26,20,16,0.06)',
                    boxShadow: isUser ? '0 4px 12px rgba(245,158,11,0.20)' : '0 2px 8px rgba(26,20,16,0.04)',
                  }}
                >
                  {m.content}
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
        <div className="shrink-0 p-3" style={{ background: '#ffffff', borderTop: '1px solid rgba(26,20,16,0.06)' }}>
          <div className="flex gap-2 items-end">
            <textarea
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKey}
              rows={1}
              placeholder="Ask about costs, margins, duties, routes…"
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
