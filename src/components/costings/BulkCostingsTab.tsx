import { useState, useMemo } from 'react';
import { Icon } from '../Icon';
import { NumInputSm, SelectInputSm, TextInputSm, Field, Section, gmColor } from './shared';
import { BulkSharedSettings, BulkProductRow, CostingSettings, AgentPortKey } from '../../types/costing';
import { PRODUCT_CATEGORIES, DEFAULT_TRANSPORT_COSTS } from '../../data/costingRates';
import { computeBulkProduct } from '../../utils/costingCalc';

let _uid = 0;
function uid() { return String(++_uid); }

const DEFAULT_SHARED: BulkSharedSettings = {
  exchangeRateUSDGBP: 1.27,
  clearanceType: 'licence',
  agentPort: 'ewl_london_gateway',
  transportCostGBP: 550,
  handballing: false,
  handballingCostGBP: 300,
  insuranceAuto: true,
  insuranceManualGBP: 0,
  addition1Label: 'Addition 1',
  addition1GBP: 0,
  addition2Label: 'Addition 2',
  addition2GBP: 0,
};

function newProduct(): BulkProductRow {
  return {
    id: uid(),
    productName: '',
    supplier: '',
    costPerTonneUSD: 0,
    caseWeightKg: 0,
    casesPerContainer: 0,
    productCategory: 'meat_lt57',
    freightCostUSD: 0,
    sellingPricePerCase: 0,
  };
}

interface Props {
  settings: CostingSettings;
}

