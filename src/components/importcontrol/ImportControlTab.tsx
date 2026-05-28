import { useMemo } from 'react';
import { Icon } from '../Icon';
import {
  NumInputSm, TextInputSm, SelectInputSm, Field, Section, gmColor,
} from '../costings/shared';
import { ProductCombobox } from '../costings/ProductCombobox';
import {
  ImportControl, ImportControlResults, ImportControlProduct, ImportControlHeader,
  ImportControlClearance, ImportControlCosts,
} from '../../types/importControl';
import { Product, NewProductInput } from '../../types/product';
import { AGENT_PORT_RATES } from '../../data/costingRates';

// ── Formatting ────────────────────────────────────────────────────────────────

const fmtGBP   = (v: number) => v.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtGBP4  = (v: number) => v.toLocaleString('en-GB', { minimumFractionDigits: 4, maximumFractionDigits: 4 });
const fmtNum   = (v: number) => v.toLocaleString('en-GB');
const fmt2     = (v: number) => v.toFixed(2);

const MAX_PRODUCTS = 4;

// ── Props ─────────────────────────────────────────────────────────────────────

interface Props {
  ic: ImportControl;
  results: ImportControlResults;
  productCatalog: Product[];
  onSetHeader: <K extends keyof ImportControlHeader>(key: K, val: ImportControlHeader[K]) => void;
  onSetClearance: <K extends keyof ImportControlClearance>(key: K, val: ImportControlClearance[K]) => void;
  onSetCosts: <K extends keyof ImportControlCosts>(key: K, val: ImportControlCosts[K]) => void;
  onSetProduct: <K extends keyof ImportControlProduct>(i: number, key: K, val: ImportControlProduct[K]) => void;
  onAddProduct: () => void;
  onRemoveProduct: (i: number) => void;
  onProductCatalogSelect: (i: number, p: Product) => void;
  onProductCatalogCreate: (input: NewProductInput) => Promise<Product>;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function StatTile({ label, value, sub, accent = '#d97706' }: { label: string; value: string; sub?: string; accent?: string }) {
  return (
    <div className="p-3 rounded-xl" style={{ background: `${accent}10`, border: `1px solid ${accent}33` }}>
      <p className="text-[10px] uppercase tracking-widest" style={{ color: `${accent}cc`, fontWeight: 600 }}>{label}</p>
      <p className="text-xl font-black mt-1" style={{ color: accent }}>{value}</p>
      {sub && <p className="font-mono text-[10px] mt-0.5" style={{ color: 'rgba(90, 74, 61, 0.55)' }}>{sub}</p>}
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────

export function ImportControlTab({
  ic, results, productCatalog,
  onSetHeader, onSetClearance, onSetCosts, onSetProduct,
  onAddProduct, onRemoveProduct, onProductCatalogSelect, onProductCatalogCreate,
}: Props) {

  const portOptions = useMemo(() => {
    const ports = new Set<string>();
    Object.values(AGENT_PORT_RATES).forEach(r => ports.add(r.port));
    return Array.from(ports).map(p => ({ value: p, label: p }));
  }, []);

  const agentOptions = useMemo(() => {
    const agents = new Set<string>();
    Object.values(AGENT_PORT_RATES).forEach(r => agents.add(r.agent));
    return Array.from(agents).map(a => ({ value: a, label: a }));
  }, []);

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4">

      {/* ─── 1. Shipment Header — BLUE ─── */}
      <Section title="Shipment Header" icon={<Icon name="ship" size={13} />} accent="blue">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Field label="Container Number">
            <TextInputSm value={ic.header.containerNumber} onChange={v => onSetHeader('containerNumber', v)} placeholder="MSDU9628847" />
          </Field>
          <Field label="Bill of Lading">
            <TextInputSm value={ic.header.billOfLading} onChange={v => onSetHeader('billOfLading', v)} placeholder="CAT00351464" />
          </Field>
          <Field label="FOB Agent">
            <SelectInputSm
              value={ic.header.fobAgent || 'AGT'}
              onChange={v => onSetHeader('fobAgent', v)}
              options={agentOptions.length ? agentOptions : [{ value: 'AGT', label: 'AGT' }]}
            />
          </Field>
          <Field label="Cleared?">
            <button
              onClick={() => onSetHeader('cleared', !ic.header.cleared)}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold uppercase tracking-wider rounded-xl"
              style={{
                background: ic.header.cleared ? 'linear-gradient(135deg, #f59e0b, #d97706)' : 'rgba(0,0,0,0.05)',
                color: ic.header.cleared ? '#fff' : 'rgba(0,0,0,0.5)',
                border: '1px solid ' + (ic.header.cleared ? 'rgba(245, 158, 11, 0.4)' : 'rgba(0,0,0,0.12)'),
              }}
            >
              <Icon name="checkcircle" size={12} /> {ic.header.cleared ? 'Cleared' : 'Pending'}
            </button>
          </Field>

          <Field label="Load Number">
            <TextInputSm value={ic.header.loadNumber} onChange={v => onSetHeader('loadNumber', v)} placeholder="FF2386" />
          </Field>
          <Field label="Purchase Order No">
            <TextInputSm value={ic.header.purchaseOrderNo} onChange={v => onSetHeader('purchaseOrderNo', v)} placeholder="39842/56" />
          </Field>
          <Field label="Shipping Company">
            <TextInputSm value={ic.header.shippingCompany} onChange={v => onSetHeader('shippingCompany', v)} placeholder="ALLY GLOBAL" />
          </Field>
          <Field label="Transport Company">
            <TextInputSm value={ic.header.transportCompany} onChange={v => onSetHeader('transportCompany', v)} placeholder="AGT" />
          </Field>

          <Field label="Port of Arrival">
            <SelectInputSm
              value={ic.header.portOfArrival || 'Felixstowe'}
              onChange={v => onSetHeader('portOfArrival', v)}
              options={portOptions.length ? portOptions : [{ value: 'Felixstowe', label: 'Felixstowe' }]}
            />
          </Field>
          <Field label="Bulk PO">
            <TextInputSm value={ic.header.bulkPo} onChange={v => onSetHeader('bulkPo', v)} placeholder="Bulk PO" />
          </Field>
          <Field label="Delivery To">
            <TextInputSm value={ic.header.deliveryTo} onChange={v => onSetHeader('deliveryTo', v)} placeholder="FF Warrington" />
          </Field>
          <Field label="Exchange Rate ($→£)">
            <NumInputSm value={ic.header.exchangeRateUSDGBP} onChange={v => onSetHeader('exchangeRateUSDGBP', v)} step={0.001} placeholder="1.34" />
          </Field>

          <Field label="Arrival Date">
            <input
              type="date"
              value={ic.header.arrivalDate}
              onChange={e => onSetHeader('arrivalDate', e.target.value)}
              className="w-full px-2 py-1.5 text-xs focus:outline-none"
              style={{ background: 'rgba(255,255,255,0.85)', border: '1px solid rgba(96, 165, 250, 0.22)', borderRadius: 8, color: '#1e3a8a' }}
            />
          </Field>
          <Field label="Collection Date from Port">
            <input
              type="date"
              value={ic.header.collectionDateFromPort}
              onChange={e => onSetHeader('collectionDateFromPort', e.target.value)}
              className="w-full px-2 py-1.5 text-xs focus:outline-none"
              style={{ background: 'rgba(255,255,255,0.85)', border: '1px solid rgba(96, 165, 250, 0.22)', borderRadius: 8, color: '#1e3a8a' }}
            />
          </Field>
          <Field label="Container Gross Weight (tonnes)" note="Max allowed">
            <NumInputSm value={ic.header.containerGrossWeightTonnes} onChange={v => onSetHeader('containerGrossWeightTonnes', v)} step={0.1} placeholder="17" />
          </Field>
          <Field label="Discounted Cost £" note="Optional manual override">
            <NumInputSm value={ic.header.discountedCostGBP} onChange={v => onSetHeader('discountedCostGBP', v)} prefix="£" placeholder="0" />
          </Field>
        </div>
      </Section>

      {/* ─── 2. Costs & Clearance — AMBER ─── */}
      <Section title="Costs & Clearance Charges" icon={<Icon name="receipt" size={13} />} accent="amber">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

          {/* LEFT — Cost stack */}
          <div className="rounded-xl overflow-hidden" style={{ background: 'rgba(255,255,255,0.7)', border: '1px solid rgba(217,119,6,0.22)' }}>
            <div className="px-3 py-2" style={{ background: 'rgba(217,119,6,0.10)', borderBottom: '1px solid rgba(217,119,6,0.22)' }}>
              <p className="text-[11px] font-bold uppercase tracking-widest" style={{ color: '#92400e' }}>Container Cost Stack</p>
            </div>
            <table className="w-full text-xs">
              <tbody>
                <CostRow label="Product cost Sterling" value={`£${fmtGBP(results.productCostSterling)}`} readOnly />
                <CostInputRow label="Duty from HM Customs"      value={ic.costs.dutyFromHMCustoms}      onChange={v => onSetCosts('dutyFromHMCustoms', v)} />
                <CostRow      label="Port Clearance Charges"     value={`£${fmtGBP(results.portClearanceCharges)}`} readOnly />
                <CostInputRow label="Hand ball"                  value={ic.costs.handball}               onChange={v => onSetCosts('handball', v)} />
                <CostInputRow label="Packaging costs"            value={ic.costs.packagingCosts}         onChange={v => onSetCosts('packagingCosts', v)} />
                <CostInputRow label="Insurance per container"    value={ic.costs.insurancePerContainer}  onChange={v => onSetCosts('insurancePerContainer', v)} />
                <CostInputRow label="Thai duty on packaging"     value={ic.costs.thaiDutyOnPackaging}    onChange={v => onSetCosts('thaiDutyOnPackaging', v)} />
                <CostInputRow label="Bag wastage G/L"            value={ic.costs.bagWastageGL}           onChange={v => onSetCosts('bagWastageGL', v)} />
                <CostInputRow label="Licence cost"               value={ic.costs.licenceCost}            onChange={v => onSetCosts('licenceCost', v)} />
                <CostInputRow label="* Additions LC"             value={ic.costs.additionsLC}            onChange={v => onSetCosts('additionsLC', v)} />
                <CostInputRow label="** Additions 2"             value={ic.costs.additions2}             onChange={v => onSetCosts('additions2', v)} />
                <CostInputRow label="Commissions"                value={ic.costs.commissions}            onChange={v => onSetCosts('commissions', v)} />
                <tr style={{ borderTop: '2px solid rgba(217,119,6,0.4)' }}>
                  <td className="px-3 py-2 text-[11px] font-black uppercase tracking-wider" style={{ color: '#78350f' }}>Total Container Cost</td>
                  <td className="px-3 py-2 text-right text-sm font-black font-mono" style={{ color: '#78350f' }}>£{fmtGBP(results.totalContainerCost)}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* RIGHT — Clearance line items */}
          <div className="rounded-xl overflow-hidden" style={{ background: 'rgba(255,255,255,0.7)', border: '1px solid rgba(217,119,6,0.22)' }}>
            <div className="px-3 py-2" style={{ background: 'rgba(217,119,6,0.10)', borderBottom: '1px solid rgba(217,119,6,0.22)' }}>
              <p className="text-[11px] font-bold uppercase tracking-widest" style={{ color: '#92400e' }}>Clearance Line Items</p>
            </div>
            <table className="w-full text-xs">
              <tbody>
                <CostInputRow label="EWL Charges"               value={ic.clearance.ewlCharges}               onChange={v => onSetClearance('ewlCharges', v)} />
                <CostInputRow label="Terminal Fees"             value={ic.clearance.terminalFees}             onChange={v => onSetClearance('terminalFees', v)} />
                <CostInputRow label="Document Fees"             value={ic.clearance.documentFees}             onChange={v => onSetClearance('documentFees', v)} />
                <CostInputRow label="Customs Clearance"         value={ic.clearance.customsClearance}         onChange={v => onSetClearance('customsClearance', v)} />
                <CostInputRow label="Freight blended adjustment" value={ic.clearance.freightBlendedAdjustment} onChange={v => onSetClearance('freightBlendedAdjustment', v)} />
                <CostInputRow label="Free time storage extra"   value={ic.clearance.freeTimeStorageExtra}     onChange={v => onSetClearance('freeTimeStorageExtra', v)} />
                <CostInputRow label="Port Examination"          value={ic.clearance.portExamination}          onChange={v => onSetClearance('portExamination', v)} />
                <CostInputRow label="Port Health"               value={ic.clearance.portHealth}               onChange={v => onSetClearance('portHealth', v)} />
                <CostInputRow label="Ocean Freight £"           value={ic.clearance.oceanFreightGBP}          onChange={v => onSetClearance('oceanFreightGBP', v)} />
                <CostInputRow label="Ocean Freight $ (ref)"     value={ic.clearance.oceanFreightUSD}          onChange={v => onSetClearance('oceanFreightUSD', v)} prefix="$" />
                <CostInputRow label="Lo-Lo"                     value={ic.clearance.loLo}                     onChange={v => onSetClearance('loLo', v)} />
                <CostInputRow label="Demurrage"                 value={ic.clearance.demurrage}                onChange={v => onSetClearance('demurrage', v)} />
                <CostInputRow label="Vehicle Detention"         value={ic.clearance.vehicleDetention}         onChange={v => onSetClearance('vehicleDetention', v)} />
                <CostInputRow label="UK Transport"              value={ic.clearance.ukTransport}              onChange={v => onSetClearance('ukTransport', v)} />
                <tr style={{ borderTop: '2px solid rgba(217,119,6,0.4)' }}>
                  <td className="px-3 py-2 text-[11px] font-black uppercase tracking-wider" style={{ color: '#78350f' }}>Total (£)</td>
                  <td className="px-3 py-2 text-right text-sm font-black font-mono" style={{ color: '#78350f' }}>£{fmtGBP(results.clearanceTotalGBP)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </Section>

      {/* ─── 3. Products in Container — VIOLET ─── */}
      <Section title={`Products in Container (${ic.products.length}/${MAX_PRODUCTS})`} icon={<Icon name="package" size={13} />} accent="violet">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          {ic.products.map((p, i) => {
            const r = results.perProduct[i];
            return (
              <div key={i} className="p-3 rounded-xl space-y-2.5" style={{ background: 'rgba(168, 85, 247, 0.04)', border: '1px solid rgba(168, 85, 247, 0.20)' }}>
                <div className="flex items-center justify-between">
                  <p className="text-[11px] font-bold uppercase tracking-widest" style={{ color: '#6d28d9' }}>
                    {ordinal(i + 1)} Product
                  </p>
                  {ic.products.length > 1 && (
                    <button
                      onClick={() => onRemoveProduct(i)}
                      className="p-1 rounded"
                      style={{ color: 'rgba(168, 85, 247, 0.55)' }}
                      onMouseEnter={e => (e.currentTarget.style.color = '#dc2626')}
                      onMouseLeave={e => (e.currentTarget.style.color = 'rgba(168, 85, 247, 0.55)')}
                    >
                      <Icon name="trash" size={11} />
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-1 gap-2">
                  <Field label="Product Code">
                    <ProductCombobox
                      products={productCatalog}
                      value={p.productCode}
                      onSelect={prod => onProductCatalogSelect(i, prod)}
                      onCreate={onProductCatalogCreate}
                      onTextChange={txt => onSetProduct(i, 'productCode', txt)}
                      accentColor="#7c3aed"
                    />
                  </Field>
                  <Field label="Description">
                    <TextInputSm value={p.productDescription} onChange={v => onSetProduct(i, 'productDescription', v)} placeholder="e.g. LA Diner Chicken Goujons 18 x 480g" />
                  </Field>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <Field label="Case Count">
                    <NumInputSm value={p.caseCount} onChange={v => onSetProduct(i, 'caseCount', Math.max(0, Math.floor(v)))} step={1} placeholder="945" />
                  </Field>
                  <Field label="Case Weight (kg)">
                    <NumInputSm value={p.caseWeight} onChange={v => onSetProduct(i, 'caseWeight', v)} step={0.01} placeholder="8.64" />
                  </Field>
                  <Field label="Quantity (PO)">
                    <NumInputSm value={p.quantity} onChange={v => onSetProduct(i, 'quantity', Math.max(0, Math.floor(v)))} step={1} placeholder="945" />
                  </Field>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <Field label="PO Cost $">
                    <NumInputSm value={p.poCostUSD} onChange={v => onSetProduct(i, 'poCostUSD', v)} prefix="$" placeholder="33320.55" />
                  </Field>
                  <Field label="Product Cost $ (actual)">
                    <NumInputSm value={p.productCostUSD} onChange={v => onSetProduct(i, 'productCostUSD', v)} prefix="$" placeholder="33320.55" />
                  </Field>
                  <Field label="Sales Price £/Case">
                    <NumInputSm value={p.salesPricePerCase} onChange={v => onSetProduct(i, 'salesPricePerCase', v)} prefix="£" placeholder="40.32" />
                  </Field>
                </div>

                {/* Read-outs */}
                {r && (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-1.5 pt-1 mt-1" style={{ borderTop: '1px dashed rgba(168, 85, 247, 0.25)' }}>
                    <ReadOut label="Total Weight (t)"    value={r.totalWeightTonnes.toFixed(4)} />
                    <ReadOut label="Product Cost £"       value={`£${fmtGBP(r.productCostGBP)}`} />
                    <ReadOut label="Net Price / Case"     value={`£${fmt2(r.netPricePerCase)}`} />
                    <ReadOut label="Cost / Case (loaded)" value={`£${fmt2(r.costPerCase)}`} emphasis />
                  </div>
                )}
                {r && p.salesPricePerCase > 0 && (
                  <div className="flex items-center justify-between pt-2" style={{ borderTop: '1px solid rgba(168, 85, 247, 0.18)' }}>
                    <span className="text-[10px] uppercase tracking-wider" style={{ color: 'rgba(76,29,149,0.6)' }}>Margin</span>
                    <div className="flex items-center gap-1.5">
                      {r.marginPercent >= 0
                        ? <Icon name="trendingup" size={12} style={{ color: gmColor(r.marginPercent) }} />
                        : <Icon name="trendingdown" size={12} style={{ color: gmColor(r.marginPercent) }} />}
                      <span className="text-base font-black font-mono" style={{ color: gmColor(r.marginPercent) }}>
                        {r.marginPercent.toFixed(2)}%
                      </span>
                      <span className="text-[10px] font-mono ml-2" style={{ color: 'rgba(76,29,149,0.6)' }}>
                        ({r.marginGBPPerCase >= 0 ? '+' : ''}£{fmt2(r.marginGBPPerCase)}/case)
                      </span>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {ic.products.length < MAX_PRODUCTS && (
          <button
            onClick={onAddProduct}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition-colors"
            style={{
              background: 'rgba(168, 85, 247, 0.10)',
              color: '#6d28d9',
              border: '1px solid rgba(168, 85, 247, 0.25)',
            }}
            onMouseEnter={e => (e.currentTarget.style.background = 'rgba(168, 85, 247, 0.18)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'rgba(168, 85, 247, 0.10)')}
          >
            <Icon name="plus" size={12} /> Add product
          </button>
        )}
      </Section>

      {/* ─── 4. Summary — GREEN ─── */}
      <Section title="Summary" icon={<Icon name="trophy" size={13} />} accent="green">
        {/* Top stats */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
          <StatTile label="Total Container Cost"     value={`£${fmtGBP(results.totalContainerCost)}`} />
          <StatTile label="Total Cases"              value={fmtNum(results.totalCases)} />
          <StatTile label="Container Weight (t)"     value={results.containerWeightTonnes.toFixed(4)} sub={`${fmtNum(Math.round(results.containerWeightKg))} kg`} />
          <StatTile label="% Container Fill"         value={`${results.percentageContainerFill.toFixed(2)}%`} sub="based on qty ordered" />
          <StatTile label="Total Cost of Extras"     value={`£${fmtGBP(results.totalCostOfExtras)}`} sub={`£${fmtGBP4(results.pricePerKilo)} / kg`} accent="#ca8a04" />
        </div>

        {/* Per-product table */}
        <div className="overflow-x-auto rounded-xl" style={{ border: '1px solid rgba(245, 158, 11, 0.22)' }}>
          <table className="w-full text-xs">
            <thead>
              <tr style={{ background: 'rgba(245, 158, 11, 0.10)' }}>
                <th className="px-3 py-2 text-left text-[11px] uppercase tracking-widest" style={{ color: '#1a1410', borderBottom: '1px solid rgba(245, 158, 11, 0.22)' }}>Product</th>
                <th className="px-3 py-2 text-right text-[11px] uppercase tracking-widest" style={{ color: '#1a1410', borderBottom: '1px solid rgba(245, 158, 11, 0.22)' }}>Case Price</th>
                <th className="px-3 py-2 text-right text-[11px] uppercase tracking-widest" style={{ color: '#1a1410', borderBottom: '1px solid rgba(245, 158, 11, 0.22)' }}>Total Product Value</th>
                <th className="px-3 py-2 text-right text-[11px] uppercase tracking-widest" style={{ color: '#1a1410', borderBottom: '1px solid rgba(245, 158, 11, 0.22)' }}>Cumulative Total</th>
                <th className="px-3 py-2 text-right text-[11px] uppercase tracking-widest" style={{ color: '#1a1410', borderBottom: '1px solid rgba(245, 158, 11, 0.22)' }}>Sales Price</th>
                <th className="px-3 py-2 text-right text-[11px] uppercase tracking-widest" style={{ color: '#1a1410', borderBottom: '1px solid rgba(245, 158, 11, 0.22)' }}>Margin</th>
              </tr>
            </thead>
            <tbody>
              {ic.products.map((p, i) => {
                const r = results.perProduct[i];
                return (
                  <tr key={i} style={{ borderBottom: '1px solid rgba(245, 158, 11, 0.10)' }}>
                    <td className="px-3 py-2 text-[11px]" style={{ color: '#1a1410', borderRight: '1px solid rgba(245, 158, 11, 0.10)' }}>
                      <span className="font-bold font-mono">{p.productCode || '—'}</span>
                      <span className="ml-2" style={{ color: 'rgba(90, 74, 61, 0.55)' }}>{p.productDescription || ''}</span>
                    </td>
                    <td className="px-3 py-2 text-right font-mono" style={{ color: '#1a1410', borderRight: '1px solid rgba(245, 158, 11, 0.10)' }}>£{fmtGBP4(r?.costPerCase ?? 0)}</td>
                    <td className="px-3 py-2 text-right font-mono" style={{ color: '#1a1410', borderRight: '1px solid rgba(245, 158, 11, 0.10)' }}>£{fmtGBP(r?.totalProductValue ?? 0)}</td>
                    <td className="px-3 py-2 text-right font-mono" style={{ color: '#1a1410', borderRight: '1px solid rgba(245, 158, 11, 0.10)' }}>£{fmtGBP(r?.cumulativeTotal ?? 0)}</td>
                    <td className="px-3 py-2 text-right font-mono" style={{ color: '#1a1410', borderRight: '1px solid rgba(245, 158, 11, 0.10)' }}>{p.salesPricePerCase > 0 ? `£${fmtGBP(p.salesPricePerCase)}` : '—'}</td>
                    <td className="px-3 py-2 text-right font-mono font-bold" style={{ color: r && p.salesPricePerCase > 0 ? gmColor(r.marginPercent) : 'rgba(90, 74, 61, 0.4)' }}>
                      {r && p.salesPricePerCase > 0 ? `${r.marginPercent.toFixed(2)}%` : '—'}
                    </td>
                  </tr>
                );
              })}
              <tr style={{ background: 'rgba(245, 158, 11, 0.10)' }}>
                <td className="px-3 py-2 text-[11px] font-black uppercase tracking-wider" style={{ color: '#1a1410' }}>Total</td>
                <td className="px-3 py-2 text-right font-mono" style={{ color: '#1a1410' }}>—</td>
                <td className="px-3 py-2 text-right font-mono font-black" style={{ color: '#1a1410' }}>£{fmtGBP(results.totalContainerCost)}</td>
                <td className="px-3 py-2 text-right font-mono" style={{ color: '#1a1410' }}>—</td>
                <td className="px-3 py-2 text-right font-mono" style={{ color: '#1a1410' }}>—</td>
                <td className="px-3 py-2 text-right font-mono" style={{ color: '#1a1410' }}>—</td>
              </tr>
            </tbody>
          </table>
        </div>
      </Section>

    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function CostRow({ label, value, readOnly }: { label: string; value: string; readOnly?: boolean }) {
  return (
    <tr style={{ borderBottom: '1px solid rgba(217,119,6,0.10)' }}>
      <td className="px-3 py-1.5 text-[11px]" style={{ color: 'rgba(146,64,14,0.85)', fontWeight: readOnly ? 700 : 500 }}>{label}</td>
      <td className="px-3 py-1.5 text-right font-mono text-[11px] font-bold" style={{ color: readOnly ? '#92400e' : '#78350f', background: readOnly ? 'rgba(217,119,6,0.07)' : 'transparent' }}>{value}</td>
    </tr>
  );
}

function CostInputRow({ label, value, onChange, prefix = '£' }: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  prefix?: string;
}) {
  return (
    <tr style={{ borderBottom: '1px solid rgba(217,119,6,0.10)' }}>
      <td className="px-3 py-1 text-[11px]" style={{ color: 'rgba(146,64,14,0.85)' }}>{label}</td>
      <td className="px-2 py-0.5">
        <input
          type="number"
          value={value || ''}
          onChange={e => onChange(parseFloat(e.target.value) || 0)}
          placeholder="0.00"
          step={0.01}
          min={0}
          className="w-full px-2 py-1 text-right font-mono text-[11px] font-bold focus:outline-none"
          style={{ background: 'rgba(255,255,255,0.85)', border: '1px solid rgba(217,119,6,0.18)', borderRadius: 6, color: '#78350f' }}
        />
      </td>
    </tr>
  );
}

function ReadOut({ label, value, emphasis }: { label: string; value: string; emphasis?: boolean }) {
  return (
    <div className="p-1.5 rounded" style={{ background: 'rgba(255,255,255,0.6)', border: '1px solid rgba(168, 85, 247, 0.15)' }}>
      <p className="text-[9px] uppercase tracking-wider" style={{ color: 'rgba(76,29,149,0.55)', fontWeight: 600 }}>{label}</p>
      <p className="font-mono text-[11px] font-bold mt-0.5" style={{ color: emphasis ? '#7c3aed' : '#4c1d95', fontSize: emphasis ? 12 : 11 }}>{value}</p>
    </div>
  );
}

function ordinal(n: number): string {
  const suffix = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (suffix[(v - 20) % 10] ?? suffix[v] ?? suffix[0]);
}

