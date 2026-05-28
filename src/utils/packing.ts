import { ContainerType, LoadingMode, MultiContainerResult, PackedBox, PackedPallet, PackingResult, PackingZoneData, PalletConfig, Product, ProductResult } from '../types';

type Orientation = [number, number, number];

const MAX_VISUAL_BOXES = 4000;
const MAX_CONTAINERS = 50;

function getOrientations(l: number, w: number, h: number): Orientation[] {
  const set = new Set<string>();
  const result: Orientation[] = [];
  const perms: Orientation[] = [
    [l, w, h], [l, h, w],
    [w, l, h], [w, h, l],
    [h, l, w], [h, w, l],
  ];
  for (const p of perms) {
    const key = p.join(',');
    if (!set.has(key)) {
      set.add(key);
      result.push(p);
    }
  }
  return result;
}

function getOrientationsForProduct(product: Product): Orientation[] {
  const all = getOrientations(product.length, product.width, product.height);
  const lock = product.orientationLock ?? 'none';
  if (lock === 'none') return all;

  const origH = product.height;
  const filtered = all.filter(([, , bH]) =>
    lock === 'upright' ? bH === origH : bH !== origH,
  );
  return filtered.length > 0 ? filtered : all;
}

function countAndPositions(
  cL: number, cW: number, cH: number,
  bL: number, bW: number, bH: number,
  maxCount: number,
  maxStackLayers: number,
  originX = 0, originY = 0, originZ = 0,
  generatePositions = true,
): { count: number; nX: number; nY: number; nZ: number; positions: Omit<PackedBox, 'productId'>[] } {
  const nX = Math.floor(cL / bL);
  const nY = Math.floor(cW / bW);
  const nZRaw = Math.floor(cH / bH);
  const nZ = Math.min(nZRaw, maxStackLayers);
  const total = Math.min(nX * nY * nZ, maxCount);

  if (!generatePositions) return { count: total, nX, nY, nZ, positions: [] };

  const positions: Omit<PackedBox, 'productId'>[] = [];
  let placed = 0;

  outer: for (let x = 0; x < nX; x++) {
    for (let y = 0; y < nY; y++) {
      for (let z = 0; z < nZ; z++) {
        if (placed >= maxCount) break outer;
        positions.push({
          x: originX + x * bL,
          y: originY + y * bW,
          z: originZ + z * bH,
          l: bL,
          w: bW,
          h: bH,
        });
        placed++;
      }
    }
  }

  return { count: placed, nX, nY, nZ, positions };
}

function calcCenterOfGravity(
  boxes: PackedBox[],
  products: Product[],
): { cogX: number; cogY: number } {
  const productMap = new Map(products.map(p => [p.id, p]));
  let totalWeight = 0;
  let sumX = 0;
  let sumY = 0;

  for (const box of boxes) {
    const p = productMap.get(box.productId);
    if (!p) continue;
    const w = p.grossWeight > 0 ? p.grossWeight : 1;
    const cx = box.x + box.l / 2;
    const cy = box.z + box.h / 2;
    sumX += cx * w;
    sumY += cy * w;
    totalWeight += w;
  }

  if (totalWeight === 0) return { cogX: 0, cogY: 0 };
  return { cogX: sumX / totalWeight, cogY: sumY / totalWeight };
}

interface BlockResult {
  count: number;
  orientation: Orientation;
  nX: number;
  nY: number;
  nZ: number;
  positions: Omit<PackedBox, 'productId'>[];
}

function packBlock(
  availableLength: number,
  availableWidth: number,
  availableHeight: number,
  orientations: Orientation[],
  maxStackLayers: number,
  effectiveMax: number,
  generatePositions: boolean,
  originX: number,
  originY: number,
  originZ: number,
  visualBudget: number,
): BlockResult {
  const none: BlockResult = { count: 0, orientation: orientations[0] ?? [1, 1, 1], nX: 0, nY: 0, nZ: 0, positions: [] };

  if (availableLength <= 0 || availableWidth <= 0 || availableHeight <= 0 || effectiveMax <= 0) return none;

  let best: BlockResult = { ...none };

  for (const [bL, bW, bH] of orientations) {
    const nX = Math.floor(availableLength / bL);
    const nY = Math.floor(availableWidth / bW);
    const nZRaw = Math.floor(availableHeight / bH);
    const nZ = maxStackLayers === Infinity ? nZRaw : Math.min(nZRaw, maxStackLayers);
    const count = Math.min(nX * nY * nZ, effectiveMax);

    if (count > best.count) {
      best = { count, orientation: [bL, bW, bH], nX, nY, nZ, positions: [] };
    }
  }

  if (generatePositions && best.count > 0) {
    const [bL, bW, bH] = best.orientation;
    const limit = Math.min(best.count, visualBudget);
    const { positions } = countAndPositions(
      availableLength, availableWidth, availableHeight,
      bL, bW, bH,
      limit,
      maxStackLayers === Infinity ? Infinity : maxStackLayers,
      originX, originY, originZ,
    );
    best.positions = positions;
  }

  return best;
}

