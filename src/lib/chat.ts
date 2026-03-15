import { supabase } from './supabase';

export interface ChatMessage {
  id: string;
  user_id: string;
  role: 'user' | 'assistant';
  content: string;
  action: AIChatAction | null;
  created_at: string;
}

export interface AIChatAction {
  container_id: string;
  unit: 'cm' | 'mm' | 'in';
  loading_mode: 'handload' | 'pallet';
  pallet_id: 'eur' | 'gma' | null;
  products: Array<{
    length: number;
    width: number;
    height: number;
    net_weight: number;
    gross_weight: number;
  }>;
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
): Promise<{ message: string; action: AIChatAction | null }> {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
  const res = await fetch(`${supabaseUrl}/functions/v1/ai-chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session}`,
    },
    body: JSON.stringify({ messages }),
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
