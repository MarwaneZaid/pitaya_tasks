/**
 * Stockage partagé via Supabase : tous les managers voient les mêmes tâches.
 * Config possible par variables d'environnement OU dans l'app (localStorage).
 */
import { createClient } from '@supabase/supabase-js';

const TABLE = 'app_storage';
const LS_URL = 'supabase-url';
const LS_KEY = 'supabase-anon-key';

function getConfig() {
  const url = import.meta.env.VITE_SUPABASE_URL || (typeof localStorage !== 'undefined' && localStorage.getItem(LS_URL));
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || (typeof localStorage !== 'undefined' && localStorage.getItem(LS_KEY));
  return { url: url || null, anonKey: anonKey || null };
}

function getSupabase() {
  const { url, anonKey } = getConfig();
  if (!url || !anonKey) return null;
  return createClient(url, anonKey);
}

export function isSupabaseConfigured() {
  const { url, anonKey } = getConfig();
  return !!(url && anonKey);
}

export function setSupabaseConfig(url, anonKey) {
  if (typeof localStorage === 'undefined') return;
  if (url) localStorage.setItem(LS_URL, url.trim());
  if (anonKey) localStorage.setItem(LS_KEY, anonKey.trim());
}

export function clearSupabaseConfig() {
  if (typeof localStorage === 'undefined') return;
  localStorage.removeItem(LS_URL);
  localStorage.removeItem(LS_KEY);
}

export function getStoredSupabaseConfig() {
  if (typeof localStorage === 'undefined') return { url: '', anonKey: '' };
  return {
    url: localStorage.getItem(LS_URL) || '',
    anonKey: localStorage.getItem(LS_KEY) || '',
  };
}

export function initSupabaseStorage() {
  const supabase = getSupabase();
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