function packBlockWithResidual(
  availableLength: number,
  availableWidth: number,
  availableHeight: number,
  orientations: Orientation[],
  maxStackLayers: number,
  effectiveMax: number,
  generatePositions: boolean,
  originX: number,
  originY: number,
  originZ: number,
  visualBudget: number,
): { count: number; positions: Omit<PackedBox, 'productId'>[]; mainOrientation: Orientation; zones?: PackingZoneData[]; zoneSplitAxis?: 'height' | 'width' | 'length' } {

  // Strategy 1 (exhaustive): try every orientation as the main block, and for each
  // try three residual decompositions of the L-shape negative space. Pick the best
  // total across all (main orientation × decomposition) pairs.
  //
  //   Variant A — back strip carries the corner (legacy 3-region):
  //     [main]
  //     [back  lengthGap × availW]   <- spans full width including corner
  //     [side  mainUsedL × widthGap]
  //
  //   Variant B — side strip carries the corner:
  //     [main]
  //     [side  availL × widthGap]    <- spans full length including corner
  //     [back  lengthGap × mainUsedW]
  //
  //   Variant C — 4-region, every zone independent:
  //     [main]
  //     [back  lengthGap × mainUsedW]
  //     [side  mainUsedL × widthGap]
  //     [corner lengthGap × widthGap]
  //
  // The main contribution beyond the previous implementation is iterating over
  // every orientation as the main (not just the highest-count single orientation)
  // and adding Variant B / C so the corner area isn't trapped under a single
  // shared orientation with the rest of the residual strip.

  type S1Zone = {
    count: number;
    ori: Orientation;
    dimL: number;
    dimW: number;
    offsetX: number;   // relative to originX
    offsetY: number;   // relative to originY
  };
  type S1Plan = {
    total: number;
    mainOri: Orientation;
    mainNX: number; mainNY: number; mainNZ: number;
    residuals: S1Zone[];
  };

  let s1Best: S1Plan | null = null;
  const noBlock = { count: 0, orientation: orientations[0] ?? [1, 1, 1] as Orientation, nX: 0, nY: 0, nZ: 0, positions: [] };

  for (const mainOri of orientations) {
    const [mBL, mBW, mBH] = mainOri;
    const nXm = Math.floor(availableLength / mBL);
    const nYm = Math.floor(availableWidth / mBW);
    const nZmRaw = Math.floor(availableHeight / mBH);
    const nZm = maxStackLayers === Infinity ? nZmRaw : Math.min(nZmRaw, maxStackLayers);
    if (nXm === 0 || nYm === 0 || nZm === 0) continue;

    const mainCnt = Math.min(nXm * nYm * nZm, effectiveMax);
    const mUsedL = nXm * mBL;
    const mUsedW = nYm * mBW;
    const lGap = availableLength - mUsedL;
    const wGap = availableWidth - mUsedW;
    const remainA = effectiveMax - mainCnt;

    // ── Variant A ─────────────────────────────────────────────────────────
    const aBack = (remainA > 0 && lGap > 0) ? packBlock(
      lGap, availableWidth, availableHeight,
      orientations, maxStackLayers, remainA,
      false, 0, 0, 0, 0,
    ) : noBlock;
    const remAa = remainA - aBack.count;
    const aSide = (remAa > 0 && wGap > 0 && mUsedL > 0) ? packBlock(
      mUsedL, wGap, availableHeight,
      orientations, maxStackLayers, remAa,
      false, 0, 0, 0, 0,
    ) : noBlock;
    const totalA = mainCnt + aBack.count + aSide.count;

    // ── Variant B ─────────────────────────────────────────────────────────
    const bSide = (remainA > 0 && wGap > 0) ? packBlock(
      availableLength, wGap, availableHeight,
      orientations, maxStackLayers, remainA,
      false, 0, 0, 0, 0,
    ) : noBlock;
    const remBb = remainA - bSide.count;
    const bBack = (remBb > 0 && lGap > 0 && mUsedW > 0) ? packBlock(
      lGap, mUsedW, availableHeight,
      orientations, maxStackLayers, remBb,
      false, 0, 0, 0, 0,
    ) : noBlock;
    const totalB = mainCnt + bSide.count + bBack.count;

    // ── Variant C ─ 4-region (independent corner) ─────────────────────────
    const cBack = (remainA > 0 && lGap > 0 && mUsedW > 0) ? packBlock(
      lGap, mUsedW, availableHeight,
      orientations, maxStackLayers, remainA,
      false, 0, 0, 0, 0,
    ) : noBlock;
    const remCb = remainA - cBack.count;
    const cSide = (remCb > 0 && wGap > 0 && mUsedL > 0) ? packBlock(
      mUsedL, wGap, availableHeight,
      orientations, maxStackLayers, remCb,
      false, 0, 0, 0, 0,
    ) : noBlock;
    const remCs = remCb - cSide.count;
    const cCorner = (remCs > 0 && lGap > 0 && wGap > 0) ? packBlock(
      lGap, wGap, availableHeight,
      orientations, maxStackLayers, remCs,
      false, 0, 0, 0, 0,
    ) : noBlock;
    const totalC = mainCnt + cBack.count + cSide.count + cCorner.count;

    // Pick best variant for this main orientation
    let plan: S1Plan;
    if (totalA >= totalB && totalA >= totalC) {
      plan = {
        total: totalA, mainOri, mainNX: nXm, mainNY: nYm, mainNZ: nZm,
        residuals: [
          { count: aBack.count, ori: aBack.orientation, dimL: lGap,    dimW: availableWidth, offsetX: mUsedL, offsetY: 0      },
          { count: aSide.count, ori: aSide.orientation, dimL: mUsedL,  dimW: wGap,           offsetX: 0,      offsetY: mUsedW },
        ].filter(z => z.count > 0),
      };
    } else if (totalB >= totalC) {
      plan = {
        total: totalB, mainOri, mainNX: nXm, mainNY: nYm, mainNZ: nZm,
        residuals: [
          { count: bSide.count, ori: bSide.orientation, dimL: availableLength, dimW: wGap,    offsetX: 0,      offsetY: mUsedW },
          { count: bBack.count, ori: bBack.orientation, dimL: lGap,            dimW: mUsedW,  offsetX: mUsedL, offsetY: 0      },
        ].filter(z => z.count > 0),
      };
    } else {
      plan = {
        total: totalC, mainOri, mainNX: nXm, mainNY: nYm, mainNZ: nZm,
        residuals: [
          { count: cBack.count,   ori: cBack.orientation,   dimL: lGap,   dimW: mUsedW, offsetX: mUsedL, offsetY: 0      },
          { count: cSide.count,   ori: cSide.orientation,   dimL: mUsedL, dimW: wGap,   offsetX: 0,      offsetY: mUsedW },
          { count: cCorner.count, ori: cCorner.orientation, dimL: lGap,   dimW: wGap,   offsetX: mUsedL, offsetY: mUsedW },
        ].filter(z => z.count > 0),
      };
    }

    if (s1Best === null || plan.total > s1Best.total) {
      s1Best = plan;
    }
  }

  const strategy1Count = s1Best ? s1Best.total : 0;
  let strategy1Positions: Omit<PackedBox, 'productId'>[] = [];
  const mainOrientationForS1: Orientation = s1Best ? s1Best.mainOri : (orientations[0] ?? [1, 1, 1]);

  if (generatePositions && s1Best && s1Best.total > 0) {
    const mCnt = s1Best.mainNX * s1Best.mainNY * s1Best.mainNZ;
    const total = mCnt + s1Best.residuals.reduce((s, r) => s + r.count, 0);
    const limitMain = Math.min(mCnt, Math.round(visualBudget * mCnt / total));

    const [mBL, mBW, mBH] = s1Best.mainOri;
    const { positions: pMain } = countAndPositions(
      availableLength, availableWidth, availableHeight,
      mBL, mBW, mBH, limitMain,
      maxStackLayers === Infinity ? Infinity : maxStackLayers,
      originX, originY, originZ,
    );
    strategy1Positions = [...pMain];
    let budgetLeft = visualBudget - pMain.length;

    for (const r of s1Best.residuals) {
      if (budgetLeft <= 0) break;
      const limitR = Math.min(r.count, Math.round(visualBudget * r.count / total), budgetLeft);
      if (limitR <= 0) continue;
      const [rBL, rBW, rBH] = r.ori;
      const { positions } = countAndPositions(
        r.dimL, r.dimW, availableHeight,
        rBL, rBW, rBH, limitR,
        maxStackLayers === Infinity ? Infinity : maxStackLayers,
        originX + r.offsetX, originY + r.offsetY, originZ,
      );
      strategy1Positions.push(...positions);
      budgetLeft -= positions.length;
    }
  }

  // Compatibility shim — older code below refers to `main` as the winning main block.
  const main = {
    count: strategy1Count,
    orientation: mainOrientationForS1,
    nX: s1Best?.mainNX ?? 0,
    nY: s1Best?.mainNY ?? 0,
    nZ: s1Best?.mainNZ ?? 0,
    positions: [] as Omit<PackedBox, 'productId'>[],
  };

  let bestHeightZones: PackingZoneData[] = [];
  let bestWidthZones: PackingZoneData[] = [];
  let bestLengthZones: PackingZoneData[] = [];

  // Strategy 2: height split — lower layers use one orientation, upper layers another
  let bestHeightSplitCount = 0;
  let bestHeightSplitPositions: Omit<PackedBox, 'productId'>[] = [];
  let bestHeightSplitOrientation: Orientation = orientations[0] ?? [1, 1, 1];

  for (const [bL1, bW1, bH1] of orientations) {
    for (const [bL2, bW2, bH2] of orientations) {
      if (bL1 === bL2 && bW1 === bW2 && bH1 === bH2) continue;

      const nZLow = Math.floor(availableHeight / bH1);
      if (nZLow === 0) continue;

      for (let lowLayers = 1; lowLayers < nZLow; lowLayers++) {
        const lowHeight = lowLayers * bH1;
        const highHeight = availableHeight - lowHeight;
        if (highHeight < bH2) continue;

        const nXLow = Math.floor(availableLength / bL1);
        const nYLow = Math.floor(availableWidth / bW1);
        const countLow = Math.min(nXLow * nYLow * lowLayers, effectiveMax);

        const nXHigh = Math.floor(availableLength / bL2);
        const nYHigh = Math.floor(availableWidth / bW2);
        const nZHigh = Math.floor(highHeight / bH2);
        const countHigh = Math.min(nXHigh * nYHigh * nZHigh, Math.max(0, effectiveMax - countLow));

        // Also try width residual in each height zone
        const usedWLow = nYLow * bW1;
        const wGapLow = availableWidth - usedWLow;
        let countLowWRes = 0;
        if (wGapLow > 0) {
          for (const [rL, rW, rH] of orientations) {
            const rNX = Math.floor((nXLow * bL1) / rL);
            const rNY = Math.floor(wGapLow / rW);
            const rNZ = Math.floor(lowHeight / rH);
            const cnt = Math.min(rNX * rNY * rNZ, Math.max(0, effectiveMax - countLow - countHigh));
            if (cnt > countLowWRes) countLowWRes = cnt;
          }
        }

        const totalMixed = countLow + countHigh + countLowWRes;

        if (totalMixed > bestHeightSplitCount) {
          bestHeightSplitCount = totalMixed;
          bestHeightSplitOrientation = countLow >= countHigh ? [bL1, bW1, bH1] : [bL2, bW2, bH2];
          bestHeightZones = [
            { count: countLow, orientation: [bL1, bW1, bH1], nX: nXLow, nY: nYLow, nZ: lowLayers },
            { count: countHigh, orientation: [bL2, bW2, bH2], nX: nXHigh, nY: nYHigh, nZ: nZHigh },
          ];

          if (generatePositions) {
            const limitLow = Math.min(countLow, Math.floor(visualBudget / 2));
            const limitHigh = Math.min(countHigh, visualBudget - limitLow);

            const { positions: pl } = countAndPositions(
              availableLength, availableWidth, lowHeight,
              bL1, bW1, bH1, limitLow,
              maxStackLayers === Infinity ? Infinity : maxStackLayers,
              originX, originY, originZ,
            );

            const { positions: ph } = countAndPositions(
              availableLength, availableWidth, highHeight,
              bL2, bW2, bH2, limitHigh,
              maxStackLayers === Infinity ? Infinity : maxStackLayers,
              originX, originY, originZ + lowHeight,
            );

            bestHeightSplitPositions = [...pl, ...ph];
          }
        }
      }
    }
  }

  // Strategy 3: width split — left columns use one orientation, right columns another
  let bestWidthSplitCount = 0;
  let bestWidthSplitPositions: Omit<PackedBox, 'productId'>[] = [];
  let bestWidthSplitOrientation: Orientation = orientations[0] ?? [1, 1, 1];

  for (let oi1 = 0; oi1 < orientations.length; oi1++) {
    const [bL1, bW1, bH1] = orientations[oi1];
    const nX1 = Math.floor(availableLength / bL1);
    const nZ1 = maxStackLayers === Infinity ? Math.floor(availableHeight / bH1) : Math.min(Math.floor(availableHeight / bH1), maxStackLayers);
    if (nX1 === 0 || nZ1 === 0) continue;

    for (let oi2 = 0; oi2 < orientations.length; oi2++) {
      if (oi1 === oi2) continue;
      const [bL2, bW2, bH2] = orientations[oi2];
      const nX2 = Math.floor(availableLength / bL2);
      const nZ2 = maxStackLayers === Infinity ? Math.floor(availableHeight / bH2) : Math.min(Math.floor(availableHeight / bH2), maxStackLayers);
      if (nX2 === 0 || nZ2 === 0) continue;

      const maxCols1 = Math.floor(availableWidth / bW1);
      for (let cols1 = 1; cols1 <= maxCols1; cols1++) {
        const usedWidth1 = cols1 * bW1;
        const remainWidth = availableWidth - usedWidth1;
        if (remainWidth <= 0) break;

        const cols2 = Math.floor(remainWidth / bW2);
        if (cols2 === 0) continue;

        const usedWidth2 = cols2 * bW2;
        const remainWidth3 = remainWidth - usedWidth2;

        let count3 = 0;
        let z3L = 0, z3W = 0, z3H = 0, z3Cols = 0;
        if (remainWidth3 > 0) {
          for (const [bL3, bW3, bH3] of orientations) {
            const c3 = Math.floor(remainWidth3 / bW3);
            if (c3 === 0) continue;
            const nX3 = Math.floor(availableLength / bL3);
            const nZ3raw = Math.floor(availableHeight / bH3);
            const nZ3 = maxStackLayers === Infinity ? nZ3raw : Math.min(nZ3raw, maxStackLayers);
            if (nX3 === 0 || nZ3 === 0) continue;
            const cnt3 = nX3 * c3 * nZ3;
            if (cnt3 > count3) {
              count3 = cnt3;
              z3L = bL3; z3W = bW3; z3H = bH3; z3Cols = c3;
            }
          }
        }

        const count1 = nX1 * cols1 * nZ1;
        const count2 = nX2 * cols2 * nZ2;
        const totalSplit = Math.min(count1 + count2 + count3, effectiveMax);

        if (totalSplit > bestWidthSplitCount) {
          bestWidthSplitCount = totalSplit;
          const maxC = Math.max(count1, count2, count3);
          bestWidthSplitOrientation = count1 === maxC ? [bL1, bW1, bH1]
            : count2 === maxC ? [bL2, bW2, bH2]
            : [z3L, z3W, z3H] as Orientation;
          bestWidthZones = [
            { count: count1, orientation: [bL1, bW1, bH1], nX: nX1, nY: cols1, nZ: nZ1 },
            { count: count2, orientation: [bL2, bW2, bH2], nX: nX2, nY: cols2, nZ: nZ2 },
            ...(count3 > 0 ? [{ count: count3, orientation: [z3L, z3W, z3H] as [number, number, number], nX: Math.floor(availableLength / z3L), nY: z3Cols, nZ: maxStackLayers === Infinity ? Math.floor(availableHeight / z3H) : Math.min(Math.floor(availableHeight / z3H), maxStackLayers) }] : []),
          ].filter(z => z.count > 0);

          if (generatePositions) {
            const hasZone3 = count3 > 0;
            const limit1 = Math.min(count1, Math.floor(visualBudget * (hasZone3 ? 0.34 : 0.5)));
            const limit2 = Math.min(count2, Math.floor(visualBudget * (hasZone3 ? 0.34 : 0.5)));
            const limit3 = Math.min(count3, visualBudget - limit1 - limit2);

            const { positions: p1 } = countAndPositions(
              availableLength, usedWidth1, availableHeight,
              bL1, bW1, bH1, limit1,
              maxStackLayers === Infinity ? Infinity : maxStackLayers,
              originX, originY, originZ,
            );

            const { positions: p2 } = countAndPositions(
              availableLength, usedWidth2, availableHeight,
              bL2, bW2, bH2, limit2,
              maxStackLayers === Infinity ? Infinity : maxStackLayers,
              originX, originY + usedWidth1, originZ,
            );

            let p3: Omit<PackedBox, 'productId'>[] = [];
            if (hasZone3 && limit3 > 0) {
              const { positions } = countAndPositions(
                availableLength, z3Cols * z3W, availableHeight,
                z3L, z3W, z3H, limit3,
                maxStackLayers === Infinity ? Infinity : maxStackLayers,
                originX, originY + usedWidth1 + usedWidth2, originZ,
              );
              p3 = positions;
            }

            bestWidthSplitPositions = [...p1, ...p2, ...p3];
          }
        }
      }
    }
  }

  // Strategy 4: length split — front rows use one orientation, back rows another
  let bestLengthSplitCount = 0;
  let bestLengthSplitPositions: Omit<PackedBox, 'productId'>[] = [];
  let bestLengthSplitOrientation: Orientation = orientations[0] ?? [1, 1, 1];

  for (let oi1 = 0; oi1 < orientations.length; oi1++) {
    const [bL1, bW1, bH1] = orientations[oi1];
    const nY1 = Math.floor(availableWidth / bW1);
    const nZ1 = maxStackLayers === Infinity ? Math.floor(availableHeight / bH1) : Math.min(Math.floor(availableHeight / bH1), maxStackLayers);
    if (nY1 === 0 || nZ1 === 0) continue;

    for (let oi2 = 0; oi2 < orientations.length; oi2++) {
      if (oi1 === oi2) continue;
      const [bL2, bW2, bH2] = orientations[oi2];
      const nY2 = Math.floor(availableWidth / bW2);
      const nZ2 = maxStackLayers === Infinity ? Math.floor(availableHeight / bH2) : Math.min(Math.floor(availableHeight / bH2), maxStackLayers);
      if (nY2 === 0 || nZ2 === 0) continue;

      const maxRows1 = Math.floor(availableLength / bL1);
      const maxIterRows = Math.min(maxRows1, 80);

      for (let rows1 = 1; rows1 <= maxIterRows; rows1++) {
        const usedLength1 = rows1 * bL1;
        const remainLength = availableLength - usedLength1;
        if (remainLength < bL2) break;

        const rows2 = Math.floor(remainLength / bL2);
        const usedLength2 = rows2 * bL2;
        const remainLength3 = remainLength - usedLength2;

        let count3L = 0;
        let z3bL = 0, z3bW = 0, z3bH = 0, z3rows = 0;
        if (remainLength3 > 0) {
          for (const [bL3, bW3, bH3] of orientations) {
            if (bL3 > remainLength3) continue;
            const r3 = Math.floor(remainLength3 / bL3);
            if (r3 === 0) continue;
            const nY3 = Math.floor(availableWidth / bW3);
            const nZ3raw = Math.floor(availableHeight / bH3);
            const nZ3 = maxStackLayers === Infinity ? nZ3raw : Math.min(nZ3raw, maxStackLayers);
            if (nY3 === 0 || nZ3 === 0) continue;
            const cnt3 = r3 * nY3 * nZ3;
            if (cnt3 > count3L) {
              count3L = cnt3;
              z3bL = bL3; z3bW = bW3; z3bH = bH3; z3rows = r3;
            }
          }
        }

        const count1 = rows1 * nY1 * nZ1;
        const count2 = rows2 * nY2 * nZ2;
        const totalSplit = Math.min(count1 + count2 + count3L, effectiveMax);

        if (totalSplit > bestLengthSplitCount) {
          bestLengthSplitCount = totalSplit;
          const maxC = Math.max(count1, count2, count3L);
          bestLengthSplitOrientation = count1 === maxC ? [bL1, bW1, bH1]
            : count2 === maxC ? [bL2, bW2, bH2]
            : [z3bL, z3bW, z3bH] as Orientation;
          bestLengthZones = [
            { count: count1, orientation: [bL1, bW1, bH1], nX: rows1, nY: nY1, nZ: nZ1 },
            { count: count2, orientation: [bL2, bW2, bH2], nX: rows2, nY: nY2, nZ: nZ2 },
            ...(count3L > 0 ? [{ count: count3L, orientation: [z3bL, z3bW, z3bH] as [number, number, number], nX: z3rows, nY: Math.floor(availableWidth / z3bW), nZ: maxStackLayers === Infinity ? Math.floor(availableHeight / z3bH) : Math.min(Math.floor(availableHeight / z3bH), maxStackLayers) }] : []),
          ].filter(z => z.count > 0);

          if (generatePositions) {
            const hasZone3 = count3L > 0;
            const limit1 = Math.min(count1, Math.floor(visualBudget * (hasZone3 ? 0.34 : 0.5)));
            const limit2 = Math.min(count2, Math.floor(visualBudget * (hasZone3 ? 0.34 : 0.5)));
            const limit3 = Math.min(count3L, visualBudget - limit1 - limit2);

            const { positions: p1 } = countAndPositions(
              usedLength1, availableWidth, availableHeight,
              bL1, bW1, bH1, limit1,
              maxStackLayers === Infinity ? Infinity : maxStackLayers,
              originX, originY, originZ,
            );

            const { positions: p2 } = countAndPositions(
              usedLength2, availableWidth, availableHeight,
              bL2, bW2, bH2, limit2,
              maxStackLayers === Infinity ? Infinity : maxStackLayers,
              originX + usedLength1, originY, originZ,
            );

            let p3: Omit<PackedBox, 'productId'>[] = [];
            if (hasZone3 && limit3 > 0) {
              const { positions } = countAndPositions(
                z3rows * z3bL, availableWidth, availableHeight,
                z3bL, z3bW, z3bH, limit3,
                maxStackLayers === Infinity ? Infinity : maxStackLayers,
                originX + usedLength1 + usedLength2, originY, originZ,
              );
              p3 = positions;
            }

            bestLengthSplitPositions = [...p1, ...p2, ...p3];
          }
        }
      }
    }
  }

  // Pick the best strategy
  const best = Math.max(strategy1Count, bestHeightSplitCount, bestWidthSplitCount, bestLengthSplitCount);

  if (best === bestLengthSplitCount && bestLengthSplitCount >= bestWidthSplitCount && bestLengthSplitCount > strategy1Count && bestLengthSplitCount >= bestHeightSplitCount) {
    return { count: bestLengthSplitCount, positions: bestLengthSplitPositions, mainOrientation: bestLengthSplitOrientation, zones: bestLengthZones, zoneSplitAxis: 'length' };
  }

  if (best === bestWidthSplitCount && bestWidthSplitCount > strategy1Count && bestWidthSplitCount >= bestHeightSplitCount) {
    return { count: bestWidthSplitCount, positions: bestWidthSplitPositions, mainOrientation: bestWidthSplitOrientation, zones: bestWidthZones, zoneSplitAxis: 'width' };
  }

  if (best === bestHeightSplitCount && bestHeightSplitCount > strategy1Count) {
    return { count: bestHeightSplitCount, positions: bestHeightSplitPositions, mainOrientation: bestHeightSplitOrientation, zones: bestHeightZones, zoneSplitAxis: 'height' };
  }

  return { count: strategy1Count, positions: strategy1Positions, mainOrientation: main.orientation };
}

