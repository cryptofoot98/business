export type OrientationLock = 'none' | 'upright' | 'on-side';

export interface Product {
  id: string;
  name: string;
  length: number;
  width: number;
  height: number;
  netWeight: number;
  grossWeight: number;
  color: string;
  quantity?: number;
  stackable?: boolean;
  fragile?: boolean;
  orientationLock?: OrientationLock;
  priority?: number;
}

export type VehicleClass = 'container' | 'truck' | 'air' | 'lcl';

export type ContainerCategory =
  | 'Dry'
  | 'Reefer'
  | 'Open Top'
  | 'Flat Rack'
  | 'Van'
  | 'Curtainsider'
  | 'Flatbed'
  | 'Box Truck'
  | 'LCL'
  | 'Air Container'
  | 'Air Pallet';

export interface ContainerType {
  id: string;
  name: string;
  shortName: string;
  sizeLabel: string;
  category: ContainerCategory;
  vehicleClass: VehicleClass;
  innerLength: number;
  innerWidth: number;
  innerHeight: number;
  outerLength: number;
  outerWidth: number;
  outerHeight: number;
  maxPayload: number;
  volume: number;
  teu: number;
  reeferFloorCm?: number;
  reeferTopCm?: number;
  reeferEvaporatorDepthCm?: number;
  axleConfig?: AxleConfig;
}

export interface AxleConfig {
  frontAxleX: number;
  rearAxleX: number;
  maxFrontAxleKg: number;
  maxRearAxleKg: number;
}

export interface PackedBox {
  productId: string;
  x: number;
  y: number;
  z: number;
  l: number;
  w: number;
  h: number;
}

export interface PackedPallet {
  x: number;
  y: number;
  palletL: number;
  palletW: number;
  stackH: number;
}

export interface PackingZoneData {
  count: number;
  orientation: [number, number, number];
  nX: number;
  nY: number;
  nZ: number;
}

export interface ProductResult {
  product: Product;
  count: number;
  orientation: [number, number, number];
  nX: number;
  nY: number;
  nZ: number;
  volumeUsed: number;
  boxesPerPallet?: number;
  palletCount?: number;
  zones?: PackingZoneData[];
  zoneSplitAxis?: 'height' | 'width' | 'length';
}

export interface PackingResult {
  container: ContainerType;
  productResults: ProductResult[];
  packedBoxes: PackedBox[];
  packedPallets?: PackedPallet[];
  totalCount: number;
  volumeUtilization: number;
  weightUtilization: number;
  totalGrossWeight: number;
  totalNetWeight: number;
  containerVolumeCm3: number;
  loadingMode: LoadingMode;
  centerOfGravityX?: number;
  centerOfGravityY?: number;
}

export interface MultiContainerResult {
  containersNeeded: number;
  results: PackingResult[];
  totalUnits: number;
  totalGrossWeight: number;
}

export type LoadingMode = 'handload' | 'pallet';

export interface PalletConfig {
  id: string;
  label: string;
  length: number;
  width: number;
  deckHeight: number;
  maxStackHeight: number;
  maxStackWeightKg: number;
}

export const STANDARD_PALLETS: PalletConfig[] = [
  {
    id: 'eur',
    label: 'EUR (120×80 cm)',
    length: 120,
    width: 80,
    deckHeight: 14.4,
    maxStackHeight: 220,
    maxStackWeightKg: 1500,
  },
  {
    id: 'gma',
    label: 'GMA / US (121×101 cm)',
    length: 121.9,
    width: 101.6,
    deckHeight: 14.4,
    maxStackHeight: 220,
    maxStackWeightKg: 1500,
  },
  {
    id: 'custom',
    label: 'Custom',
    length: 120,
    width: 100,
    deckHeight: 15,
    maxStackHeight: 240,
    maxStackWeightKg: 2000,
  },
];

export type UnitSystem = 'cm' | 'mm' | 'in';
