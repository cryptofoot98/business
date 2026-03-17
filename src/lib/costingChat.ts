import { supabase } from './supabase';
import { CostingInputs, CostingResults, CustomField } from '../types/costing';

export interface CostingChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface CostingAIAction {
  type: 'add_custom_fields' | 'replace_custom_fields' | 'remove_custom_fields' | 'suggest_only';
  fields?: CustomField[];
  remove_ids?: string[];
}

export interface CostingAIResponse {
  message: string;
  action: CostingAIAction | null;
}

export async function callCostingAI(
  messages: CostingChatMessage[],
  inputs: CostingInputs,
  results: CostingResults,
  sessionToken: string
): Promise<CostingAIResponse> {
  const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL || import.meta.env.VITE_SUPABASE_DATABASE_URL);
  const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

  const context = {
    tradeRoute: inputs.tradeRoute,
    numberOfContainers: inputs.product.numberOfContainers,
    unitsPerContainer: inputs.product.unitsPerContainer,
    totalUnits: results.totalUnits,
    landedCostPerUnit: results.landedCostPerUnitGBP,
    totalLandedCost: results.totalLandedCostGBP,
    cifValue: results.cifValueGBP,
    grossMarginPercent: results.grossMarginPercent,
    grossProfitGBP: results.grossProfitGBP,
    breakEvenPrice: results.breakEvenSellingPriceGBP,
    targetSellingPrice: inputs.targetSellingPricePerUnit,
    existingCustomFields: inputs.customFields ?? [],
    costBreakdown: {
      product: results.totalProductCostGBP,
      freight: results.totalFreightGBP,
      clearance: results.totalClearanceGBP,
      domestic: results.totalDomesticGBP,
      overhead: results.totalInsuranceOverheadGBP,
      customCosts: results.totalCustomCostsGBP,
      customBenefits: results.totalCustomBenefitsGBP,
    },
  };

  const res = await fetch(`${supabaseUrl}/functions/v1/costing-chat`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${sessionToken}`,
      'apikey': supabaseAnonKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ messages, context }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(err);
  }

  return res.json();
}
