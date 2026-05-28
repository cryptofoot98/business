// AlgorithmExplainer — opens a presentation-style modal that walks through how
// the container packing engine works. Sections are designed to be readable
// when projected: large numbers, short copy, formula blocks, brief examples.
// Source of truth for the maths is src/utils/packing.ts.

import { Icon } from './Icon';
import { palette } from '../data/designTokens';

interface Props {
  open: boolean;
  onClose: () => void;
}

// ── Small primitives ─────────────────────────────────────────────────────────

function SectionTitle({ chip, title, sub }: { chip: string; title: string; sub?: string }) {
  return (
    <div className="mb-3">
      <div className="flex items-center gap-2.5">
        <span style={{ fontSize: 18 }}>{chip}</span>
        <h3 className="text-base font-bold" style={{ color: palette.ink, letterSpacing: '-0.01em' }}>{title}</h3>
      </div>
      {sub && <p className="text-xs mt-1.5" style={{ color: palette.inkMuted }}>{sub}</p>}
    </div>
  );
}

function Card({ children, accent = 'cream' }: { children: React.ReactNode; accent?: 'cream' | 'amber' }) {
  const bg = accent === 'amber' ? '#fef3c7' : '#fffaf0';
  const border = accent === 'amber' ? 'rgba(245,158,11,0.22)' : 'rgba(26,20,16,0.06)';
  return (
    <div
      className="p-4"
      style={{
        background: bg,
        border: `1px solid ${border}`,
        borderRadius: 16,
      }}
    >
      {children}
    </div>
  );
}

function Formula({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="px-4 py-3 my-2 font-mono text-[13px] leading-relaxed overflow-x-auto"
      style={{
        background: '#ffffff',
        border: '1px solid rgba(245,158,11,0.22)',
        borderRadius: 12,
        color: palette.ink,
      }}
    >
      {children}
    </div>
  );
}

function Step({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-3 mb-3.5">
      <div
        className="shrink-0 w-7 h-7 flex items-center justify-center text-xs font-bold"
        style={{
          background: `linear-gradient(135deg, ${palette.amber}, ${palette.amberDeep})`,
          color: '#fff',
          borderRadius: 9999,
          boxShadow: '0 4px 12px rgba(245,158,11,0.30)',
        }}
      >
        {n}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold leading-tight" style={{ color: palette.ink }}>{title}</p>
        <div className="text-xs mt-1.5 leading-relaxed" style={{ color: palette.inkMuted }}>{children}</div>
      </div>
    </div>
  );
}

// ── Main component ──────────────────────────────────────────────────────────

