/**
 * Polyfill pour window.storage (API type Glide/Bubble).
 * Utilise localStorage. Remplacé par Supabase si VITE_SUPABASE_URL est défini (main.jsx).
 */
const PREFIX_SHARED = 'shared_';

function getKey(key, isShared) {
  return isShared ? PREFIX_SHARED + key : key;
}

window.storage = {
  async get(key, isShared = false) {
    const k = getKey(key, isShared);
    const value = localStorage.getItem(k);
    return { value };
  },
  async set(key, value, isShared = false) {
    const k = getKey(key, isShared);
    localStorage.setItem(k, typeof value === 'string' ? value : JSON.stringify(value));
  },
  async delete(key, isShared = false) {
    const k = getKey(key, isShared);
    localStorage.removeItem(k);
  },
};
