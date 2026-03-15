import { supabase } from './supabase';
import { PackingResult, Product, ContainerType } from '../types';

export interface ChatMessage {
  id: string;
  user_id: string;
  role: 'user' | 'assistant';
  content: string;
  action: AIChatAction | null;
  created_at: string;
}

export interface AIChatAction {
  type: 'setup' | 'update_product' | 'update_container' | 'suggest_only';
  container_id?: string;
  unit?: 'cm' | 'mm' | 'in';
  loading_mode?: 'handload' | 'pallet';
  pallet_id?: 'eur' | 'gma' | null;
  products?: Array<{
    length: number;
    width: number;
    height: number;
    net_weight: number;
    gross_weight: number;
    name?: string;
  }>;
  product_index?: number;
  length?: number;
  width?: number;
  height?: number;
  net_weight?: number;
  gross_weight?: number;
}

export interface AIChatContext {
  container: {
    id: string;
    name: string;
    innerLength: number;
    innerWidth: number;
    innerHeight: number;
    maxPayload: number;
  };
  unit: string;
  loading_mode: string;
  products: Array<{
    index: number;
    name: string;
    length: number;
    width: number;
    height: number;
    net_weight: number;
    gross_weight: number;
    fragile?: boolean;
    stackable?: boolean;
  }>;
  result?: {
    total_boxes: number;
    volume_utilization_pct: number;
    weight_utilization_pct: number;
    total_gross_weight_kg: number;
    max_payload_kg: number;
    center_of_gravity_x_pct?: number;
    per_product: Array<{
      name: string;
      count: number;
      orientation_lwh: [number, number, number];
      rows: number;
      cols: number;
      layers: number;
    }>;
  };
}

export function buildChatContext(
  container: ContainerType,
  products: Product[],
  unit: string,
  loadingMode: string,
  packingResult: PackingResult | null,
): AIChatContext {
  const ctx: AIChatContext = {
    container: {
      id: container.id,
      name: container.name,
      innerLength: container.innerLength,
      innerWidth: container.innerWidth,
      innerHeight: container.innerHeight,
      maxPayload: container.maxPayload,
    },
    unit,
    loading_mode: loadingMode,
    products: products.map((p, i) => ({
      index: i,
      name: p.name,
      length: p.length,
      width: p.width,
      height: p.height,
      net_weight: p.netWeight,
      gross_weight: p.grossWeight,
      fragile: p.fragile,
      stackable: p.stackable,
    })),
  };

  if (packingResult && packingResult.totalCount > 0) {
    const cogX = packingResult.centerOfGravityX;
    ctx.result = {
      total_boxes: packingResult.totalCount,
      volume_utilization_pct: Math.round(packingResult.volumeUtilization * 1000) / 10,
      weight_utilization_pct: Math.round(packingResult.weightUtilization * 1000) / 10,
      total_gross_weight_kg: packingResult.totalGrossWeight,
      max_payload_kg: container.maxPayload,
      center_of_gravity_x_pct: cogX
        ? Math.round((cogX / container.innerLength) * 100)
        : undefined,
      per_product: packingResult.productResults
        .filter(pr => pr.count > 0)
        .map(pr => ({
          name: pr.product.name,
          count: pr.count,
          orientation_lwh: pr.orientation,
          rows: pr.nX,
          cols: pr.nY,
          layers: pr.nZ,
        })),
    };
  }

  return ctx;
}

export async function fetchChatMessages(userId: string): Promise<ChatMessage[]> {
  const { data, error } = await supabase
    .from('chat_messages')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: true });

  if (error) throw error;
  return (data ?? []) as ChatMessage[];
}

export async function insertChatMessage(
  userId: string,
  role: 'user' | 'assistant',
  content: string,
  action: AIChatAction | null = null,
): Promise<ChatMessage> {
  const { data, error } = await supabase
    .from('chat_messages')
    .insert({ user_id: userId, role, content, action })
    .select()
    .single();

  if (error) throw error;
  return data as ChatMessage;
}

export async function clearChatMessages(userId: string): Promise<void> {
  const { error } = await supabase
    .from('chat_messages')
    .delete()
    .eq('user_id', userId);

  if (error) throw error;
}

export async function callAIChat(
  messages: Array<{ role: 'user' | 'assistant'; content: string }>,
  session: string,
  context?: AIChatContext,
): Promise<{ message: string; action: AIChatAction | null }> {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
  const res = await fetch(`${supabaseUrl}/functions/v1/ai-chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session}`,
    },
    body: JSON.stringify({ messages, context }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(err);
  }

  const data = await res.json();
  return {
    message: data.message ?? 'Sorry, something went wrong.',
    action: data.action ?? null,
  };
}
