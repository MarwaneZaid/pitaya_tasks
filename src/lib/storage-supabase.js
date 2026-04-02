/**
 * Stockage partagé via Supabase : synchronisation entre tous les managers (téléphones inclus).
 * Config : variables d'environnement (SaaS / Vercel) OU saisie dans l'app (localStorage).
 * Priorité : VITE_SUPABASE_* valides > localStorage — un déploiement central impose toujours le même projet.
 */
import { createClient } from '@supabase/supabase-js';

const LS_URL_KEY = 'dailydo_supabase_url';
const LS_KEY_KEY = 'dailydo_supabase_anon_key';

function readEmbeddedEnv() {
  const url = import.meta.env.VITE_SUPABASE_URL;
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
  if (!url || !anonKey || String(anonKey).startsWith('REMPLACER')) return null;
  return { url, anonKey };
}

/** True quand URL + clé anon sont fournies au build (ex. Vercel) : pas d'écran « coller les clés ». */
export function isSupabaseEmbeddedInBuild() {
  return readEmbeddedEnv() !== null;
}

function getConfig() {
  const embedded = readEmbeddedEnv();
  if (embedded) return embedded;

  try {
    const lsUrl = localStorage.getItem(LS_URL_KEY);
    const lsKey = localStorage.getItem(LS_KEY_KEY);
    if (lsUrl && lsKey) return { url: lsUrl, anonKey: lsKey };
  } catch (_) {}

  return { url: null, anonKey: null };
}

export let supabase = null;

export function getSupabase() {
  if (supabase) return supabase;
  try {
    const { url, anonKey } = getConfig();
    if (!url || !anonKey || String(anonKey).startsWith('REMPLACER')) return null;
    supabase = createClient(url, anonKey, {
      auth: { persistSession: true, autoRefreshToken: true },
    });
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

/** Alias explicite : utilisé par App.jsx pour décider d'afficher le SetupScreen */
export function hasSupabaseCredentials() {
  return isSupabaseConfigured();
}

/**
 * Sauvegarde les credentials Supabase dans le localStorage et réinitialise le client.
 */
export function saveSupabaseCredentials(url, anonKey) {
  if (isSupabaseEmbeddedInBuild()) {
    supabase = null;
    return getSupabase();
  }
  localStorage.setItem(LS_URL_KEY, url.trim());
  localStorage.setItem(LS_KEY_KEY, anonKey.trim());
  supabase = null; // Force la réinitialisation du client
  return getSupabase();
}

/**
 * Supprime les credentials du localStorage (pour reconfigurer).
 */
export function clearSupabaseCredentials() {
  localStorage.removeItem(LS_URL_KEY);
  localStorage.removeItem(LS_KEY_KEY);
  supabase = null;
}

/**
 * Teste une connexion Supabase avec les credentials fournis, sans les sauvegarder.
 * Retourne { ok: true } ou { ok: false, error: string }
 */
export async function testSupabaseConnection(url, anonKey) {
  try {
    const testClient = createClient(url.trim(), anonKey.trim());
    const { error } = await testClient.auth.getSession();
    if (error && !error.message?.includes('session')) {
      return { ok: false, error: error.message };
    }
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e.message || 'Connexion impossible. Vérifiez l\'URL et la clé.' };
  }
}

/**
 * Compatibilité avec main.jsx — ne fait plus rien car le client s'initialise
 * automatiquement via getSupabase() au chargement du module.
 */
export function initSupabaseStorage() {
  getSupabase();
}

// Initialisation automatique au chargement du module
getSupabase();
