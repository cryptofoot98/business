import { ContainerType, LoadingMode, MultiContainerResult, PackedBox, PackedPallet, PackingResult, PalletConfig, Product, ProductResult } from '../types';

type Orientation = [number, number, number];

const MAX_VISUAL_BOXES = 1200;
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
): { count: number; positions: Omit<PackedBox, 'productId'>[]; mainOrientation: Orientation } {
  // Strategy 1: simple block + residual (original)
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

  // Strategy 2: mixed orientation — try splitting height into two zones with different orientations
  // e.g. upright columns + flat columns, or lower layers one orientation, upper layers another
  let bestMixedCount = 0;
  let bestMixedPositions: Omit<PackedBox, 'productId'>[] = [];
  let bestMixedOrientation: Orientation = orientations[0] ?? [1, 1, 1];

  for (const [bL1, bW1, bH1] of orientations) {
    for (const [bL2, bW2, bH2] of orientations) {
      if (bL1 === bL2 && bW1 === bW2 && bH1 === bH2) continue; // same orientation, skip

      // Split height: lower zone uses orientation 1, upper zone uses orientation 2
      const nZLow = Math.floor(availableHeight / bH1);
      if (nZLow === 0) continue;

      for (let lowLayers = 1; lowLayers < nZLow; lowLayers++) {
        const lowHeight = lowLayers * bH1;
        const highHeight = availableHeight - lowHeight;
        if (highHeight < bH2) continue;

        const nXLow = Math.floor(availableLength / bL1);
        const nYLow = Math.floor(availableWidth / bW1);
        const nZLowActual = lowLayers;
        const countLow = Math.min(nXLow * nYLow * nZLowActual, effectiveMax);

        const nXHigh = Math.floor(availableLength / bL2);
        const nYHigh = Math.floor(availableWidth / bW2);
        const nZHigh = Math.floor(highHeight / bH2);
        const countHigh = Math.min(nXHigh * nYHigh * nZHigh, Math.max(0, effectiveMax - countLow));

        const totalMixed = countLow + countHigh;

        if (totalMixed > bestMixedCount) {
          bestMixedCount = totalMixed;
          bestMixedOrientation = countLow >= countHigh ? [bL1, bW1, bH1] : [bL2, bW2, bH2];

          if (generatePositions) {
            const posLow: Omit<PackedBox, 'productId'>[] = [];
            const posHigh: Omit<PackedBox, 'productId'>[] = [];
            const limitLow = Math.min(countLow, Math.floor(visualBudget / 2));
            const limitHigh = Math.min(countHigh, visualBudget - limitLow);

            const { positions: pl } = countAndPositions(
              availableLength, availableWidth, lowHeight,
              bL1, bW1, bH1, limitLow,
              maxStackLayers === Infinity ? Infinity : maxStackLayers,
              originX, originY, originZ,
            );
            posLow.push(...pl);

            const { positions: ph } = countAndPositions(
              availableLength, availableWidth, highHeight,
              bL2, bW2, bH2, limitHigh,
              maxStackLayers === Infinity ? Infinity : maxStackLayers,
              originX, originY, originZ + lowHeight,
            );
            posHigh.push(...ph);

            bestMixedPositions = [...posLow, ...posHigh];
          }
        }
      }
    }
  }

  // Strategy 3: mixed orientation — split along WIDTH into two column groups
  // This handles cases like "2 columns upright + 6 columns flat" as the factory did
  let bestWidthSplitCount = 0;
  let bestWidthSplitPositions: Omit<PackedBox, 'productId'>[] = [];
  let bestWidthSplitOrientation: Orientation = orientations[0] ?? [1, 1, 1];

  for (let oi1 = 0; oi1 < orientations.length; oi1++) {
    const [bL1, bW1, bH1] = orientations[oi1];
    const nX1 = Math.floor(availableLength / bL1);
    const nZ1 = Math.floor(availableHeight / bH1);
    if (nX1 === 0 || nZ1 === 0) continue;

    for (let oi2 = 0; oi2 < orientations.length; oi2++) {
      if (oi1 === oi2) continue;
      const [bL2, bW2, bH2] = orientations[oi2];
      const nX2 = Math.floor(availableLength / bL2);
      const nZ2 = Math.floor(availableHeight / bH2);
      if (nX2 === 0 || nZ2 === 0) continue;

      // Try all possible numbers of columns for orientation 1
      const maxCols1 = Math.floor(availableWidth / bW1);
      for (let cols1 = 1; cols1 <= maxCols1; cols1++) {
        const usedWidth1 = cols1 * bW1;
        const remainWidth = availableWidth - usedWidth1;
        if (remainWidth <= 0) break;

        const cols2 = Math.floor(remainWidth / bW2);
        if (cols2 === 0) continue;

        const count1 = nX1 * cols1 * nZ1;
        const count2 = nX2 * cols2 * nZ2;
        const totalSplit = Math.min(count1 + count2, effectiveMax);

        if (totalSplit > bestWidthSplitCount) {
          bestWidthSplitCount = totalSplit;
          bestWidthSplitOrientation = count1 >= count2 ? [bL1, bW1, bH1] : [bL2, bW2, bH2];

          if (generatePositions) {
            const limit1 = Math.min(count1, Math.floor(visualBudget * 0.5));
            const limit2 = Math.min(count2, visualBudget - limit1);

            const { positions: p1 } = countAndPositions(
              availableLength, usedWidth1, availableHeight,
              bL1, bW1, bH1, limit1,
              maxStackLayers === Infinity ? Infinity : maxStackLayers,
              originX, originY, originZ,
            );

            const { positions: p2 } = countAndPositions(
              availableLength, remainWidth, availableHeight,
              bL2, bW2, bH2, limit2,
              maxStackLayers === Infinity ? Infinity : maxStackLayers,
              originX, originY + usedWidth1, originZ,
            );

            bestWidthSplitPositions = [...p1, ...p2];
          }
        }
      }
    }
  }

  // Pick the best strategy
  const best = Math.max(strategy1Count, bestMixedCount, bestWidthSplitCount);

  if (best === bestWidthSplitCount && bestWidthSplitCount > strategy1Count) {
    return {
      count: bestWidthSplitCount,
      positions: bestWidthSplitPositions,
      mainOrientation: bestWidthSplitOrientation,
    };
  }

  if (best === bestMixedCount && bestMixedCount > strategy1Count) {
    return {
      count: bestMixedCount,
      positions: bestMixedPositions,
      mainOrientation: bestMixedOrientation,
    };
  }

  return {
    count: strategy1Count,
    positions: strategy1Positions,
    mainOrientation: main.orientation,
  };
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

export function calculatePacking(
  container: ContainerType,
  products: Product[],
  mode: LoadingMode = 'handload',
  palletConfig?: PalletConfig,
): PackingResult {
  const activeProducts = products.filter(p => p.length > 0 && p.width > 0 && p.height > 0);
  const containerVolumeCm3 = container.innerLength * container.innerWidth * container.innerHeight;

  const { floor: floorClear, top: topClear, evaporatorDepth } = getReeferClearances(container);
  const floorOriginZ = floorClear;

  const bodyLength = container.innerLength - evaporatorDepth;
  // Top clearance is shown as a visual warning line only — does not reduce stacking height
  // Boxes can physically be stacked up to this line; airflow is maintained by the T-floor channel
  const evaHeight = container.innerHeight - floorClear;

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

  const sortedProducts = [...activeProducts].sort((a, b) => (b.priority ?? 5) - (a.priority ?? 5));
  const allPackedBoxes: PackedBox[] = [];
  const productResults: ProductResult[] = [];

  if (sortedProducts.length === 1) {
    const p = sortedProducts[0];
    const orientations = getOrientationsForProduct(p);
    const maxStackLayers = p.stackable === false || p.fragile === true ? 1 : Infinity;
    const quantityLimit = p.quantity && p.quantity > 0 ? p.quantity : Infinity;

    let visualBudget = MAX_VISUAL_BOXES;

    const bodyResult = packBlockWithResidual(
      bodyLength, container.innerWidth, evaHeight,
      orientations, maxStackLayers, quantityLimit,
      true, evaporatorDepth, 0, floorOriginZ,
      visualBudget,
    );

    visualBudget -= bodyResult.positions.length;

    const evaResult = packBlockWithResidual(
      evaporatorDepth, container.innerWidth, evaHeight,
      orientations, maxStackLayers, Math.max(0, quantityLimit - bodyResult.count),
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
    });

    for (const box of allPositions) {
      allPackedBoxes.push({ ...box, productId: p.id });
    }

  } else {
    let remainingLength = container.innerLength;
    let currentOriginX = 0;
    let visualBudget = MAX_VISUAL_BOXES;

    for (let i = 0; i < sortedProducts.length; i++) {
      const p = sortedProducts[i];
      const isLast = i === sortedProducts.length - 1;
      const allocatedLength = isLast
        ? remainingLength
        : Math.round(remainingLength / (sortedProducts.length - i));

      const zoneStart = currentOriginX;
      const zoneEnd = zoneStart + allocatedLength;
      const evaEnd = evaporatorDepth;

      let productCount = 0;
      const productBoxes: Omit<PackedBox, 'productId'>[] = [];
      let dominantOrientation: Orientation = [p.length, p.width, p.height];
      let dominantNX = 0, dominantNY = 0, dominantNZ = 0;

      const orientations = getOrientationsForProduct(p);
      const maxStackLayers = p.stackable === false || p.fragile === true ? 1 : Infinity;
      const quantityLimit = p.quantity && p.quantity > 0 ? p.quantity : Infinity;

      if (zoneStart >= evaEnd || evaporatorDepth === 0) {
        const result = packSingleProduct(
          container, p,
          currentOriginX, 0, floorOriginZ,
          allocatedLength,
          container.innerWidth,
          evaHeight,
          Infinity,
          true,
        );
        productCount = result.count;
        dominantOrientation = result.orientation;
        dominantNX = result.nX;
        dominantNY = result.nY;
        dominantNZ = result.nZ;
        productBoxes.push(...result.packedBoxes);
      } else if (zoneEnd <= evaEnd) {
        const result = packSingleProduct(
          container, p,
          currentOriginX, 0, floorOriginZ,
          allocatedLength,
          container.innerWidth,
          evaHeight,
          Infinity,
          true,
        );
        productCount = result.count;
        dominantOrientation = result.orientation;
        dominantNX = result.nX;
        dominantNY = result.nY;
        dominantNZ = result.nZ;
        productBoxes.push(...result.packedBoxes);
      } else {
        const evaPortionLength = evaEnd - zoneStart;
        const bodyPortionLength = allocatedLength - evaPortionLength;

        const evaPortionResult = packBlock(
          evaPortionLength, container.innerWidth, evaHeight,
          orientations, maxStackLayers, quantityLimit,
          true, currentOriginX, 0, floorOriginZ, visualBudget,
        );

        const bodyPortionResult = packBlock(
          bodyPortionLength, container.innerWidth, evaHeight,
          orientations, maxStackLayers, Math.max(0, quantityLimit - evaPortionResult.count),
          true, evaEnd, 0, floorOriginZ, Math.max(0, visualBudget - evaPortionResult.positions.length),
        );

        productCount = evaPortionResult.count + bodyPortionResult.count;
        dominantOrientation = bodyPortionResult.orientation;
        dominantNX = bodyPortionResult.nX;
        dominantNY = bodyPortionResult.nY;
        dominantNZ = bodyPortionResult.nZ;
        productBoxes.push(...evaPortionResult.positions, ...bodyPortionResult.positions);
      }

      const [bL] = dominantOrientation;
      const actualLayersUsed = dominantNX * bL;

      productResults.push({
        product: p,
        count: productCount,
        orientation: dominantOrientation,
        nX: dominantNX,
        nY: dominantNY,
        nZ: dominantNZ,
        volumeUsed: productCount * (p.length * p.width * p.height),
      });

      const useVisual = Math.min(productBoxes.length, visualBudget);
      for (let j = 0; j < useVisual; j++) {
        allPackedBoxes.push({ ...productBoxes[j], productId: p.id });
      }
      visualBudget -= useVisual;

      currentOriginX += actualLayersUsed;
      remainingLength -= actualLayersUsed;

      if (remainingLength <= 0) break;
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
