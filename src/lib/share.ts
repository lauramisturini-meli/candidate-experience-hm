import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { TabsState, TabId } from '../types';

const SUPABASE_URL  = import.meta.env.VITE_SUPABASE_URL  ?? '';
const SUPABASE_ANON = import.meta.env.VITE_SUPABASE_ANON ?? '';

export const supabase: SupabaseClient | null = (SUPABASE_URL && SUPABASE_ANON)
  ? createClient(SUPABASE_URL, SUPABASE_ANON)
  : null;

export function genShareId(): string {
  const alphabet = 'abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let id = '';
  for (let i = 0; i < 8; i++) id += alphabet[Math.floor(Math.random() * alphabet.length)];
  return id;
}

export function buildSharePayload(tabsData: TabsState): Record<string, unknown> | null {
  const payload: Record<string, unknown> = {};
  for (const [tab, data] of Object.entries(tabsData) as [TabId, { pdfs: TabsState[TabId]['pdfs'] }][]) {
    if (!data.pdfs.length) continue;
    payload[tab] = data.pdfs.map(p => ({
      respostas:   p.respostas,
      fav:         p.fav,
      desfav:      p.desfav,
      dimensions:  p.dimensions  || [],
      comments:    p.comments    || [],
      filters:     p.filters     || {},
      overallRange:p.overallRange || 'ALL',
      periodLabel: p.periodLabel || '',
      isHm:        !!p.isHm,
      fileName:    p.fileName    || '',
    }));
  }
  return Object.keys(payload).length ? payload : null;
}

export async function saveShare(id: string, payload: Record<string, unknown>): Promise<void> {
  if (!supabase) throw new Error('Supabase não configurado');
  const { error } = await supabase.from('shares').insert({ id, payload });
  if (error) throw error;
}

export async function loadShare(id: string): Promise<Record<string, unknown>> {
  if (!supabase) throw new Error('Supabase não configurado');
  const { data, error } = await supabase.from('shares').select('payload').eq('id', id).single();
  if (error || !data) throw error ?? new Error('Link não encontrado');
  return data.payload as Record<string, unknown>;
}