export function BulkCostingsTab({ settings }: Props) {
  const agentRates = settings.agentPortRates;
  const agentOptions = (Object.entries(agentRates) as [AgentPortKey, typeof agentRates[AgentPortKey]][])
    .map(([k, v]) => ({ value: k, label: v.label }));

  const [shared, setShared] = useState<BulkSharedSettings>(DEFAULT_SHARED);
  const [products, setProducts] = useState<BulkProductRow[]>([newProduct()]);

  function setSharedField<K extends keyof BulkSharedSettings>(key: K, val: BulkSharedSettings[K]) {
    setShared(s => ({ ...s, [key]: val }));
  }

  function setProduct<K extends keyof BulkProductRow>(id: string, key: K, val: BulkProductRow[K]) {
    setProducts(prev => prev.map(p => p.id === id ? { ...p, [key]: val } : p));
  }

  function addProduct() { setProducts(prev => [...prev, newProduct()]); }
  function removeProduct(id: string) { setProducts(prev => prev.filter(p => p.id !== id)); }

  const results = useMemo(
    () => products.map(p => computeBulkProduct(shared, p, settings)),
    [shared, products, settings],
  );

  const totalContainerCost = results.reduce((sum, r) => sum + r.totalCostPerContainer, 0);

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4">

      {/* Shared container settings */}
      <Section title="Shared Container Settings" defaultOpen>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Field label="Exchange rate ($/£)">
            <NumInputSm value={shared.exchangeRateUSDGBP} onChange={v => setSharedField('exchangeRateUSDGBP', v)} placeholder="1.27" step={0.001} />
          </Field>
          <Field label="Clearance type">
            <SelectInputSm
              value={shared.clearanceType} onChange={v => setSharedField('clearanceType', v)}
              options={[{ value: 'licence', label: 'Licence' }, { value: 'full_duty', label: 'Full Duty' }]}
            />
          </Field>
          <Field label="Agent / Port">
            <SelectInputSm
              value={shared.agentPort}
              onChange={v => {
                setSharedField('agentPort', v);
                setSharedField('transportCostGBP', DEFAULT_TRANSPORT_COSTS[v]);
              }}
              options={agentOptions}
            />
          </Field>
          <Field label="Transport (£/container)">
            <NumInputSm value={shared.transportCostGBP} onChange={v => setSharedField('transportCostGBP', v)} prefix="£" placeholder="550" step={10} />
          </Field>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-widest mb-1.5" style={{ color: 'rgba(90, 74, 61, 0.52)' }}>Insurance</p>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={shared.insuranceAuto} onChange={e => setSharedField('insuranceAuto', e.target.checked)}
                className="w-3 h-3" style={{ accentColor: '#f59e0b' }} />
              <span className="font-mono text-[10px]" style={{ color: '#1a1410' }}>
                Auto £{settings.insurancePerFCL}/FCL
              </span>
            </label>
            {!shared.insuranceAuto && (
              <div className="mt-1.5">
                <NumInputSm value={shared.insuranceManualGBP} onChange={v => setSharedField('insuranceManualGBP', v)} prefix="£" placeholder="200" />
              </div>
            )}
          </div>
          <div>
            <p className="font-mono text-[10px] uppercase tracking-widest mb-1.5" style={{ color: 'rgba(90, 74, 61, 0.52)' }}>Handballing</p>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={shared.handballing} onChange={e => setSharedField('handballing', e.target.checked)}
                className="w-3 h-3" style={{ accentColor: '#f59e0b' }} />
              <span className="font-mono text-[10px]" style={{ color: '#1a1410' }}>
                {shared.handballing ? `£${shared.handballingCostGBP}` : 'No'}
              </span>
            </label>
            {shared.handballing && (
              <div className="mt-1.5">
                <NumInputSm value={shared.handballingCostGBP} onChange={v => setSharedField('handballingCostGBP', v)} prefix="£" placeholder="300" />
              </div>
            )}
          </div>
          <Field label="Addition 1 label + £">
            <div className="space-y-1">
              <TextInputSm value={shared.addition1Label} onChange={v => setSharedField('addition1Label', v)} placeholder="Addition 1" />
              <NumInputSm value={shared.addition1GBP} onChange={v => setSharedField('addition1GBP', v)} prefix="£" placeholder="0" />
            </div>
          </Field>
          <Field label="Addition 2 label + £">
            <div className="space-y-1">
              <TextInputSm value={shared.addition2Label} onChange={v => setSharedField('addition2Label', v)} placeholder="Addition 2" />
              <NumInputSm value={shared.addition2GBP} onChange={v => setSharedField('addition2GBP', v)} prefix="£" placeholder="0" />
            </div>
          </Field>
        </div>

        {/* Port info */}
        {(() => {
          const info = agentRates[shared.agentPort];
          return (
            <div className="p-3 rounded-xl" style={{ background: 'rgba(245, 158, 11, 0.04)', border: '1px solid rgba(245, 158, 11, 0.12)' }}>
              <div className="flex flex-wrap gap-4 text-[10px] font-mono" style={{ color: 'rgba(90, 74, 61, 0.55)' }}>
                <span>Agent: <b style={{ color: '#1a1410' }}>{info.agent}</b></span>
                <span>Port: <b style={{ color: '#1a1410' }}>{info.port}</b></span>
                <span>Health exam: <b style={{ color: '#1a1410' }}>£{info.healthExamGBP.toFixed(2)}</b></span>
                <span>Port charges: <b style={{ color: '#1a1410' }}>£{info.portChargesGBP.toFixed(2)}</b></span>
                <span>Total port: <b style={{ color: '#1a1410' }}>£{(info.healthExamGBP + info.portChargesGBP).toFixed(2)}</b></span>
              </div>
            </div>
          );
        })()}
      </Section>

      {/* Product table */}
      <div style={{ background: 'rgba(255,255,255,0.75)', border: '1px solid rgba(245, 158, 11, 0.18)', borderRadius: 16, overflow: 'hidden' }}>
        <div className="flex items-center justify-between px-4 py-3" style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)', borderBottom: '1px solid rgba(245, 158, 11, 0.25)' }}>
          <div>
            <p className="font-bold text-xs uppercase tracking-widest text-white">Products</p>
            <p className="font-mono text-[9px] mt-0.5" style={{ color: 'rgba(255,255,255,0.6)' }}>Each product shares the container settings above</p>
          </div>
          <button
            onClick={addProduct}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-bold uppercase"
            style={{ background: 'rgba(255,255,255,0.2)', color: '#fff', border: '1px solid rgba(255,255,255,0.3)' }}
          >
            <Icon name="plus" size={10} /> Add product
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs" style={{ minWidth: 1100 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(245, 158, 11, 0.15)', background: 'rgba(245, 158, 11, 0.04)' }}>
                {['Product', 'Supplier', '$/tonne', 'kg/case', 'Cases', 'Category', 'Freight (USD)', 'Sell £/case', 'Cost/case', 'Cost/kg', 'GM%', 'GP/case', ''].map(h => (
                  <th key={h} className="px-3 py-2 text-left font-mono text-[9px] uppercase tracking-widest whitespace-nowrap"
                    style={{ color: 'rgba(90, 74, 61, 0.5)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {products.map((p, idx) => {
                const r = results[idx];
                const gc = gmColor(r.gmPercent);
                const hasPrice = p.sellingPricePerCase > 0;
                return (
                  <tr key={p.id} style={{ borderBottom: '1px solid rgba(245, 158, 11, 0.07)' }}>
                    <td className="px-2 py-2" style={{ minWidth: 130 }}>
                      <TextInputSm value={p.productName} onChange={v => setProduct(p.id, 'productName', v)} placeholder="Product name" />
                    </td>
                    <td className="px-2 py-2" style={{ minWidth: 110 }}>
                      <TextInputSm value={p.supplier} onChange={v => setProduct(p.id, 'supplier', v)} placeholder="Supplier" />
                    </td>
                    <td className="px-2 py-2" style={{ minWidth: 100 }}>
                      <NumInputSm value={p.costPerTonneUSD} onChange={v => setProduct(p.id, 'costPerTonneUSD', v)} prefix="$" placeholder="1500" step={10} />
                    </td>
                    <td className="px-2 py-2" style={{ minWidth: 80 }}>
                      <NumInputSm value={p.caseWeightKg} onChange={v => setProduct(p.id, 'caseWeightKg', v)} placeholder="10" step={0.1} />
                    </td>
                    <td className="px-2 py-2" style={{ minWidth: 80 }}>
                      <NumInputSm value={p.casesPerContainer} onChange={v => setProduct(p.id, 'casesPerContainer', Math.max(1, Math.floor(v)))} placeholder="1000" step={1} />
                    </td>
                    <td className="px-2 py-2" style={{ minWidth: 160 }}>
                      <SelectInputSm value={p.productCategory} onChange={v => setProduct(p.id, 'productCategory', v)} options={PRODUCT_CATEGORIES} />
                    </td>
                    <td className="px-2 py-2" style={{ minWidth: 100 }}>
                      <NumInputSm value={p.freightCostUSD} onChange={v => setProduct(p.id, 'freightCostUSD', v)} prefix="$" placeholder="3500" step={50} />
                    </td>
                    <td className="px-2 py-2" style={{ minWidth: 90 }}>
                      <NumInputSm value={p.sellingPricePerCase} onChange={v => setProduct(p.id, 'sellingPricePerCase', v)} prefix="£" placeholder="0" />
                    </td>
                    {/* Results */}
                    <td className="px-3 py-2 font-mono text-xs font-black whitespace-nowrap" style={{ color: '#1a1410', minWidth: 75 }}>
                      £{r.totalCostPerCase.toFixed(2)}
                    </td>
                    <td className="px-3 py-2 font-mono text-[10px] whitespace-nowrap" style={{ color: 'rgba(90, 74, 61, 0.7)', minWidth: 75 }}>
                      £{r.costPerKg.toFixed(4)}
                    </td>
                    <td className="px-3 py-2 font-mono text-xs font-black whitespace-nowrap" style={{ color: hasPrice ? gc : 'rgba(90, 74, 61, 0.25)', minWidth: 65 }}>
                      {hasPrice ? `${r.gmPercent.toFixed(1)}%` : '—'}
                    </td>
                    <td className="px-3 py-2 font-mono text-[10px] whitespace-nowrap" style={{ color: hasPrice ? gc : 'rgba(90, 74, 61, 0.25)', minWidth: 75 }}>
                      {hasPrice ? `${r.gmGBPPerCase >= 0 ? '+' : ''}£${r.gmGBPPerCase.toFixed(2)}` : '—'}
                    </td>
                    <td className="px-2 py-2">
                      {products.length > 1 && (
                        <button onClick={() => removeProduct(p.id)} className="p-1 rounded"
                          style={{ color: 'rgba(90, 74, 61, 0.3)' }}
                          onMouseEnter={e => (e.currentTarget.style.color = '#dc2626')}
                          onMouseLeave={e => (e.currentTarget.style.color = 'rgba(90, 74, 61, 0.3)')}>
                          <Icon name="trash" size={12} />
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Summary footer */}
        <div className="px-4 py-3 flex flex-wrap gap-6 items-center" style={{ borderTop: '2px solid rgba(245, 158, 11, 0.15)', background: 'rgba(245, 158, 11, 0.04)' }}>
          <div>
            <p className="font-mono text-[9px] uppercase tracking-widest" style={{ color: 'rgba(90, 74, 61, 0.45)' }}>Products</p>
            <p className="font-bold text-sm" style={{ color: '#1a1410' }}>{products.length}</p>
          </div>
          <div>
            <p className="font-mono text-[9px] uppercase tracking-widest" style={{ color: 'rgba(90, 74, 61, 0.45)' }}>Total container cost</p>
            <p className="font-bold text-sm" style={{ color: '#1a1410' }}>£{totalContainerCost.toLocaleString('en-GB', { maximumFractionDigits: 2 })}</p>
          </div>
          <div>
            <p className="font-mono text-[9px] uppercase tracking-widest" style={{ color: 'rgba(90, 74, 61, 0.45)' }}>Avg cost / case</p>
            <p className="font-bold text-sm" style={{ color: '#1a1410' }}>
              {(() => {
                const total = results.reduce((s, r) => s + r.totalCostPerCase, 0);
                return `£${(total / results.length).toFixed(2)}`;
              })()}
            </p>
          </div>
          <div>
            <p className="font-mono text-[9px] uppercase tracking-widest" style={{ color: 'rgba(90, 74, 61, 0.45)' }}>Total cases</p>
            <p className="font-bold text-sm" style={{ color: '#1a1410' }}>
              {products.reduce((s, p) => s + (p.casesPerContainer || 0), 0).toLocaleString()}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