function packSingleProduct(
  container: ContainerType,
  product: Product,
  originX = 0,
  originY = 0,
  originZ = 0,
  availableLength = container.innerLength,
  availableWidth = container.innerWidth,
  availableHeight = container.innerHeight,
  maxCount = Infinity,
  generatePositions = true,
): ProductResult & { packedBoxes: Omit<PackedBox, 'productId'>[] } {
  const orientations = getOrientationsForProduct(product);
  const maxStackLayers = product.stackable === false || product.fragile === true ? 1 : Infinity;
  const quantityLimit = product.quantity && product.quantity > 0 ? product.quantity : Infinity;
  const effectiveMax = Math.min(maxCount, quantityLimit);

  let best = {
    count: 0,
    orientation: [product.length, product.width, product.height] as Orientation,
    nX: 0, nY: 0, nZ: 0,
    positions: [] as Omit<PackedBox, 'productId'>[],
  };

  for (const [bL, bW, bH] of orientations) {
    const nX = Math.floor(availableLength / bL);
    const nY = Math.floor(availableWidth / bW);
    const nZRaw = Math.floor(availableHeight / bH);
    const nZ = Math.min(nZRaw, maxStackLayers === Infinity ? nZRaw : maxStackLayers);
    const rawCount = nX * nY * nZ;
    const count = Math.min(rawCount, effectiveMax);

    if (count > best.count) {
      best = { count, orientation: [bL, bW, bH], nX, nY, nZ, positions: [] };
    }
  }

  if (generatePositions && best.count > 0) {
    const [bL, bW, bH] = best.orientation;
    const visualLimit = Math.min(best.count, MAX_VISUAL_BOXES);
    const { positions } = countAndPositions(
      availableLength, availableWidth, availableHeight,
      bL, bW, bH,
      visualLimit,
      maxStackLayers === Infinity ? Infinity : maxStackLayers,
      originX, originY, originZ,
    );
    best.positions = positions;
  }

  return {
    product,
    count: best.count,
    orientation: best.orientation,
    nX: best.nX,
    nY: best.nY,
    nZ: best.nZ,
    volumeUsed: best.count * (product.length * product.width * product.height),
    packedBoxes: best.positions,
  };
}

