import { supabase } from './supabase';
import {
  FoodCostingInputs, FoodCostingResult, SavedCosting,
  CostingModelPayload, CostingModelResults,
} from '../types/costing';

export async function saveCostingCalculation(
  userId: string,
  name: string,
  inputs: FoodCostingInputs | CostingModelPayload,
  results: FoodCostingResult | CostingModelResults,
  existingId?: string
): Promise<SavedCosting | null> {
  const payload = {
    name,
    trade_route: 'food-import',
    inputs,
    results,
    updated_at: new Date().toISOString(),
  };

  if (existingId) {
    const { data, error } = await supabase
      .from('costing_calculations')
      .update(payload)
      .eq('id', existingId)
      .select()
      .maybeSingle();
    if (error) throw error;
    return data as SavedCosting | null;
  }

  const { data, error } = await supabase
    .from('costing_calculations')
    .insert({ user_id: userId, ...payload })
    .select()
    .maybeSingle();
  if (error) throw error;
  return data as SavedCosting | null;
}

export async function fetchCostingCalculations(userId: string): Promise<SavedCosting[]> {
  const { data, error } = await supabase
    .from('costing_calculations')
    .select('*')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as SavedCosting[];
}

export async function deleteCostingCalculation(id: string): Promise<void> {
  const { error } = await supabase
    .from('costing_calculations')
    .delete()
    .eq('id', id);
  if (error) throw error;
}
