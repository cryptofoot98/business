import {
  FoodCostingInputs, FoodCostingResult, CostingSettings,
  NpdSharedProduct, NpdScenario, BulkSharedSettings, BulkProductRow,
} from '../types/costing';
import {
  DUTY_RATES, AGENT_PORT_RATES, INSURANCE_PER_FCL_GBP,
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