function packSingleProductOnPallet(
  pallet: PalletConfig,
  product: Product,
  containerHeight: number,
): { count: number; orientation: Orientation; nFloorL: number; nFloorW: number; nLayers: number } {
  const orientations = getOrientationsForProduct(product);
  const maxStackLayers = product.stackable === false || product.fragile === true ? 1 : Infinity;

  const maxStackH = Math.min(
    pallet.maxStackHeight - pallet.deckHeight,
    containerHeight - pallet.deckHeight,
  );

  let best = { count: 0, orientation: [product.length, product.width, product.height] as Orientation, nFloorL: 0, nFloorW: 0, nLayers: 0 };

  for (const [bL, bW, bH] of orientations) {
    const nFloorL = Math.floor(pallet.length / bL);
    const nFloorW = Math.floor(pallet.width / bW);
    const nLayersRaw = Math.floor(maxStackH / bH);
    const nLayers = maxStackLayers === Infinity ? nLayersRaw : Math.min(nLayersRaw, maxStackLayers);
    const quantityLimit = product.quantity && product.quantity > 0 ? product.quantity : Infinity;
    const count = Math.min(nFloorL * nFloorW * nLayers, quantityLimit);

    if (count > best.count) {
      best = { count, orientation: [bL, bW, bH], nFloorL, nFloorW, nLayers };
    }
  }

  return best;
}

function bestPalletOrientation(
  container: ContainerType,
  pallet: PalletConfig,
  floorClearance: number,
): { palletsAlongL: number; palletsAlongW: number; palletL: number; palletW: number } {
  const effectiveH = container.innerHeight - floorClearance;

  const o1 = {
    palletL: pallet.length,
    palletW: pallet.width,
    palletsAlongL: Math.floor(container.innerLength / pallet.length),
    palletsAlongW: Math.floor(container.innerWidth / pallet.width),
  };
  const o2 = {
    palletL: pallet.width,
    palletW: pallet.length,
    palletsAlongL: Math.floor(container.innerLength / pallet.width),
    palletsAlongW: Math.floor(container.innerWidth / pallet.length),
  };

  if (effectiveH < pallet.deckHeight) return o1;

  const count1 = o1.palletsAlongL * o1.palletsAlongW;
  const count2 = o2.palletsAlongL * o2.palletsAlongW;
  return count2 > count1 ? o2 : o1;
}

export function getReeferClearances(container: ContainerType): { floor: number; top: number; evaporatorDepth: number } {
  return {
    floor: container.reeferFloorCm ?? 0,
    top: container.reeferTopCm ?? 0,
    evaporatorDepth: container.reeferEvaporatorDepthCm ?? 0,
  };
}

