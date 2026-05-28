import {
  FoodCostingInputs, FoodCostingResult, CostingSettings,
  NpdSharedProduct, NpdScenario, BulkSharedSettings, BulkProductRow,
  CostingModelProduct, CostingModelContainer, CostingScenario, ScenarioSummary,
} from '../types/costing';
import {
  DUTY_RATES, AGENT_PORT_RATES, INSURANCE_PER_FCL_GBP,
  AGENT_CLEARANCE_FEES, AGENTS_USING_PORT_CHARGES,
  DESTINATION_CHARGE_PER_TONNE_GBP,
  RETAIL_NO_FIXED_GBP, HANDBALL_FIXED_GBP,
  BAO_BUN_ADDITIONAL_DUTY_PER_100KG, INSURANCE_RATE_OF_PRODUCT_COST,
  LICENCE_EXCLUDED_CATEGORIES,
} from '../data/costingRates';

export function computeFoodCosting(inputs: FoodCostingInputs, settings?: CostingSettings): FoodCostingResult {
  const {
    costPerTonneUSD, caseWeightKg, casesPerContainer, exchangeRateUSDGBP,
    freightCostUSD, productCategory, clearanceType, agentPort,
    transportCostGBP, handballing, handballingCostGBP,
    insuranceAuto, insuranceManualGBP, addition1GBP, addition2GBP, sellingPricePerCase,
  } = inputs;

  const dutyRates = settings?.dutyRates ?? DUTY_RATES;
  const agentRates = settings?.agentPortRates ?? AGENT_PORT_RATES;
  const insuranceDefault = settings?.insurancePerFCL ?? INSURANCE_PER_FCL_GBP;

  const n = Math.max(casesPerContainer, 1);
  const ex = Math.max(exchangeRateUSDGBP, 0.001);

  const productCostPerCase = (costPerTonneUSD * caseWeightKg / 1000) / ex;
  const freightPerCase = freightCostUSD / ex / n;

  const dutyRate = dutyRates[productCategory][clearanceType];
  let dutyPerKg: number;
  let dutyRateLabel: string;
  if (dutyRate.type === 'per_kg') {
    dutyPerKg = dutyRate.rate;
    dutyRateLabel = `£${dutyRate.rate.toFixed(3)}/kg`;
  } else {
    dutyPerKg = dutyRate.rate / 1000;
    dutyRateLabel = `£${dutyRate.rate.toLocaleString()}/tonne`;
  }
  const dutyPerCase = dutyPerKg * caseWeightKg;

  const info = agentRates[agentPort];
  const portClearancePerCase = (info.healthExamGBP + info.portChargesGBP) / n;
  const transportPerCase = transportCostGBP / n;
  const handballingPerCase = handballing ? handballingCostGBP / n : 0;

  const insuranceTotal = insuranceAuto ? insuranceDefault : insuranceManualGBP;
  const insurancePerCase = insuranceTotal / n;
  const addition1PerCase = addition1GBP / n;
  const addition2PerCase = addition2GBP / n;

  const totalCostPerCase =
    productCostPerCase + freightPerCase + dutyPerCase + portClearancePerCase +
    transportPerCase + handballingPerCase + insurancePerCase +
    addition1PerCase + addition2PerCase;

  const costPerKg = caseWeightKg > 0 ? totalCostPerCase / caseWeightKg : 0;
  const gmGBPPerCase = sellingPricePerCase - totalCostPerCase;
  const gmPercent = sellingPricePerCase > 0 ? (gmGBPPerCase / sellingPricePerCase) * 100 : 0;

  return {
    productCostPerCase, freightPerCase, dutyPerCase, portClearancePerCase,
    transportPerCase, handballingPerCase, insurancePerCase,
    addition1PerCase, addition2PerCase, totalCostPerCase,
    costPerKg, gmPercent, gmGBPPerCase,
    totalCostPerContainer: totalCostPerCase * n,
    dutyRateLabel,
  };
}

