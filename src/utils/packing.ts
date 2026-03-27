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

  // Strategy 1: simple block + length residual
  const main = packBlock(
    availableLength, availableWidth, availableHeight,
    orientations, maxStackLayers, effectiveMax,
    generatePositions, originX, originY, originZ,
    visualBudget,
  );

  const [bL] = main.orientation;
  const mainUsedLength = main.nX * bL;
  const residualLength = availableLength - mainUsedLength;
  const remainingMax = effectiveMax - main.count;
  const remainingVisual = visualBudget - main.positions.length;

  const residual = packBlock(
    residualLength, availableWidth, availableHeight,
    orientations, maxStackLayers, remainingMax,
    generatePositions, originX + mainUsedLength, originY, originZ,
    remainingVisual,
  );

  const strategy1Count = main.count + residual.count;
  const strategy1Positions = [...main.positions, ...residual.positions];

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

        const totalMixed = countLow + countHigh;

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

interface MultiProductZoneResult {
  totalCount: number;
  productResults: ProductResult[];
  packedBoxes: PackedBox[];
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
): MultiProductZoneResult {
  let remainingLength = containerLength;
  let currentOriginX = evaporatorDepth;
  let visualBudget = visualBudgetTotal;
  let remainingPayload = payloadLimit;

  const productResults: ProductResult[] = [];
  const allPackedBoxes: PackedBox[] = [];
  let totalCount = 0;

  for (let i = 0; i < sortedProducts.length; i++) {
    const p = sortedProducts[i];
    const isLast = i === sortedProducts.length - 1;

    // Volume-proportional zone allocation:
    // compute the box density (volume per unit container length) for best orientation
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
      // compute proportional share based on density ratio
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

      // Snap to best box length for this product (nearest box-length multiple, min 1 row)
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
      true,
      currentOriginX,
      0,
      floorOriginZ,
      Math.floor(visualBudget / Math.max(1, sortedProducts.length - i)),
    );

    const [bL, bW, bH] = zoneResult.mainOrientation;
    const rowsUsed = Math.floor(allocatedLength / bL);

    productResults.push({
      product: p,
      count: zoneResult.count,
      orientation: zoneResult.mainOrientation,
      nX: rowsUsed,
      nY: Math.floor(containerWidth / bW),
      nZ: Math.floor(evaHeight / bH),
      volumeUsed: zoneResult.count * (p.length * p.width * p.height),
    });

    const useVisual = Math.min(zoneResult.positions.length, visualBudget);
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

  return { totalCount, productResults, packedBoxes: allPackedBoxes };
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
      true,
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

    const useVisual = Math.min(zoneResult.positions.length, visualBudget);
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

  // Sort by gross weight ascending for loading order
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

  } else {
    // Multi-product: try all permutations (capped at 5 products = 120 perms) and pick best
    const perms = sortedProducts.length <= 5
      ? permutations(sortedProducts)
      : [sortedProducts];

    let bestTotal = -1;
    let bestZoneResult: MultiProductZoneResult | null = null;

    for (const perm of perms) {
      const lengthResult = packMultiProductZones(
        perm,
        bodyLength,
        container.innerWidth,
        evaHeight,
        floorOriginZ,
        evaporatorDepth,
        container.maxPayload,
        MAX_VISUAL_BOXES,
      );

      if (lengthResult.totalCount > bestTotal) {
        bestTotal = lengthResult.totalCount;
        bestZoneResult = lengthResult;
      }

      const widthResult = packMultiProductWidthZones(
        perm,
        bodyLength,
        container.innerWidth,
        evaHeight,
        floorOriginZ,
        evaporatorDepth,
        container.maxPayload,
        MAX_VISUAL_BOXES,
      );

      if (widthResult.totalCount > bestTotal) {
        bestTotal = widthResult.totalCount;
        bestZoneResult = widthResult;
      }
    }

    if (bestZoneResult) {
      productResults.push(...bestZoneResult.productResults);
      allPackedBoxes.push(...bestZoneResult.packedBoxes);
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
