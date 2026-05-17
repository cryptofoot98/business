import type {
  ProductCategory, ClearanceType, AgentPortKey,
  DutyRate, AgentPortInfo,
} from '../data/costingRates';

export type { ProductCategory, ClearanceType, AgentPortKey };

// ── Main costing inputs / results ─────────────────────────────────────────────

export interface FoodCostingInputs {
  productName: string;
  supplier: string;
  costPerTonneUSD: number;
  caseWeightKg: number;
  casesPerContainer: number;
  exchangeRateUSDGBP: number;
  freightCostUSD: number;
  productCategory: ProductCategory;
  clearanceType: ClearanceType;
  agentPort: AgentPortKey;
  transportCostGBP: number;
  handballing: boolean;
  handballingCostGBP: number;
  insuranceAuto: boolean;
  insuranceManualGBP: number;
  addition1Label: string;
  addition1GBP: number;
  addition2Label: string;
  addition2GBP: number;
  sellingPricePerCase: number;
}

export interface FoodCostingResult {
  productCostPerCase: number;
  freightPerCase: number;
  dutyPerCase: number;
  portClearancePerCase: number;
  transportPerCase: number;
  handballingPerCase: number;
  insurancePerCase: number;
  addition1PerCase: number;
  addition2PerCase: number;
  totalCostPerCase: number;
  costPerKg: number;
  gmPercent: number;
  gmGBPPerCase: number;
  totalCostPerContainer: number;
  dutyRateLabel: string;
}

export interface SavedCosting {
  id: string;
  user_id: string;
  name: string;
  trade_route: string;
  inputs: FoodCostingInputs;
  results: FoodCostingResult;
  created_at: string;
  updated_at: string;
}

// ── User-editable rate overrides (stored in localStorage) ─────────────────────

export interface CostingSettings {
  dutyRates: Record<ProductCategory, Record<ClearanceType, DutyRate>>;
  agentPortRates: Record<AgentPortKey, AgentPortInfo>;
  insurancePerFCL: number;
}

// ── NPD Costings (5 scenarios, shared product) ────────────────────────────────

export interface NpdSharedProduct {
  productName: string;
  supplier: string;
  costPerTonneUSD: number;
  caseWeightKg: number;
  casesPerContainer: number;
  productCategory: ProductCategory;
  clearanceType: ClearanceType;
}

export interface NpdScenario {
  label: string;
  exchangeRateUSDGBP: number;
  freightCostUSD: number;
  agentPort: AgentPortKey;
  transportCostGBP: number;
  handballing: boolean;
  handballingCostGBP: number;
  insuranceAuto: boolean;
  insuranceManualGBP: number;
  sellingPricePerCase: number;
}

// ── Bulk Costings (multiple products, shared container settings) ───────────────

export interface BulkSharedSettings {
  exchangeRateUSDGBP: number;
  clearanceType: ClearanceType;
  agentPort: AgentPortKey;
  transportCostGBP: number;
  handballing: boolean;
  handballingCostGBP: number;
  insuranceAuto: boolean;
  insuranceManualGBP: number;
  addition1Label: string;
  addition1GBP: number;
  addition2Label: string;
  addition2GBP: number;
}

export interface BulkProductRow {
  id: string;
  productName: string;
  supplier: string;
  costPerTonneUSD: number;
  caseWeightKg: number;
  casesPerContainer: number;
  productCategory: ProductCategory;
  freightCostUSD: number;
  sellingPricePerCase: number;
}