function buildPalletResult(
  container: ContainerType,
  products: Product[],
  pallet: PalletConfig,
  floorClear: number,
): PackingResult {
  const containerVolumeCm3 = container.innerLength * container.innerWidth * container.innerHeight;
  const effectiveContainerH = container.innerHeight - floorClear;

  const palletOrientation = bestPalletOrientation(container, pallet, floorClear);
  const { palletsAlongL, palletsAlongW, palletL, palletW } = palletOrientation;
  const totalPallets = palletsAlongL * palletsAlongW;

  const sortedProducts = [...products].sort((a, b) => (b.priority ?? 5) - (a.priority ?? 5));

  const productResults: ProductResult[] = [];
  const allPackedBoxes: PackedBox[] = [];
  const packedPallets: PackedPallet[] = [];

  let visualBudget = MAX_VISUAL_BOXES;

  if (totalPallets === 0 || effectiveContainerH < pallet.deckHeight) {
    return {
      container, productResults: [], packedBoxes: [], packedPallets: [],
      totalCount: 0, volumeUtilization: 0, weightUtilization: 0,
      totalGrossWeight: 0, totalNetWeight: 0, containerVolumeCm3, loadingMode: 'pallet',
    };
  }

  for (let pi = 0; pi < palletsAlongL; pi++) {
    for (let pj = 0; pj < palletsAlongW; pj++) {
      const px = pi * palletL;
      const py = pj * palletW;
      const stackH = Math.min(pallet.maxStackHeight - pallet.deckHeight, effectiveContainerH - pallet.deckHeight);
      packedPallets.push({ x: px, y: py, palletL, palletW, stackH });
    }
  }

  for (let i = 0; i < sortedProducts.length; i++) {
    const p = sortedProducts[i];
    const perPallet = packSingleProductOnPallet(pallet, p, effectiveContainerH);

    const allocatedPallets = Math.round(totalPallets / sortedProducts.length);
    const myPallets = i === sortedProducts.length - 1
      ? totalPallets - allocatedPallets * i
      : allocatedPallets;

    const countForPallets = perPallet.count * myPallets;
    const startIdx = i * allocatedPallets;
    const palletsForProduct = packedPallets.slice(startIdx, startIdx + myPallets);

    productResults.push({
      product: p,
      count: countForPallets,
      orientation: perPallet.orientation,
      nX: perPallet.nFloorL,
      nY: perPallet.nFloorW,
      nZ: perPallet.nLayers,
      volumeUsed: countForPallets * (p.length * p.width * p.height),
      boxesPerPallet: perPallet.count,
      palletCount: myPallets,
    });

    if (perPallet.count > 0 && visualBudget > 0) {
      const [bL, bW, bH] = perPallet.orientation;
      const visualPerPallet = Math.max(1, Math.min(perPallet.count, Math.floor(visualBudget / Math.max(palletsForProduct.length, 1))));

      for (const pal of palletsForProduct) {
        if (visualBudget <= 0) break;
        const baseZ = floorClear + pallet.deckHeight;
        const { positions } = countAndPositions(
          palletL, palletW,
          Math.min(pallet.maxStackHeight - pallet.deckHeight, effectiveContainerH - pallet.deckHeight),
          bL, bW, bH,
          visualPerPallet,
          Infinity,
          pal.x, pal.y, baseZ,
        );
        for (const box of positions) {
          allPackedBoxes.push({ ...box, productId: p.id });
          visualBudget--;
        }
      }
    }
  }

  const totalCount = productResults.reduce((s, r) => s + r.count, 0);
  const totalVolumeUsed = productResults.reduce((s, r) => s + r.volumeUsed, 0);
  const totalGrossWeight = productResults.reduce((s, r) => s + r.count * r.product.grossWeight, 0);
  const totalNetWeight = productResults.reduce((s, r) => s + r.count * r.product.netWeight, 0);
  const { cogX, cogY } = calcCenterOfGravity(allPackedBoxes, products);

  return {
    container, productResults, packedBoxes: allPackedBoxes, packedPallets,
    totalCount,
    volumeUtilization: totalVolumeUsed / containerVolumeCm3,
    weightUtilization: totalGrossWeight / container.maxPayload,
    totalGrossWeight, totalNetWeight, containerVolumeCm3, loadingMode: 'pallet',
    centerOfGravityX: cogX,
    centerOfGravityY: cogY,
  };
}

function permutations<T>(arr: T[]): T[][] {
  if (arr.length <= 1) return [arr];
  const result: T[][] = [];
  for (let i = 0; i < arr.length; i++) {
    const rest = [...arr.slice(0, i), ...arr.slice(i + 1)];
    for (const perm of permutations(rest)) {
      result.push([arr[i], ...perm]);
    }
  }
  return result;
}

interface ZoneBoundary {
  originX: number;
  allocatedLength: number;
  usedHeight: number;  // nZ * bH — actual height occupied by boxes
  product: Product;
}

interface MultiProductZoneResult {
  totalCount: number;
  productResults: ProductResult[];
  packedBoxes: PackedBox[];
  zoneBoundaries?: ZoneBoundary[];
  endOriginX?: number;
}

// After primary zone packing, fill height-above residuals and any end-of-zone gaps
// with products that still have remaining quantity.
function secondPassFill(
  zoneBoundaries: ZoneBoundary[],
  containerWidth: number,
  evaHeight: number,
  floorOriginZ: number,
  allProducts: Product[],
  productResults: ProductResult[],
  payloadRemaining: number,
  visualBudget: number,
): { extraBoxes: PackedBox[]; updatedResults: ProductResult[] } {
  // Build remaining quantity map from quantity - already packed count
  const remainingQty = new Map<string, number>();
  const remainingWeight = { value: payloadRemaining };

  for (const pr of productResults) {
    const totalQty = pr.product.quantity && pr.product.quantity > 0 ? pr.product.quantity : 0;
    remainingQty.set(pr.product.id, Math.max(0, totalQty - pr.count));
  }
  // Add any products not in productResults
  for (const p of allProducts) {
    if (!remainingQty.has(p.id)) {
      remainingQty.set(p.id, p.quantity && p.quantity > 0 ? p.quantity : 0);
    }
  }

  const extraBoxes: PackedBox[] = [];
  const extraCounts = new Map<string, number>();

  for (const zone of zoneBoundaries) {
    if (visualBudget <= 0) break;
    const heightAbove = evaHeight - zone.usedHeight;
    if (heightAbove < 1) continue;

    // Try each product in the height-above space (skip zone's own product to avoid layering issues)
    for (const p of allProducts) {
      if (visualBudget <= 0) break;
      if (p.id === zone.product.id) continue; // own product already handled in main zone
      const rem = remainingQty.get(p.id) ?? 0;
      if (rem <= 0) continue;

      const orientations = getOrientationsForProduct(p);
      const maxStack = p.stackable === false || p.fragile === true ? 1 : Infinity;
      const weightLimit = p.grossWeight > 0 ? Math.floor(remainingWeight.value / p.grossWeight) : Infinity;
      const effectiveLimit = Math.min(rem, weightLimit);
      if (effectiveLimit <= 0) continue;

      const result = packBlock(
        zone.allocatedLength, containerWidth, heightAbove,
        orientations, maxStack, effectiveLimit,
        visualBudget > 0,
        zone.originX, 0, floorOriginZ + zone.usedHeight,
        visualBudget,
      );

      if (result.count > 0) {
        const placed = Math.min(result.count, effectiveLimit);
        remainingQty.set(p.id, rem - placed);
        remainingWeight.value -= placed * p.grossWeight;
        extraCounts.set(p.id, (extraCounts.get(p.id) ?? 0) + placed);

        for (let i = 0; i < Math.min(placed, result.positions.length) && visualBudget > 0; i++) {
          extraBoxes.push({ ...result.positions[i], productId: p.id });
          visualBudget--;
        }
      }
    }
  }

  // Update product results with additional counts
  const updatedResults = productResults.map(pr => {
    const extra = extraCounts.get(pr.product.id) ?? 0;
    if (extra === 0) return pr;
    return {
      ...pr,
      count: pr.count + extra,
      volumeUsed: (pr.count + extra) * (pr.product.length * pr.product.width * pr.product.height),
    };
  });

  // Add results for products that weren't in the primary pack but got placed in second pass
  for (const [pid, extra] of extraCounts.entries()) {
    if (extra === 0) continue;
    if (updatedResults.some(r => r.product.id === pid)) continue;
    const p = allProducts.find(ap => ap.id === pid);
    if (!p) continue;
    const orientations = getOrientationsForProduct(p);
    updatedResults.push({
      product: p,
      count: extra,
      orientation: orientations[0],
      nX: 0, nY: 0, nZ: 0,
      volumeUsed: extra * (p.length * p.width * p.height),
    });
  }

  return { extraBoxes, updatedResults };
}

