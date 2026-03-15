import { supabase } from './supabase';
import { CostingInputs, CostingResults, SavedCosting, TradeRoute } from '../types/costing';

export async function saveCostingCalculation(
  userId: string,
  name: string,
  tradeRoute: TradeRoute,
  inputs: CostingInputs,
  results: CostingResults,
  existingId?: string
): Promise<SavedCosting | null> {
  if (existingId) {
    const { data, error } = await supabase
      .from('costing_calculations')
      .update({ name, trade_route: tradeRoute, inputs, results, updated_at: new Date().toISOString() })
      .eq('id', existingId)
      .select()
      .maybeSingle();
    if (error) throw error;
    return data as SavedCosting | null;
  }

  const { data, error } = await supabase
    .from('costing_calculations')
    .insert({ user_id: userId, name, trade_route: tradeRoute, inputs, results })
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