export function AlgorithmExplainer({ open, onClose }: Props) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6"
      style={{ background: 'rgba(26,20,16,0.40)', backdropFilter: 'blur(6px)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="w-full max-w-3xl max-h-full flex flex-col overflow-hidden"
        style={{
          background: '#ffffff',
          border: '1px solid rgba(26,20,16,0.06)',
          borderRadius: 28,
          boxShadow: '0 24px 64px rgba(26,20,16,0.20)',
        }}
      >
        {/* Header band */}
        <div
          className="flex items-start justify-between px-6 py-5 shrink-0"
          style={{
            background: 'linear-gradient(135deg, #fef3c7, #fed7aa)',
            borderBottom: '1px solid rgba(26,20,16,0.06)',
          }}
        >
          <div>
            <div className="flex items-center gap-2.5">
              <span style={{ fontSize: 20 }}>📐</span>
              <h2 className="text-base font-bold uppercase tracking-widest" style={{ color: '#78350f' }}>
                How the packing algorithm works
              </h2>
            </div>
            <p className="text-xs mt-1.5 max-w-xl" style={{ color: 'rgba(120,53,15,0.75)' }}>
              A walk-through of the engine that decides how many cases of which
              product fit in your container, in what orientation, and where they go.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full transition-colors shrink-0"
            style={{ color: 'rgba(120,53,15,0.7)', background: 'rgba(255,255,255,0.55)' }}
          >
            <Icon name="close" size={16} />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6" style={{ background: '#ffffff' }}>

          {/* ── Overview ── */}
          <section>
            <SectionTitle
              chip="🎯"
              title="The objective"
              sub="Maximise loaded units subject to physical and operational constraints."
            />
            <Card>
              <p className="text-sm leading-relaxed" style={{ color: palette.ink }}>
                For one or more product types, the engine searches for the placement that
                fits the largest number of cases inside the container without
                overlapping, exceeding the weight limit, breaking stacking rules,
                or violating orientation locks (e.g. "must stay upright").
              </p>
            </Card>
          </section>

          {/* ── Inputs ── */}
          <section>
            <SectionTitle chip="📥" title="Inputs" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Card>
                <p className="text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: palette.amberDeep }}>
                  Container
                </p>
                <ul className="text-xs space-y-1 leading-relaxed" style={{ color: palette.inkMuted }}>
                  <li><span className="font-mono">L × W × H</span> — internal dimensions (cm)</li>
                  <li><span className="font-mono">P</span> — max payload (kg)</li>
                  <li><span className="font-mono">f, t</span> — reefer floor &amp; top clearance (cm, 0 for dry)</li>
                  <li><span className="font-mono">e</span> — evaporator depth (cm, 0 for dry)</li>
                </ul>
              </Card>
              <Card>
                <p className="text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: palette.amberDeep }}>
                  Each product
                </p>
                <ul className="text-xs space-y-1 leading-relaxed" style={{ color: palette.inkMuted }}>
                  <li><span className="font-mono">l × w × h</span> — case dimensions</li>
                  <li><span className="font-mono">m</span> — gross weight per case (kg)</li>
                  <li><span className="font-mono">stackable</span>, <span className="font-mono">fragile</span> — booleans</li>
                  <li><span className="font-mono">orientationLock</span> — any / upright / flat</li>
                  <li><span className="font-mono">priority</span>, <span className="font-mono">quantity</span> cap</li>
                </ul>
              </Card>
            </div>
          </section>

          {/* ── Usable volume ── */}
          <section>
            <SectionTitle
              chip="📦"
              title="Step 1 — Usable container volume"
              sub="Reefer clearance and evaporator depth are subtracted before packing starts."
            />
            <Formula>
              {`bodyLength    = L − e
usableHeight  = H − f − t
V_container   = bodyLength × W × usableHeight   (cm³)`}
            </Formula>
            <p className="text-xs leading-relaxed" style={{ color: palette.inkMuted }}>
              For a dry container <span className="font-mono">f = t = e = 0</span>. The evaporator
              region is packed separately — it has the full container width but
              a reduced length, so cases still fit there if they're short enough.
            </p>
          </section>

          {/* ── Orientation enumeration ── */}
          <section>
            <SectionTitle
              chip="🔄"
              title="Step 2 — Enumerate orientations"
              sub="A box can sit in up to 6 rotations. Orientation locks prune this set."
            />
            <Formula>
              {`O(l,w,h) = { (l,w,h), (l,h,w), (w,l,h), (w,h,l), (h,l,w), (h,w,l) }
            after de-dupe & orientation-lock filter`}
            </Formula>
            <p className="text-xs leading-relaxed" style={{ color: palette.inkMuted }}>
              "Must stay upright" keeps only orientations whose third axis matches
              the original height. "Lay flat" keeps the inverse. Duplicate
              orientations (e.g. perfect cubes) are removed.
            </p>
          </section>

          {/* ── 1-product packing ── */}
          <section>
            <SectionTitle
              chip="🧱"
              title="Step 3 — Pack a single product into a rectangular zone"
              sub="For each orientation, compute the grid count, keep the best."
            />
            <Formula>
              {`For each orientation (bL, bW, bH):
   nX = ⌊cL / bL⌋
   nY = ⌊cW / bW⌋
   nZ = min(⌊cH / bH⌋, stackLimit)
   count = nX × nY × nZ

stackLimit = 1   if  fragile or not stackable
           = ∞   otherwise

effectiveMax = min(quantityCap, ⌊P / m⌋)
choose the orientation that maximises min(count, effectiveMax)`}
            </Formula>
            <Card accent="amber">
              <p className="text-xs leading-relaxed" style={{ color: '#78350f' }}>
                <span className="font-semibold">Residual fill:</span> after the main block
                there's often a strip of unused space at the back (lengthGap) and along
                the side (widthGap). The engine recursively packs these residual zones
                with the same orientation-search to squeeze in extra cases. It then
                tries the alternative split (width first, then length) and keeps the
                better total.
              </p>
            </Card>
          </section>

          {/* ── 2-product packing ── */}
          <section>
            <SectionTitle
              chip="🟦🟨"
              title="Step 4 — Pack 2 products"
              sub="Exhaustive search across every possible zone boundary along the length."
            />
            <Formula>
              {`for split ∈ {0, smallest-orientation-step, 2·step, … cL}:
   zoneA = pack(productA, split)
   zoneB = pack(productB, cL − split)
   if zoneA.weight + zoneB.weight > P: skip
   record (zoneA.count + zoneB.count)

best = argmax over all splits`}
            </Formula>
            <p className="text-xs leading-relaxed" style={{ color: palette.inkMuted }}>
              This guarantees the optimal length-wise split — the engine doesn't
              guess where to draw the line, it tries every meaningful boundary.
              The same logic applies if the better split is along the width axis.
            </p>
          </section>

          {/* ── 3+ product packing ── */}
          <section>
            <SectionTitle
              chip="🧠"
              title="Step 5 — Pack 3+ products"
              sub="Order matters. Try every permutation; keep the best."
            />
            <Formula>
              {`for π in permutations(products):    // n! orderings, n ≤ 5
   remaining = container
   for product in π:
      block = pack(product, remaining)
      total[π] += block.count
      remaining -= block.zone
keep π* with max total
generate positions for π*`}
            </Formula>
            <p className="text-xs leading-relaxed" style={{ color: palette.inkMuted }}>
              Counting-only on the first pass is fast — positions are only generated
              for the winning permutation, capped at <span className="font-mono">4,000</span>
              boxes for visualisation.
            </p>
          </section>

          {/* ── Pallet mode ── */}
          <section>
            <SectionTitle
              chip="🪵"
              title="Step 6 — Pallet mode"
              sub="When loading on pallets the maths shifts to pallets-per-container × cases-per-pallet."
            />
            <Formula>
              {`palletFootprint = (pL + 2·overhang) × (pW + 2·overhang)
palletsInBase   = floor packing of footprint in container floor
casesPerPallet  = best orientation packing within (pL, pW, maxHeight − pH)
                  subject to per-pallet weight limit
totalCases      = palletsInBase × casesPerPallet`}
            </Formula>
            <p className="text-xs leading-relaxed" style={{ color: palette.inkMuted }}>
              Pallet footprints are placed in the container base in two competing
              rotations; the better packing wins. Each pallet then runs the
              orientation search to maximise its own cases.
            </p>
          </section>

          {/* ── Output metrics ── */}
          <section>
            <SectionTitle
              chip="📊"
              title="Step 7 — Output metrics"
              sub="What you see in the Results panel."
            />
            <Formula>
              {`Volume utilisation  = Σ (l × w × h) of packed cases ÷ V_container
Weight utilisation  = Σ gross weight of packed cases ÷ P
Cases per pallet    = pallet pack count
Container fill kg   = Σ gross weight of packed cases
Centre of gravity   = weighted mean of (box centre, gross weight)
                        — used to flag axle / forklift balance issues`}
            </Formula>
          </section>

          {/* ── Constraints ── */}
          <section>
            <SectionTitle chip="🚧" title="Constraints enforced at every step" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Card>
                <p className="text-xs font-semibold uppercase tracking-widest mb-1.5" style={{ color: palette.amberDeep }}>
                  Physical
                </p>
                <ul className="text-xs space-y-1 list-disc pl-4" style={{ color: palette.inkMuted }}>
                  <li>No two boxes overlap</li>
                  <li>No box extends past container walls / ceiling</li>
                  <li>Reefer clearance respected (floor + top + evaporator)</li>
                  <li>Σ gross weight ≤ container max payload</li>
                </ul>
              </Card>
              <Card>
                <p className="text-xs font-semibold uppercase tracking-widest mb-1.5" style={{ color: palette.amberDeep }}>
                  Operational
                </p>
                <ul className="text-xs space-y-1 list-disc pl-4" style={{ color: palette.inkMuted }}>
                  <li>Fragile boxes never stacked above 1 layer</li>
                  <li><span className="font-mono">orientationLock</span> respected when set</li>
                  <li>Per-product quantity cap respected</li>
                  <li>Visual render capped at 4,000 boxes (counts still exact)</li>
                </ul>
              </Card>
            </div>
          </section>

          {/* ── Notes on optimality ── */}
          <section>
            <SectionTitle chip="🧮" title="On optimality" />
            <Card accent="amber">
              <p className="text-xs leading-relaxed" style={{ color: '#78350f' }}>
                3D bin-packing with rotations is NP-hard in general. The engine uses
                exact methods where they're cheap (1 product: orientation × 3-region
                residuals; 2 products: exhaustive split), and pragmatic heuristics
                where exact methods don't scale (3+ products: full permutation search
                with counting-only first pass). For real container/case ratios this
                produces results that match or beat hand-packed layouts, with full
                determinism — the same inputs always give the same plan.
              </p>
            </Card>
          </section>

          {/* ── Footer cue ── */}
          <section className="pb-2">
            <p className="text-[11px] text-center" style={{ color: palette.inkFaint }}>
              Source of truth: <span className="font-mono">src/utils/packing.ts</span> ·
              {' '}questions welcome.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
