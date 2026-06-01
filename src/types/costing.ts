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
  // `inputs` / `results` are stored as JSON. Pre-v2 rows hold FoodCostingInputs/Result;
  // v2 rows hold CostingModelPayload/CostingModelResults — discriminated by `kind`.
  inputs: FoodCostingInputs | CostingModelPayload;
  results: FoodCostingResult | CostingModelResults;
  created_at: string;
  updated_at: string;
}

export function isCostingModelPayload(x: unknown): x is CostingModelPayload {
  return typeof x === 'object' && x !== null && (x as { kind?: string }).kind === 'model_v2';
}
export function isCostingModelResults(x: unknown): x is CostingModelResults {
  return typeof x === 'object' && x !== null && (x as { kind?: string }).kind === 'model_v2';
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

// ── Costing Model (spreadsheet-faithful 5-scenario model) ─────────────────────

export type Incoterms = 'FOB' | 'CFR';
export type SalesCurrency = 'GBP' | 'EUR';

export interface CostingModelProduct {
  productCode: string;
  description: string;
  productCategory: ProductCategory;   // "Meat Content"
  bagsPerCase: number;
  caseWeightKg: number;
  supplier: string;
  priceUSDPerTonne: number;
}

export interface CostingModelContainer {
  clearanceType: ClearanceType;       // Licence | Full Duty
  retail: boolean;                    // Yes/No (No adds £1,395/container)
  handball: boolean;                  // Yes/No (Yes adds £625.25/container)
  containerWeightKg: number;
  insuranceAuto: boolean;             // auto = product cost × 0.25%
  insuranceManualGBP: number;
}

export interface CostingScenario {
  label: string;
  salesCurrency: SalesCurrency;
  eurGbpRate: number;                  // €→£ (only used when salesCurrency = EUR)
  salesPricePerCase: number;           // expressed in salesCurrency
  exchangeRateUSDGBP: number;          // $→£
  casesPerContainer: number;
  incoterms: Incoterms;                // FOB → freight charged, CFR → freight = 0
  freightCostUSD: number;
  agentPort: AgentPortKey;
  transportCostGBP: number;
  licenceCostPerKgGBP: number;         // default 0.40 per spreadsheet Q-column
}

export interface ScenarioSummary {
  productCostGBP: number;                  // C26
  dutyGBP: number;                         // D26
  freightGBP: number;                      // E26
  portClearanceTransportGBP: number;       // F26
  licenceCostGBP: number;                  // G26
  handballGBP: number;                     // H26
  currencyInsuranceAdditions2GBP: number;  // I26
  additions1GBP: number;                   // J26
  additionalDutyGBP: number;               // K26
  insurancePerFCLGBP: number;              // F12
  totalCostGBP: number;                    // L26
  costPerCaseGBP: number;                  // M26
  costPerKgGBP: number;                    // N26
  salesPriceGBPPerCase: number;            // R26 (FX'd from EUR if needed)
  gmGBPPerCase: number;
  gmPercent: number;                       // O26
  dutyRateLabel: string;
}

export interface CostingModelPayload {
  kind: 'model_v2';
  product: CostingModelProduct;
  container: CostingModelContainer;
  scenarios: CostingScenario[];
}

export interface CostingModelResults {
  kind: 'model_v2';
  scenarios: ScenarioSummary[];
}
