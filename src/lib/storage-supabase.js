/**
 * Stockage partagé via Supabase : synchronisation entre tous les managers (téléphones inclus).
 * Config : variables d'environnement OU saisie dans l'app (localStorage).
 */
import { createClient } from '@supabase/supabase-js';

const TABLE = 'app_storage';

function getConfig() {
  const url = import.meta.env.VITE_SUPABASE_URL;
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
  return { url: url || null, anonKey: anonKey || null };
}

export let supabase = null;

export function getSupabase() {
  if (supabase) return supabase;
  try {
    const { url, anonKey } = getConfig();
    if (!url || !anonKey || anonKey.startsWith('REMPLACER')) return null;
    supabase = createClient(url, anonKey);
    return supabase;
  } catch (e) {
    console.error('Supabase init error:', e);
    return null;
  }
}


export function isSupabaseConfigured() {
  const { url, anonKey } = getConfig();
  return !!(url && anonKey && !String(anonKey).startsWith('REMPLACER'));
}



export function initSupabaseStorage() {
  getSupabase();
  if (!supabase) return;

  window.storage = {
    async get(key, isShared = false) {
      if (!isShared) {
        const value = localStorage.getItem(key);
        return { value };
      }
      const { data, error } = await supabase.from(TABLE).select('value').eq('key', key).maybeSingle();
      if (error) {
        console.error('Supabase get error:', error);
        return { value: null };
      }
      return { value: data?.value ?? null };
    },
    async set(key, value, isShared = false) {
      if (!isShared) {
        localStorage.setItem(key, typeof value === 'string' ? value : JSON.stringify(value));
        return;
      }
      const { error } = await supabase.from(TABLE).upsert(
        { key, value: typeof value === 'string' ? value : JSON.stringify(value), updated_at: new Date().toISOString() },
        { onConflict: 'key' }
      );
      if (error) console.error('Supabase set error:', error);
    },
    async delete(key, isShared = false) {
      if (!isShared) {
        localStorage.removeItem(key);
        return;
      }
      await supabase.from(TABLE).delete().eq('key', key);
    },
  };
}