export function computeNpdScenario(
  product: NpdSharedProduct,
  scenario: NpdScenario,
  settings?: CostingSettings,
): FoodCostingResult {
  return computeFoodCosting({
    productName: product.productName,
    supplier: product.supplier,
    costPerTonneUSD: product.costPerTonneUSD,
    caseWeightKg: product.caseWeightKg,
    casesPerContainer: product.casesPerContainer,
    productCategory: product.productCategory,
    clearanceType: product.clearanceType,
    exchangeRateUSDGBP: scenario.exchangeRateUSDGBP,
    freightCostUSD: scenario.freightCostUSD,
    agentPort: scenario.agentPort,
    transportCostGBP: scenario.transportCostGBP,
    handballing: scenario.handballing,
    handballingCostGBP: scenario.handballingCostGBP,
    insuranceAuto: scenario.insuranceAuto,
    insuranceManualGBP: scenario.insuranceManualGBP,
    addition1Label: '',
    addition1GBP: 0,
    addition2Label: '',
    addition2GBP: 0,
    sellingPricePerCase: scenario.sellingPricePerCase,
  }, settings);
}

// ── Costing Model — replicates the spreadsheet Costing Model tab ──────────────
// Cell references in comments refer to "Costing Model" sheet, row 26 = Scenario 1.