function packMultiProductZones(
  sortedProducts: Product[],
  containerLength: number,
  containerWidth: number,
  evaHeight: number,
  floorOriginZ: number,
  evaporatorDepth: number,
  payloadLimit: number,
  visualBudgetTotal: number,
  generatePositions = true,
): MultiProductZoneResult {
  let remainingLength = containerLength;
  let currentOriginX = evaporatorDepth;
  let visualBudget = visualBudgetTotal;
  let remainingPayload = payloadLimit;

  const productResults: ProductResult[] = [];
  const allPackedBoxes: PackedBox[] = [];
  const zoneBoundaries: ZoneBoundary[] = [];
  let totalCount = 0;

  for (let i = 0; i < sortedProducts.length; i++) {
    const p = sortedProducts[i];
    const isLast = i === sortedProducts.length - 1;

    const orientations = getOrientationsForProduct(p);
    const maxStackLayers = p.stackable === false || p.fragile === true ? 1 : Infinity;

    let bestDensity = 0;
    for (const [bL, bW, bH] of orientations) {
      const nY = Math.floor(containerWidth / bW);
      const nZRaw = Math.floor(evaHeight / bH);
      const nZ = maxStackLayers === Infinity ? nZRaw : Math.min(nZRaw, maxStackLayers);
      const boxVolume = p.length * p.width * p.height;
      const density = nY * nZ * boxVolume / bL;
      if (density > bestDensity) bestDensity = density;
    }

    let allocatedLength: number;
    if (isLast) {
      allocatedLength = remainingLength;
    } else {
      const remaining = sortedProducts.slice(i);
      let totalDensity = 0;
      for (const rp of remaining) {
        const rpOrientations = getOrientationsForProduct(rp);
        const rpMaxStack = rp.stackable === false || rp.fragile === true ? 1 : Infinity;
        let rpBestDensity = 0;
        for (const [bL, bW, bH] of rpOrientations) {
          const nY = Math.floor(containerWidth / bW);
          const nZRaw = Math.floor(evaHeight / bH);
          const nZ = rpMaxStack === Infinity ? nZRaw : Math.min(nZRaw, rpMaxStack);
          const density = nY * nZ * (rp.length * rp.width * rp.height) / bL;
          if (density > rpBestDensity) rpBestDensity = density;
        }
        totalDensity += rpBestDensity;
      }

      const proportion = totalDensity > 0 ? bestDensity / totalDensity : 1 / remaining.length;
      const rawLength = Math.round(remainingLength * proportion);

      let snapLength = rawLength;
      let bestSnapCount = 0;
      for (const [bL] of orientations) {
        const rows = Math.max(1, Math.round(rawLength / bL));
        const snapped = rows * bL;
        const nY = Math.floor(containerWidth / (orientations.find(o => o[0] === bL)?.[1] ?? bL));
        const nZ = Math.floor(evaHeight / (orientations.find(o => o[0] === bL)?.[2] ?? bL));
        const cnt = rows * nY * nZ;
        if (cnt > bestSnapCount && snapped <= remainingLength - (sortedProducts.length - i - 1)) {
          bestSnapCount = cnt;
          snapLength = snapped;
        }
      }

      allocatedLength = Math.max(1, Math.min(snapLength, remainingLength - (sortedProducts.length - i - 1)));
    }

    const quantityLimit = p.quantity && p.quantity > 0 ? p.quantity : Infinity;
    const weightLimit = p.grossWeight > 0 ? Math.floor(remainingPayload / p.grossWeight) : Infinity;
    const effectiveLimit = Math.min(quantityLimit, weightLimit);

    const zoneResult = packBlockWithResidual(
      allocatedLength,
      containerWidth,
      evaHeight,
      orientations,
      maxStackLayers,
      effectiveLimit,
      generatePositions,
      currentOriginX,
      0,
      floorOriginZ,
      Math.floor(visualBudget / Math.max(1, sortedProducts.length - i)),
    );

    const [bL, bW, bH] = zoneResult.mainOrientation;
    const rowsUsed = Math.floor(allocatedLength / bL);
    const actualUsedHeight = Math.floor(evaHeight / bH) * bH;

    // Track zone boundaries for second pass
    zoneBoundaries.push({
      originX: currentOriginX,
      allocatedLength,
      usedHeight: Math.min(actualUsedHeight, evaHeight),
      product: p,
    });

    productResults.push({
      product: p,
      count: zoneResult.count,
      orientation: zoneResult.mainOrientation,
      nX: rowsUsed,
      nY: Math.floor(containerWidth / bW),
      nZ: Math.floor(evaHeight / bH),
      volumeUsed: zoneResult.count * (p.length * p.width * p.height),
    });

    const useVisual = generatePositions ? Math.min(zoneResult.positions.length, visualBudget) : 0;
    for (let j = 0; j < useVisual; j++) {
      allPackedBoxes.push({ ...zoneResult.positions[j], productId: p.id });
    }
    visualBudget -= useVisual;
    totalCount += zoneResult.count;

    remainingPayload -= zoneResult.count * p.grossWeight;
    currentOriginX += allocatedLength;
    remainingLength -= allocatedLength;

    if (remainingLength <= 0 || remainingPayload <= 0) break;
  }

  return { totalCount, productResults, packedBoxes: allPackedBoxes, zoneBoundaries, endOriginX: currentOriginX };
}

function packMultiProductWidthZones(
  sortedProducts: Product[],
  containerLength: number,
  containerWidth: number,
  evaHeight: number,
  floorOriginZ: number,
  evaporatorDepth: number,
  payloadLimit: number,
  visualBudgetTotal: number,
  generatePositions = true,
): MultiProductZoneResult {
  let remainingWidth = containerWidth;
  let currentOriginY = 0;
  let visualBudget = visualBudgetTotal;
  let remainingPayload = payloadLimit;

  const productResults: ProductResult[] = [];
  const allPackedBoxes: PackedBox[] = [];
  let totalCount = 0;

  for (let i = 0; i < sortedProducts.length; i++) {
    const p = sortedProducts[i];
    const isLast = i === sortedProducts.length - 1;

    const orientations = getOrientationsForProduct(p);
    const maxStackLayers = p.stackable === false || p.fragile === true ? 1 : Infinity;

    let bestDensity = 0;
    for (const [bL, bW, bH] of orientations) {
      const nX = Math.floor(containerLength / bL);
      const nZRaw = Math.floor(evaHeight / bH);
      const nZ = maxStackLayers === Infinity ? nZRaw : Math.min(nZRaw, maxStackLayers);
      const density = nX * nZ * (p.length * p.width * p.height) / bW;
      if (density > bestDensity) bestDensity = density;
    }

    let allocatedWidth: number;
    if (isLast) {
      allocatedWidth = remainingWidth;
    } else {
      const remaining = sortedProducts.slice(i);
      let totalDensity = 0;
      for (const rp of remaining) {
        const rpOrientations = getOrientationsForProduct(rp);
        const rpMaxStack = rp.stackable === false || rp.fragile === true ? 1 : Infinity;
        let rpBestDensity = 0;
        for (const [bL, bW, bH] of rpOrientations) {
          const nX = Math.floor(containerLength / bL);
          const nZRaw = Math.floor(evaHeight / bH);
          const nZ = rpMaxStack === Infinity ? nZRaw : Math.min(nZRaw, rpMaxStack);
          const density = nX * nZ * (rp.length * rp.width * rp.height) / bW;
          if (density > rpBestDensity) rpBestDensity = density;
        }
        totalDensity += rpBestDensity;
      }

      const proportion = totalDensity > 0 ? bestDensity / totalDensity : 1 / remaining.length;
      const rawWidth = Math.round(remainingWidth * proportion);

      let snapWidth = rawWidth;
      let bestSnapCount = 0;
      for (const [, bW] of orientations) {
        const cols = Math.max(1, Math.round(rawWidth / bW));
        const snapped = cols * bW;
        if (snapped > remainingWidth - (sortedProducts.length - i - 1)) continue;
        const nX = Math.floor(containerLength / (orientations.find(o => o[1] === bW)?.[0] ?? bW));
        const nZ = Math.floor(evaHeight / (orientations.find(o => o[1] === bW)?.[2] ?? bW));
        const cnt = nX * cols * nZ;
        if (cnt > bestSnapCount) {
          bestSnapCount = cnt;
          snapWidth = snapped;
        }
      }

      allocatedWidth = Math.max(1, Math.min(snapWidth, remainingWidth - (sortedProducts.length - i - 1)));
    }

    const quantityLimit = p.quantity && p.quantity > 0 ? p.quantity : Infinity;
    const weightLimit = p.grossWeight > 0 ? Math.floor(remainingPayload / p.grossWeight) : Infinity;
    const effectiveLimit = Math.min(quantityLimit, weightLimit);

    const zoneResult = packBlockWithResidual(
      containerLength,
      allocatedWidth,
      evaHeight,
      orientations,
      maxStackLayers,
      effectiveLimit,
      generatePositions,
      evaporatorDepth,
      currentOriginY,
      floorOriginZ,
      Math.floor(visualBudget / Math.max(1, sortedProducts.length - i)),
    );

    const [bL, bW, bH] = zoneResult.mainOrientation;

    productResults.push({
      product: p,
      count: zoneResult.count,
      orientation: zoneResult.mainOrientation,
      nX: Math.floor(containerLength / bL),
      nY: Math.floor(allocatedWidth / bW),
      nZ: Math.floor(evaHeight / bH),
      volumeUsed: zoneResult.count * (p.length * p.width * p.height),
    });

    const useVisual = generatePositions ? Math.min(zoneResult.positions.length, visualBudget) : 0;
    for (let j = 0; j < useVisual; j++) {
      allPackedBoxes.push({ ...zoneResult.positions[j], productId: p.id });
    }
    visualBudget -= useVisual;
    totalCount += zoneResult.count;

    remainingPayload -= zoneResult.count * p.grossWeight;
    currentOriginY += allocatedWidth;
    remainingWidth -= allocatedWidth;

    if (remainingWidth <= 0 || remainingPayload <= 0) break;
  }

  return { totalCount, productResults, packedBoxes: allPackedBoxes };
}

