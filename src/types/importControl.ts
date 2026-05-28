// Import Control Sheet — post-arrival container reconciliation.
// Mirrors the Meadowvale Import Control Sheet (PDF) field-for-field so audit
// against source paperwork is trivial.

export interface ImportControlHeader {
  containerNumber: string;            // MSDU9628847
  billOfLading: string;               // CAT00351464
  fobAgent: string;                   // "AGT"
  loadNumber: string;                 // FF2386
  purchaseOrderNo: string;            // 39842/56
  cleared: boolean;                   // "CLEARED" stamp
  shippingCompany: string;            // ALLY GLOBAL
  transportCompany: string;           // AGT
  portOfArrival: string;              // Felixstowe
  bulkPo: string;                     // free text (e.g. "Bulk PO")
  deliveryTo: string;                 // FF Warrington
  arrivalDate: string;                // ISO yyyy-mm-dd
  collectionDateFromPort: string;     // ISO yyyy-mm-dd
  containerGrossWeightTonnes: number; // 17 (max)
  exchangeRateUSDGBP: number;         // 1.34
  discountedCostGBP: number;          // manual override, optional
}

// "Clearance Charges" panel — right side of page 1.
export interface ImportControlClearance {
  ewlCharges: number;
  terminalFees: number;
  documentFees: number;
  customsClearance: number;
  freightBlendedAdjustment: number;
  freeTimeStorageExtra: number;
  portExamination: number;
  portHealth: number;
  oceanFreightGBP: number;
  oceanFreightUSD: number;            // reference only, doesn't enter Total
  loLo: number;
  demurrage: number;
  vehicleDetention: number;
  ukTransport: number;
}

// Left-column "other costs" stack (product cost + port clearance are derived).
export interface ImportControlCosts {
  dutyFromHMCustoms: number;
  handball: number;
  packagingCosts: number;
  insurancePerContainer: number;
  thaiDutyOnPackaging: number;
  bagWastageGL: number;
  licenceCost: number;
  additionsLC: number;
  additions2: number;
  commissions: number;
}

export interface ImportControlProduct {
  productCode: string;                // selected from products catalog
  productDescription: string;
  caseCount: number;                  // cases actually in container
  caseWeight: number;                 // kg per case
  quantity: number;                   // PO quantity (case count ordered)
  poCostUSD: number;                  // original PO line
  productCostUSD: number;             // supplier-invoiced amount
  salesPricePerCase: number;          // £/case for margin
  // Catalog container fill (kg) — prefilled from products.container_fill_kg on
  // catalog select. Used as the denominator for "% Container Fill" so the
  // result matches the spreadsheet rule (loaded share of a notional full FCL).
  catalogContainerFillKg: number;
}

export interface ImportControl {
  header: ImportControlHeader;
  clearance: ImportControlClearance;
  costs: ImportControlCosts;
  products: ImportControlProduct[];   // 1-4
}

export interface ImportControlProductResult {
  productCostGBP: number;             // productCostUSD / fx
  netPricePerCase: number;            // productCostGBP / caseCount
  totalWeightTonnes: number;          // caseCount × caseWeight / 1000
  extrasShareGBP: number;             // weight-proportional share of Total Cost of Extras
  costPerCase: number;                // netPricePerCase + extrasShare/caseCount
  totalProductValue: number;          // costPerCase × caseCount
  cumulativeTotal: number;            // running sum of totalProductValue
  marginGBPPerCase: number;
  marginPercent: number;              // (sales − costPerCase) / sales × 100
}

export interface ImportControlResults {
  clearanceTotalGBP: number;          // sum of all clearance lines (£ only)
  portClearanceCharges: number;       // → cost row on the left summary
  productCostSterling: number;        // sum of products productCostGBP
  totalContainerCost: number;
  totalCases: number;
  containerWeightTonnes: number;      // actual loaded weight
  containerWeightKg: number;
  percentageContainerFill: number;    // actual / ordered × 100
  totalCostOfExtras: number;          // totalContainerCost − productCostSterling
  pricePerKilo: number;               // totalCostOfExtras / containerWeightKg
  perProduct: ImportControlProductResult[];
}

export interface SavedImportControl {
  id: string;
  user_id: string;
  name: string;
  data: ImportControl;
  results: ImportControlResults;
  created_at: string;
  updated_at: string;
}
