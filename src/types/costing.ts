export type TradeRoute = 'china-uk' | 'china-eu' | 'thailand-uk' | 'thailand-eu';
export type ContainerSize = '20ft' | '40ft' | '40ft-hc';
export type Incoterm = 'EXW' | 'FOB' | 'CFR' | 'CIF' | 'DDP';
export type PurchaseCurrency = 'CNY' | 'THB' | 'USD' | 'EUR' | 'GBP';

export interface TradeRouteInfo {
  id: TradeRoute;
  label: string;
  origin: string;
  destination: string;
  destCode: 'UK' | 'EU';
  defaultVAT: number;
  defaultTransitDays: number;
  gspEligible: boolean;
}

export interface ProductCostInputs {
  purchasePricePerUnit: number;
  purchaseCurrency: PurchaseCurrency;
  exchangeRateToGBP: number;
  unitsPerContainer: number;
  numberOfContainers: number;
  packingCostPerUnit: number;
  inlandHaulageOrigin: number;
}

export interface FreightInputs {
  incoterm: Incoterm;
  containerSize: ContainerSize;
  oceanFreightUSD: number;
  usdToGBP: number;
  originForwarderFee: number;
  exportCustomsFee: number;
  bafSurcharge: number;
  cafSurcharge: number;
  pssSurcharge: number;
  otherSurcharges: number;
  enableBAF: boolean;
  enableCAF: boolean;
  enablePSS: boolean;
}

export interface ClearanceInputs {
  cnCode: string;
  dutyRatePercent: number;
  antiDumpingDutyPercent: number;
  vatRatePercent: number;
  vatRegistered: boolean;
  brokerFee: number;
  examinationFee: number;
  portHealthFee: number;
  customsEntryFee: number;
}

export interface DomesticTransportInputs {
  portToWarehouseHaulage: number;
  devannningLabour: number;
  warehousingPerWeek: number;
  warehousWeeks: number;
  labellingPerUnit: number;
  deliveryToCustomer: number;
}

export interface InsuranceInputs {
  cargoInsuranceRatePercent: number;
  bankCharges: number;
  financingDays: number;
  financingRatePercent: number;
  miscBufferPercent: number;
}

export interface CostingInputs {
  name: string;
  tradeRoute: TradeRoute;
  product: ProductCostInputs;
  freight: FreightInputs;
  clearance: ClearanceInputs;
  domestic: DomesticTransportInputs;
  insurance: InsuranceInputs;
  targetSellingPricePerUnit: number;
}

export interface CostingBreakdown {
  productCostGBP: number;
  packingCostGBP: number;
  inlandOriginGBP: number;
  originForwarderGBP: number;
  exportCustomsGBP: number;
  oceanFreightGBP: number;
  surchargesGBP: number;
  cargoInsuranceGBP: number;
  cifValueGBP: number;
  customsDutyGBP: number;
  antiDumpingDutyGBP: number;
  vatGBP: number;
  brokerFeeGBP: number;
  examinationFeeGBP: number;
  portHealthGBP: number;
  customsEntryGBP: number;
  portToWarehouseGBP: number;
  devanningGBP: number;
  warehouseCostGBP: number;
  labellingCostGBP: number;
  deliveryCostGBP: number;
  bankChargesGBP: number;
  financingCostGBP: number;
  miscBufferGBP: number;
}

export interface CostingResults {
  breakdown: CostingBreakdown;
  totalProductCostGBP: number;
  totalFreightGBP: number;
  totalClearanceGBP: number;
  totalDomesticGBP: number;
  totalInsuranceOverheadGBP: number;
  totalLandedCostGBP: number;
  landedCostPerUnitGBP: number;
  cifValueGBP: number;
  dutyAndTaxTotalGBP: number;
  revenueGBP: number;
  grossProfitGBP: number;
  grossProfitPerUnitGBP: number;
  grossMarginPercent: number;
  breakEvenSellingPriceGBP: number;
  roiPercent: number;
  totalUnits: number;
}

export interface SavedCosting {
  id: string;
  user_id: string;
  name: string;
  trade_route: TradeRoute;
  inputs: CostingInputs;
  results: CostingResults;
  created_at: string;
  updated_at: string;
}

export interface CNCodeEntry {
  code: string;
  description: string;
  ukDutyRate: number;
  euDutyRate: number;
  requiresLicence: boolean;
  licenceNote?: string;
  antiDumpingChina: boolean;
  antiDumpingNote?: string;
  gspReduction?: number;
}