// Exhaustive split search for exactly 2 products — tries every valid box-boundary split
// in both the length and width directions and picks the combination with the highest total count.
function exhaustiveTwoProductPack(
  p1: Product,
  p2: Product,
  bodyLength: number,
  containerWidth: number,
  evaHeight: number,
  floorOriginZ: number,
  evaporatorDepth: number,
  payloadLimit: number,
  visualBudget: number,
  generatePositions: boolean,
): MultiProductZoneResult {
  const o1 = getOrientationsForProduct(p1);
  const o2 = getOrientationsForProduct(p2);
  const ms1 = p1.stackable === false || p1.fragile === true ? 1 : Infinity;
  const ms2 = p2.stackable === false || p2.fragile === true ? 1 : Infinity;
  const qty1 = p1.quantity && p1.quantity > 0 ? p1.quantity : Infinity;
  const qty2 = p2.quantity && p2.quantity > 0 ? p2.quantity : Infinity;
  const eff1 = Math.min(qty1, p1.grossWeight > 0 ? Math.floor(payloadLimit / p1.grossWeight) : Infinity);
  const eff2 = Math.min(qty2, p2.grossWeight > 0 ? Math.floor(payloadLimit / p2.grossWeight) : Infinity);

  // Collect candidate split points (multiples of each orientation's primary dimension)
  const lenSplits = new Set<number>();
  for (const [bL] of o1) for (let r = 1; r * bL < bodyLength; r++) lenSplits.add(r * bL);
  for (const [bL] of o2) for (let r = 1; r * bL < bodyLength; r++) lenSplits.add(bodyLength - r * bL);

  const wSplits = new Set<number>();
  for (const [, bW] of o1) for (let c = 1; c * bW < containerWidth; c++) wSplits.add(c * bW);
  for (const [, bW] of o2) for (let c = 1; c * bW < containerWidth; c++) wSplits.add(containerWidth - c * bW);

  let bestTotal = 0;
  let bestC1 = 0;
  let bestC2 = 0;
  let bestSplit = Math.floor(bodyLength / 2);
  let bestIsLength = true;
  let bestReversed = false;

  function tryLenSplit(split: number, reversed: boolean) {
    if (split <= 0 || split >= bodyLength) return;
    const rem = bodyLength - split;
    const [pa, pb, oa, ob, ma, mb, ea, eb] = reversed
      ? [p2, p1, o2, o1, ms2, ms1, eff2, eff1]
      : [p1, p2, o1, o2, ms1, ms2, eff1, eff2];
    const ra = packBlock(split, containerWidth, evaHeight, oa, ma, ea, false, 0, 0, 0, 0);
    const adjEB = Math.min(eb, pb.grossWeight > 0 ? Math.floor(Math.max(0, payloadLimit - ra.count * pa.grossWeight) / pb.grossWeight) : Infinity);
    const rb = packBlock(rem, containerWidth, evaHeight, ob, mb, adjEB, false, 0, 0, 0, 0);
    const total = ra.count + rb.count;
    if (total > bestTotal) {
      bestTotal = total;
      bestC1 = reversed ? rb.count : ra.count;
      bestC2 = reversed ? ra.count : rb.count;
      bestSplit = split;
      bestIsLength = true;
      bestReversed = reversed;
    }
  }

  function tryWidSplit(split: number, reversed: boolean) {
    if (split <= 0 || split >= containerWidth) return;
    const rem = containerWidth - split;
    const [pa, pb, oa, ob, ma, mb, ea, eb] = reversed
      ? [p2, p1, o2, o1, ms2, ms1, eff2, eff1]
      : [p1, p2, o1, o2, ms1, ms2, eff1, eff2];
    const ra = packBlock(bodyLength, split, evaHeight, oa, ma, ea, false, 0, 0, 0, 0);
    const adjEB = Math.min(eb, pb.grossWeight > 0 ? Math.floor(Math.max(0, payloadLimit - ra.count * pa.grossWeight) / pb.grossWeight) : Infinity);
    const rb = packBlock(bodyLength, rem, evaHeight, ob, mb, adjEB, false, 0, 0, 0, 0);
    const total = ra.count + rb.count;
    if (total > bestTotal) {
      bestTotal = total;
      bestC1 = reversed ? rb.count : ra.count;
      bestC2 = reversed ? ra.count : rb.count;
      bestSplit = split;
      bestIsLength = false;
      bestReversed = reversed;
    }
  }

  for (const s of lenSplits) { tryLenSplit(s, false); tryLenSplit(s, true); }
  for (const s of wSplits) { tryWidSplit(s, false); tryWidSplit(s, true); }

  // Generate positions for winning configuration
  const [front, back] = bestReversed ? [p2, p1] : [p1, p2];
  const [of1, of2] = bestReversed ? [o2, o1] : [o1, o2];
  const [mf1, mf2] = bestReversed ? [ms2, ms1] : [ms1, ms2];
  const [ef1, ef2] = bestReversed ? [eff2, eff1] : [eff1, eff2];
  const vb1 = bestTotal > 0 ? Math.min(visualBudget, Math.round(visualBudget * (bestReversed ? bestC2 : bestC1) / bestTotal)) : Math.floor(visualBudget / 2);
  const vb2 = visualBudget - vb1;

  const productResults: ProductResult[] = [];
  const allPackedBoxes: PackedBox[] = [];

  if (bestIsLength) {
    const rem = bodyLength - bestSplit;
    const r1 = packBlock(bestSplit, containerWidth, evaHeight, of1, mf1, ef1, generatePositions, evaporatorDepth, 0, floorOriginZ, vb1);
    const r2 = packBlock(rem, containerWidth, evaHeight, of2, mf2, ef2, generatePositions, evaporatorDepth + bestSplit, 0, floorOriginZ, vb2);
    for (const box of r1.positions) allPackedBoxes.push({ ...box, productId: front.id });
    for (const box of r2.positions) allPackedBoxes.push({ ...box, productId: back.id });
    productResults.push({ product: front, count: r1.count, orientation: r1.orientation, nX: r1.nX, nY: r1.nY, nZ: r1.nZ, volumeUsed: r1.count * (front.length * front.width * front.height) });
    productResults.push({ product: back, count: r2.count, orientation: r2.orientation, nX: r2.nX, nY: r2.nY, nZ: r2.nZ, volumeUsed: r2.count * (back.length * back.width * back.height) });
  } else {
    const rem = containerWidth - bestSplit;
    const r1 = packBlock(bodyLength, bestSplit, evaHeight, of1, mf1, ef1, generatePositions, evaporatorDepth, 0, floorOriginZ, vb1);
    const r2 = packBlock(bodyLength, rem, evaHeight, of2, mf2, ef2, generatePositions, evaporatorDepth, bestSplit, floorOriginZ, vb2);
    for (const box of r1.positions) allPackedBoxes.push({ ...box, productId: front.id });
    for (const box of r2.positions) allPackedBoxes.push({ ...box, productId: back.id });
    productResults.push({ product: front, count: r1.count, orientation: r1.orientation, nX: r1.nX, nY: r1.nY, nZ: r1.nZ, volumeUsed: r1.count * (front.length * front.width * front.height) });
    productResults.push({ product: back, count: r2.count, orientation: r2.orientation, nX: r2.nX, nY: r2.nY, nZ: r2.nZ, volumeUsed: r2.count * (back.length * back.width * back.height) });
  }

  // Restore original product order
  const originalOrder = [p1, p2];
  productResults.sort((a, b) => originalOrder.findIndex(p => p.id === a.product.id) - originalOrder.findIndex(p => p.id === b.product.id));

  return { totalCount: bestTotal, productResults, packedBoxes: allPackedBoxes };
}

