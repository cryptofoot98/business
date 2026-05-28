export type ProductCategory =
  | 'meat_lt57'
  | 'meat_gt57'
  | 'spring_roll'
  | 'onion_bhaji'
  | 'duck'
  | 'prawn_gyoza'
  | 'bao_bun'
  | 'ready_meal_rice'
  | 'ready_meal_noodles'
  | 'veg';

export type ClearanceType = 'licence' | 'full_duty';

export type AgentPortKey =
  | 'agt_felixstowe'
  | 'ewl_london_gateway'
  | 'thermotraffic_southampton'
  | 'seafrigo_le_havre'
  | 'ewl_hamburg'
  | 'ewl_ireland'
  | 'far_logistics_uk'
  | 'far_logistics_fr';

export const PRODUCT_CATEGORIES: { value: ProductCategory; label: string }[] = [
  { value: 'meat_lt57',         label: 'Meat products – <57% meat content' },
  { value: 'meat_gt57',         label: 'Meat products – >57% meat content' },
  { value: 'spring_roll',       label: 'Spring rolls / Samosas' },
  { value: 'onion_bhaji',       label: 'Onion bhajis' },
  { value: 'duck',              label: 'Duck products' },
  { value: 'prawn_gyoza',       label: 'Prawn gyoza' },
  { value: 'bao_bun',           label: 'Bao buns' },
  { value: 'ready_meal_rice',   label: 'Ready meals – rice based' },
  { value: 'ready_meal_noodles',label: 'Ready meals – noodle based' },
  { value: 'veg',               label: 'Vegetable products' },
];

export interface DutyRate {
  type: 'per_kg' | 'per_tonne';
  rate: number;
}

export const DUTY_RATES: Record<ProductCategory, Record<ClearanceType, DutyRate>> = {
  meat_lt57:           { licence: { type: 'per_kg',    rate: 0.109 }, full_duty: { type: 'per_tonne', rate: 2313 } },
  meat_gt57:           { licence: { type: 'per_kg',    rate: 0.08  }, full_duty: { type: 'per_tonne', rate: 856  } },
  spring_roll:         { licence: { type: 'per_kg',    rate: 0.08  }, full_duty: { type: 'per_kg',    rate: 0.08 } },
  onion_bhaji:         { licence: { type: 'per_kg',    rate: 0.16  }, full_duty: { type: 'per_kg',    rate: 0.16 } },
  duck:                { licence: { type: 'per_kg',    rate: 0.109 }, full_duty: { type: 'per_tonne', rate: 2313 } },
  prawn_gyoza:         { licence: { type: 'per_kg',    rate: 0.20  }, full_duty: { type: 'per_kg',    rate: 0.20 } },
  bao_bun:             { licence: { type: 'per_kg',    rate: 0.08  }, full_duty: { type: 'per_kg',    rate: 0.08 } },
  ready_meal_rice:     { licence: { type: 'per_kg',    rate: 0.08  }, full_duty: { type: 'per_kg',    rate: 0.08 } },
  ready_meal_noodles:  { licence: { type: 'per_kg',    rate: 0.06  }, full_duty: { type: 'per_kg',    rate: 0.06 } },
  veg:                 { licence: { type: 'per_kg',    rate: 0.00  }, full_duty: { type: 'per_kg',    rate: 0.00 } },
};

export interface AgentPortInfo {
  label: string;
  agent: string;
  port: string;
  healthExamGBP: number;
  portChargesGBP: number;
}

export const AGENT_PORT_RATES: Record<AgentPortKey, AgentPortInfo> = {
  agt_felixstowe:            { label: 'AGT – Felixstowe',          agent: 'AGT',          port: 'Felixstowe',     healthExamGBP: 219.71, portChargesGBP: 219.71 },
  ewl_london_gateway:        { label: 'EWL – London Gateway',      agent: 'EWL',          port: 'London Gateway', healthExamGBP: 110.03, portChargesGBP: 109.68 },
  thermotraffic_southampton: { label: 'Thermotraffic – Southampton',agent: 'Thermotraffic',port: 'Southampton',    healthExamGBP: 226.74, portChargesGBP: 226.74 },
  seafrigo_le_havre:         { label: 'Seafrigo – Le Havre',       agent: 'Seafrigo',     port: 'Le Havre',       healthExamGBP: 200.00, portChargesGBP: 200.00 },
  ewl_hamburg:               { label: 'EWL – Hamburg',             agent: 'EWL',          port: 'Hamburg',        healthExamGBP: 200.00, portChargesGBP: 200.00 },
  ewl_ireland:               { label: 'EWL – Dublin (IRL)',        agent: 'EWL',          port: 'Dublin',         healthExamGBP: 275.00, portChargesGBP: 275.00 },
  far_logistics_uk:          { label: 'Far Logistics – UK',        agent: 'Far Logistics', port: 'UK Port',       healthExamGBP: 180.00, portChargesGBP: 180.00 },
  far_logistics_fr:          { label: 'Far Logistics – FR',        agent: 'Far Logistics', port: 'France Port',   healthExamGBP: 180.00, portChargesGBP: 180.00 },
};

export const INSURANCE_PER_FCL_GBP = 200;

// ── Costing Model (spreadsheet-faithful) constants ────────────────────────────

// Per-agent fixed clearance fee — Workings $N$2:$O$7
export const AGENT_CLEARANCE_FEES: Record<string, number> = {
  AGT: 471,
  EWL: 815,
  'FAR LOGISTICS': 1125,
  Seafrigo: 734,
};
// Agents that trigger the per-port-charges lookup (Costing Model F26 conditional)
export const AGENTS_USING_PORT_CHARGES = new Set(['AGT', 'EWL', 'FAR LOGISTICS', 'Seafrigo']);

// UK destination charge per tonne of (case weight + bag handling) — F26 formula constant
export const DESTINATION_CHARGE_PER_TONNE_GBP = 10.29;

// Fixed container-level surcharges (Costing Model H26 / I26)
export const RETAIL_NO_FIXED_GBP = 475 + 150 + 770;             // 1395 — when Retail = No
export const HANDBALL_FIXED_GBP  = (8.95 + 1.95 + 7.95) * 35;   // 625.25 — when Handball = Yes

// Bao Bun additional duty £/100kg of container weight — F11/K26 path
export const BAO_BUN_ADDITIONAL_DUTY_PER_100KG = 17;

// Auto insurance = % of product cost — F12 formula
export const INSURANCE_RATE_OF_PRODUCT_COST = 0.0025; // 0.25%

// Categories excluded from the per-kg licence surcharge — G26 conditional
export const LICENCE_EXCLUDED_CATEGORIES: ProductCategory[] = ['veg', 'spring_roll', 'onion_bhaji'];

// Default licence cost £/kg seeded across new scenarios — Q17:Q21
export const DEFAULT_LICENCE_COST_PER_KG = 0.4;

export const DEFAULT_TRANSPORT_COSTS: Record<AgentPortKey, number> = {
  agt_felixstowe: 650,
  ewl_london_gateway: 550,
  thermotraffic_southampton: 700,
  seafrigo_le_havre: 900,
  ewl_hamburg: 800,
  ewl_ireland: 750,
  far_logistics_uk: 500,
  far_logistics_fr: 850,
};
