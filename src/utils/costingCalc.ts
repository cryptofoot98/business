import { CostingInputs, CostingResults, CostingBreakdown } from '../types/costing';

export function computeCosting(inputs: CostingInputs): CostingResults {
  const { product, freight, clearance, domestic, insurance } = inputs;

  const totalUnits = product.unitsPerContainer * product.numberOfContainers;
  const containers = product.numberOfContainers;

  const toGBP = (amount: number, rate: number) => amount / rate;

  const productCostGBP = toGBP(product.purchasePricePerUnit * totalUnits, product.exchangeRateToGBP);
  const packingCostGBP = toGBP(product.packingCostPerUnit * totalUnits, product.exchangeRateToGBP);
  const inlandOriginGBP = product.inlandHaulageOrigin * containers;
  const originForwarderGBP = freight.originForwarderFee * containers;
  const exportCustomsGBP = freight.exportCustomsFee * containers;

  const oceanFreightGBP = toGBP(freight.oceanFreightUSD * containers, freight.usdToGBP);
  const surchargesGBP =
    (freight.enableBAF ? freight.bafSurcharge : 0) * containers +
    (freight.enableCAF ? freight.cafSurcharge : 0) * containers +
    (freight.enablePSS ? freight.pssSurcharge : 0) * containers +
    freight.otherSurcharges * containers;

  const fobValue = productCostGBP + packingCostGBP + inlandOriginGBP + originForwarderGBP + exportCustomsGBP;
  const freightAndSurcharges = oceanFreightGBP + surchargesGBP;

  const cargoInsuranceGBP = (fobValue + freightAndSurcharges) * (insurance.cargoInsuranceRatePercent / 100);
  const cifValueGBP = fobValue + freightAndSurcharges + cargoInsuranceGBP;

  const dutyableValue = cifValueGBP;
  const customsDutyGBP = dutyableValue * (clearance.dutyRatePercent / 100);
  const antiDumpingDutyGBP = dutyableValue * (clearance.antiDumpingDutyPercent / 100);
  const vatBase = dutyableValue + customsDutyGBP + antiDumpingDutyGBP;
  const vatGBP = clearance.vatRegistered ? 0 : vatBase * (clearance.vatRatePercent / 100);
  const brokerFeeGBP = clearance.brokerFee * containers;
  const examinationFeeGBP = clearance.examinationFee * containers;
  const portHealthGBP = clearance.portHealthFee * containers;
  const customsEntryGBP = clearance.customsEntryFee * containers;

  const portToWarehouseGBP = domestic.portToWarehouseHaulage * containers;
  const devanningGBP = domestic.devannningLabour * containers;
  const warehouseCostGBP = domestic.warehousingPerWeek * domestic.warehousWeeks * containers;
  const labellingCostGBP = domestic.labellingPerUnit * totalUnits;
  const deliveryCostGBP = domestic.deliveryToCustomer * containers;

  const bankChargesGBP = insurance.bankCharges;
  const financingCostGBP = (cifValueGBP * (insurance.financingRatePercent / 100) * insurance.financingDays) / 365;
  const totalBeforeBuffer =
    cifValueGBP + customsDutyGBP + antiDumpingDutyGBP + vatGBP +
    brokerFeeGBP + examinationFeeGBP + portHealthGBP + customsEntryGBP +
    portToWarehouseGBP + devanningGBP + warehouseCostGBP + labellingCostGBP +
    deliveryCostGBP + bankChargesGBP + financingCostGBP;
  const miscBufferGBP = totalBeforeBuffer * (insurance.miscBufferPercent / 100);

  const breakdown: CostingBreakdown = {
    productCostGBP,
    packingCostGBP,
    inlandOriginGBP,
    originForwarderGBP,
    exportCustomsGBP,
    oceanFreightGBP,
    surchargesGBP,
    cargoInsuranceGBP,
    cifValueGBP,
    customsDutyGBP,
    antiDumpingDutyGBP,
    vatGBP,
    brokerFeeGBP,
    examinationFeeGBP,
    portHealthGBP,
    customsEntryGBP,
    portToWarehouseGBP,
    devanningGBP,
    warehouseCostGBP,
    labellingCostGBP,
    deliveryCostGBP,
    bankChargesGBP,
    financingCostGBP,
    miscBufferGBP,
  };

  const totalProductCostGBP = productCostGBP + packingCostGBP + inlandOriginGBP;
  const totalFreightGBP = originForwarderGBP + exportCustomsGBP + oceanFreightGBP + surchargesGBP + cargoInsuranceGBP;
  const totalClearanceGBP = customsDutyGBP + antiDumpingDutyGBP + vatGBP + brokerFeeGBP + examinationFeeGBP + portHealthGBP + customsEntryGBP;
  const totalDomesticGBP = portToWarehouseGBP + devanningGBP + warehouseCostGBP + labellingCostGBP + deliveryCostGBP;
  const totalInsuranceOverheadGBP = bankChargesGBP + financingCostGBP + miscBufferGBP;

  const totalLandedCostGBP = totalProductCostGBP + totalFreightGBP + totalClearanceGBP + totalDomesticGBP + totalInsuranceOverheadGBP;
  const landedCostPerUnitGBP = totalUnits > 0 ? totalLandedCostGBP / totalUnits : 0;

  const dutyAndTaxTotalGBP = customsDutyGBP + antiDumpingDutyGBP + vatGBP;

  const revenueGBP = inputs.targetSellingPricePerUnit * totalUnits;
  const grossProfitGBP = revenueGBP - totalLandedCostGBP;
  const grossProfitPerUnitGBP = totalUnits > 0 ? grossProfitGBP / totalUnits : 0;
  const grossMarginPercent = revenueGBP > 0 ? (grossProfitGBP / revenueGBP) * 100 : 0;
  const breakEvenSellingPriceGBP = totalUnits > 0 ? totalLandedCostGBP / totalUnits : 0;
  const roiPercent = totalLandedCostGBP > 0 ? (grossProfitGBP / totalLandedCostGBP) * 100 : 0;

  return {
    breakdown,
    totalProductCostGBP,
    totalFreightGBP,
    totalClearanceGBP,
    totalDomesticGBP,
    totalInsuranceOverheadGBP,
    totalLandedCostGBP,
    landedCostPerUnitGBP,
    cifValueGBP,
    dutyAndTaxTotalGBP,
    revenueGBP,
    grossProfitGBP,
    grossProfitPerUnitGBP,
    grossMarginPercent,
    breakEvenSellingPriceGBP,
    roiPercent,
    totalUnits,
  };
}
