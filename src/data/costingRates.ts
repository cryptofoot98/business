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