export function computeCostingModelScenario(
  product: CostingModelProduct,
  container: CostingModelContainer,
  scenario: CostingScenario,
  settings?: CostingSettings,
): ScenarioSummary {
  const dutyRates  = settings?.dutyRates ?? DUTY_RATES;
  const agentRates = settings?.agentPortRates ?? AGENT_PORT_RATES;

  const dutyRate = dutyRates[product.productCategory][container.clearanceType];
  const dutyRateGbpPerKg = dutyRate.type === 'per_kg' ? dutyRate.rate : dutyRate.rate / 1000;
  const dutyRateLabel = dutyRate.type === 'per_kg'
    ? `£${dutyRate.rate.toFixed(3)}/kg`
    : `£${dutyRate.rate.toLocaleString()}/tonne`;

  const agentInfo = agentRates[scenario.agentPort];
  const agentClearanceGBP = AGENT_CLEARANCE_FEES[agentInfo.agent] ?? 0;
  const portChargesGBP    = agentInfo.healthExamGBP + agentInfo.portChargesGBP;
  const usesPortCharges   = AGENTS_USING_PORT_CHARGES.has(agentInfo.agent);

  const cases = Math.max(scenario.casesPerContainer, 0);
  const fx    = scenario.exchangeRateUSDGBP;
  const totalKg = product.caseWeightKg * cases;

  // Guard rails — return zeros for everything derived if the user hasn't entered enough
  if (cases === 0 || fx <= 0 || totalKg === 0) {
    return {
      productCostGBP: 0, dutyGBP: 0, freightGBP: 0, portClearanceTransportGBP: 0,
      licenceCostGBP: 0, handballGBP: 0, currencyInsuranceAdditions2GBP: 0,
      additions1GBP: 0, additionalDutyGBP: 0, insurancePerFCLGBP: 0,
      totalCostGBP: 0, costPerCaseGBP: 0, costPerKgGBP: 0,
      salesPriceGBPPerCase: 0, gmGBPPerCase: 0, gmPercent: 0, dutyRateLabel,
    };
  }

  // C26 — Product Cost £
  const productCostGBP = (product.priceUSDPerTonne / 1000) * totalKg / fx;

  // E26 — Freight £ (only counted on FOB; CFR means freight is bundled into product price)
  const freightGBP = scenario.incoterms === 'FOB' ? scenario.freightCostUSD / fx : 0;

  // D26 — Duty
  //   Full Duty: (kg/1000) × £/tonne
  //   Licence:   ((Product × 0.06%) + (Product + Freight)) × £/kg
  const dutyGBP = container.clearanceType === 'full_duty'
    ? (totalKg / 1000) * dutyRate.rate
    : (productCostGBP * 0.0006 + productCostGBP + freightGBP) * dutyRateGbpPerKg;

  // F26 — Port Clearance + Transport
  //   = Transport + AgentClearance + ((kg + bags×0.5kg)/1000) × £10.29 + (PortCharges if agent matches)
  const bagHandlingTonnes = (totalKg + product.bagsPerCase * cases * 0.5) / 1000;
  const portClearanceTransportGBP =
    scenario.transportCostGBP +
    agentClearanceGBP +
    bagHandlingTonnes * DESTINATION_CHARGE_PER_TONNE_GBP +
    (usesPortCharges ? portChargesGBP : 0);

  // G26 — Licence Cost £/kg × totalKg (only when Licence and category not in excluded list)
  const licenceCostGBP = (
    container.clearanceType === 'licence' &&
    !LICENCE_EXCLUDED_CATEGORIES.includes(product.productCategory)
  )
    ? scenario.licenceCostPerKgGBP * totalKg
    : 0;

  // H26 — Handball flat charge
  const handballGBP = container.handball ? HANDBALL_FIXED_GBP : 0;

  // I26 — Currency + Insurance + Additions 2 (flat £1,395 when Retail = No)
  const currencyInsuranceAdditions2GBP = container.retail ? 0 : RETAIL_NO_FIXED_GBP;

  // J26 — Additions 1 (duty top-up when Licence rate ≤ 11% and product not Veg / not Retail / not Full Duty)
  let additions1GBP = 0;
  if (!container.retail &&
      container.clearanceType === 'licence' &&
      product.productCategory !== 'veg' &&
      dutyRateGbpPerKg <= 0.11) {
    additions1GBP = (productCostGBP * 1.0006 + freightGBP) * (0.11 - dutyRateGbpPerKg);
  }

  // K26 — Additional Duty (Bao Bun = 17 £/100kg of container weight)
  const additionalDutyPer100Kg = product.productCategory === 'bao_bun'
    ? BAO_BUN_ADDITIONAL_DUTY_PER_100KG
    : 0;
  const additionalDutyGBP = (container.containerWeightKg / 100) * additionalDutyPer100Kg;

  // F12 — Insurance per FCL (auto = product cost × 0.25%, or manual override)
  const insurancePerFCLGBP = container.insuranceAuto
    ? productCostGBP * INSURANCE_RATE_OF_PRODUCT_COST
    : container.insuranceManualGBP;

  // L26 — Total Cost
  const totalCostGBP =
    productCostGBP + dutyGBP + freightGBP + portClearanceTransportGBP +
    licenceCostGBP + handballGBP + currencyInsuranceAdditions2GBP +
    additions1GBP + additionalDutyGBP + insurancePerFCLGBP;

  const costPerCaseGBP = totalCostGBP / cases;
  const costPerKgGBP   = totalCostGBP / totalKg;

  // R26 — Sales price normalised to £
  const salesPriceGBPPerCase = scenario.salesCurrency === 'GBP'
    ? scenario.salesPricePerCase
    : (scenario.eurGbpRate > 0 ? scenario.salesPricePerCase / scenario.eurGbpRate : 0);

  const gmGBPPerCase = salesPriceGBPPerCase - costPerCaseGBP;
  const gmPercent = salesPriceGBPPerCase > 0
    ? (gmGBPPerCase / salesPriceGBPPerCase) * 100
    : 0;

  return {
    productCostGBP, dutyGBP, freightGBP, portClearanceTransportGBP,
    licenceCostGBP, handballGBP, currencyInsuranceAdditions2GBP,
    additions1GBP, additionalDutyGBP, insurancePerFCLGBP,
    totalCostGBP, costPerCaseGBP, costPerKgGBP,
    salesPriceGBPPerCase, gmGBPPerCase, gmPercent, dutyRateLabel,
  };
}

export function computeBulkProduct(
  shared: BulkSharedSettings,
  product: BulkProductRow,
  settings?: CostingSettings,
): FoodCostingResult {
  return computeFoodCosting({
    productName: product.productName,
    supplier: product.supplier,
    costPerTonneUSD: product.costPerTonneUSD,
    caseWeightKg: product.caseWeightKg,
    casesPerContainer: product.casesPerContainer,
    productCategory: product.productCategory,
    clearanceType: shared.clearanceType,
    exchangeRateUSDGBP: shared.exchangeRateUSDGBP,
    freightCostUSD: product.freightCostUSD,
    agentPort: shared.agentPort,
    transportCostGBP: shared.transportCostGBP,
    handballing: shared.handballing,
    handballingCostGBP: shared.handballingCostGBP,
    insuranceAuto: shared.insuranceAuto,
    insuranceManualGBP: shared.insuranceManualGBP,
    addition1Label: shared.addition1Label,
    addition1GBP: shared.addition1GBP,
    addition2Label: shared.addition2Label,
    addition2GBP: shared.addition2GBP,
    sellingPricePerCase: product.sellingPricePerCase,
  }, settings);
}