export function calculatePacking(
  container: ContainerType,
  products: Product[],
  mode: LoadingMode = 'handload',
  palletConfig?: PalletConfig,
): PackingResult {
  const activeProducts = products.filter(p => p.length > 0 && p.width > 0 && p.height > 0);

  const { floor: floorClear, top: topClear, evaporatorDepth } = getReeferClearances(container);
  const floorOriginZ = floorClear;

  const bodyLength = container.innerLength - evaporatorDepth;
  const evaHeight = container.innerHeight - floorClear - topClear;
  const containerVolumeCm3 = bodyLength * container.innerWidth * evaHeight;

  if (activeProducts.length === 0) {
    return {
      container, productResults: [], packedBoxes: [],
      totalCount: 0, volumeUtilization: 0, weightUtilization: 0,
      totalGrossWeight: 0, totalNetWeight: 0, containerVolumeCm3, loadingMode: mode,
    };
  }

  if (mode === 'pallet' && palletConfig) {
    return buildPalletResult(container, activeProducts, palletConfig, floorClear);
  }

  const sortedProducts = [...activeProducts].sort((a, b) => {
    const weightDiff = (a.grossWeight ?? 0) - (b.grossWeight ?? 0);
    if (weightDiff !== 0) return weightDiff;
    return (a.priority ?? 5) - (b.priority ?? 5);
  });

  const allPackedBoxes: PackedBox[] = [];
  const productResults: ProductResult[] = [];

  if (sortedProducts.length === 1) {
    const p = sortedProducts[0];
    const orientations = getOrientationsForProduct(p);
    const maxStackLayers = p.stackable === false || p.fragile === true ? 1 : Infinity;
    const quantityLimit = p.quantity && p.quantity > 0 ? p.quantity : Infinity;
    const weightLimit = p.grossWeight > 0 ? Math.floor(container.maxPayload / p.grossWeight) : Infinity;
    const effectiveLimit = Math.min(quantityLimit, weightLimit);

    let visualBudget = MAX_VISUAL_BOXES;

    const bodyResult = packBlockWithResidual(
      bodyLength, container.innerWidth, evaHeight,
      orientations, maxStackLayers, effectiveLimit,
      true, evaporatorDepth, 0, floorOriginZ,
      visualBudget,
    );

    visualBudget -= bodyResult.positions.length;

    const evaResult = packBlockWithResidual(
      evaporatorDepth, container.innerWidth, evaHeight,
      orientations, maxStackLayers, Math.max(0, effectiveLimit - bodyResult.count),
      visualBudget > 0, 0, 0, floorOriginZ,
      Math.max(0, visualBudget),
    );

    const totalCount = bodyResult.count + evaResult.count;
    const allPositions = [...bodyResult.positions, ...evaResult.positions];

    productResults.push({
      product: p,
      count: totalCount,
      orientation: bodyResult.mainOrientation,
      nX: Math.floor(bodyLength / bodyResult.mainOrientation[0]),
      nY: Math.floor(container.innerWidth / bodyResult.mainOrientation[1]),
      nZ: Math.floor(evaHeight / bodyResult.mainOrientation[2]),
      volumeUsed: totalCount * (p.length * p.width * p.height),
      zones: bodyResult.zones,
      zoneSplitAxis: bodyResult.zoneSplitAxis,
    });

    for (const box of allPositions) {
      allPackedBoxes.push({ ...box, productId: p.id });
    }

  } else if (sortedProducts.length === 2) {
    // 2-product: exhaustive split search guarantees optimal zone boundary
    const twoResult = exhaustiveTwoProductPack(
      sortedProducts[0], sortedProducts[1],
      bodyLength, container.innerWidth, evaHeight,
      floorOriginZ, evaporatorDepth, container.maxPayload,
      MAX_VISUAL_BOXES, true,
    );
    productResults.push(...twoResult.productResults);
    allPackedBoxes.push(...twoResult.packedBoxes);

  } else {
    // Multi-product (3+): count-only first pass across all permutations, then generate positions for winner
    const perms = sortedProducts.length <= 5
      ? permutations(sortedProducts)
      : [sortedProducts];

    let bestTotal = -1;
    let bestPerm: Product[] = sortedProducts;
    let bestIsLength = true;

    // Count-only pass — fast, no box positions generated
    for (const perm of perms) {
      const lengthResult = packMultiProductZones(
        perm, bodyLength, container.innerWidth, evaHeight,
        floorOriginZ, evaporatorDepth, container.maxPayload,
        MAX_VISUAL_BOXES, false,
      );
      if (lengthResult.totalCount > bestTotal) {
        bestTotal = lengthResult.totalCount;
        bestPerm = perm;
        bestIsLength = true;
      }

      const widthResult = packMultiProductWidthZones(
        perm, bodyLength, container.innerWidth, evaHeight,
        floorOriginZ, evaporatorDepth, container.maxPayload,
        MAX_VISUAL_BOXES, false,
      );
      if (widthResult.totalCount > bestTotal) {
        bestTotal = widthResult.totalCount;
        bestPerm = perm;
        bestIsLength = false;
      }
    }

    // Generate positions only for the winning permutation
    let bestZoneResult: MultiProductZoneResult;
    if (bestIsLength) {
      bestZoneResult = packMultiProductZones(
        bestPerm, bodyLength, container.innerWidth, evaHeight,
        floorOriginZ, evaporatorDepth, container.maxPayload,
        MAX_VISUAL_BOXES, true,
      );
    } else {
      bestZoneResult = packMultiProductWidthZones(
        bestPerm, bodyLength, container.innerWidth, evaHeight,
        floorOriginZ, evaporatorDepth, container.maxPayload,
        MAX_VISUAL_BOXES, true,
      );
    }

    productResults.push(...bestZoneResult.productResults);
    allPackedBoxes.push(...bestZoneResult.packedBoxes);

    // Second pass: fill height-above residuals (e.g. above non-stackable or short products)
    if (bestZoneResult.zoneBoundaries && bestZoneResult.zoneBoundaries.length > 0) {
      const totalPackedWeight = productResults.reduce((s, r) => s + r.count * r.product.grossWeight, 0);
      const payloadRemaining = container.maxPayload - totalPackedWeight;
      const visualRemaining = MAX_VISUAL_BOXES - allPackedBoxes.length;

      if (payloadRemaining > 0 && visualRemaining > 0) {
        const { extraBoxes, updatedResults } = secondPassFill(
          bestZoneResult.zoneBoundaries,
          container.innerWidth,
          evaHeight,
          floorOriginZ,
          activeProducts,
          productResults,
          payloadRemaining,
          visualRemaining,
        );

        if (extraBoxes.length > 0) {
          productResults.splice(0, productResults.length, ...updatedResults);
          allPackedBoxes.push(...extraBoxes);
        }
      }
    }
  }

  // ── Visual: centre the packed load along the length & width axes ───────────
  // The algorithm anchors every block at (originX, originY). When a residual is
  // unfillable, that leaves the cases flush against the back-left wall with all
  // the gap on the front-right. Centring distributes the gap so the diagram
  // reads as a balanced load. Z (height) is NOT shifted — cases stay flush to
  // the floor (reefer floor clearance is already baked into floorOriginZ).
  if (allPackedBoxes.length > 0) {
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    for (const b of allPackedBoxes) {
      if (b.x < minX) minX = b.x;
      if (b.x + b.l > maxX) maxX = b.x + b.l;
      if (b.y < minY) minY = b.y;
      if (b.y + b.w > maxY) maxY = b.y + b.w;
    }
    const usedX = maxX - minX;
    const usedY = maxY - minY;
    // Shift such that the loaded block is centred inside the container's footprint.
    const shiftX = (container.innerLength - usedX) / 2 - minX;
    const shiftY = (container.innerWidth  - usedY) / 2 - minY;
    if (Math.abs(shiftX) > 0.5 || Math.abs(shiftY) > 0.5) {
      for (const b of allPackedBoxes) {
        b.x += shiftX;
        b.y += shiftY;
      }
    }
  }

  const totalCount = productResults.reduce((s, r) => s + r.count, 0);
  const totalVolumeUsed = productResults.reduce((s, r) => s + r.volumeUsed, 0);
  const totalGrossWeight = productResults.reduce((s, r) => s + r.count * r.product.grossWeight, 0);
  const totalNetWeight = productResults.reduce((s, r) => s + r.count * r.product.netWeight, 0);
  const { cogX, cogY } = calcCenterOfGravity(allPackedBoxes, activeProducts);

  return {
    container, productResults, packedBoxes: allPackedBoxes,
    totalCount,
    volumeUtilization: totalVolumeUsed / containerVolumeCm3,
    weightUtilization: totalGrossWeight / container.maxPayload,
    totalGrossWeight, totalNetWeight, containerVolumeCm3, loadingMode: mode,
    centerOfGravityX: cogX,
    centerOfGravityY: cogY,
  };
}

export function calculateMultiContainer(
  container: ContainerType,
  products: Product[],
  mode: LoadingMode = 'handload',
  palletConfig?: PalletConfig,
): MultiContainerResult {
  const activeProducts = products.filter(p => p.length > 0 && p.width > 0 && p.height > 0);

  const remainingQty = new Map(
    activeProducts.map(p => [p.id, p.quantity && p.quantity > 0 ? p.quantity : 0]),
  );

  const results: PackingResult[] = [];
  let totalUnits = 0;
  let totalGrossWeight = 0;

  for (let iter = 0; iter < MAX_CONTAINERS; iter++) {
    const remaining = activeProducts.filter(p => (remainingQty.get(p.id) ?? 0) > 0);
    if (remaining.length === 0) break;

    const iteration = remaining.map(p => ({
      ...p,
      quantity: remainingQty.get(p.id) ?? 0,
    }));

    const result = calculatePacking(container, iteration, mode, palletConfig);
    if (result.totalCount === 0) break;

    results.push(result);
    totalUnits += result.totalCount;
    totalGrossWeight += result.totalGrossWeight;

    for (const pr of result.productResults) {
      const prev = remainingQty.get(pr.product.id) ?? 0;
      remainingQty.set(pr.product.id, Math.max(0, prev - pr.count));
    }
  }

  if (results.length === 0) {
    results.push(calculatePacking(container, activeProducts, mode, palletConfig));
  }

  return {
    containersNeeded: results.length,
    results,
    totalUnits,
    totalGrossWeight,
  };
}

export function formatDimensions(l: number, w: number, h: number, unit: string): string {
  return `${l} × ${w} × ${h} ${unit}`;
}
