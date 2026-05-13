/** Préférences locales pour accélérer la connexion (domaine e-mail + dernier e-mail Auth réussi). */

export const AUTH_DOMAIN = 'dailydo.app';
export const AUTH_DOMAIN_LEGACY = 'restaurant.dailydo.app';
export const AUTH_DOMAIN_PREF_KEY = 'dailydo_auth_domain_pref';
export const LAST_AUTH_EMAIL_KEY = 'dailydo_last_auth_email';

export function slugFromRestaurantName(name) {
  return name
    .toLowerCase()
    .trim()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '') || 'restaurant';
}

export function emailFromRestaurantName(name, domain = AUTH_DOMAIN) {
  return `${slugFromRestaurantName(name)}@${domain}`;
}

export function readPreferredAuthDomain() {
  try {
    const value = localStorage.getItem(AUTH_DOMAIN_PREF_KEY);
    if (value === AUTH_DOMAIN || value === AUTH_DOMAIN_LEGACY) return value;
  } catch (_) {}
  return AUTH_DOMAIN;
}

export function savePreferredAuthDomain(domain) {
  try {
    localStorage.setItem(AUTH_DOMAIN_PREF_KEY, domain);
  } catch (_) {}
}

export function readLastAuthEmail() {
  try {
    const v = localStorage.getItem(LAST_AUTH_EMAIL_KEY);
    if (v && v.includes('@') && v.length > 5) return v.trim();
  } catch (_) {}
  return null;
}

export function saveLastAuthEmail(email) {
  if (!email || !String(email).includes('@')) return;
  try {
    localStorage.setItem(LAST_AUTH_EMAIL_KEY, String(email).trim().toLowerCase());
  } catch (_) {}
}

export function clearLastAuthEmail() {
  try {
    localStorage.removeItem(LAST_AUTH_EMAIL_KEY);
  } catch (_) {}
}

export function domainFromEmail(email) {
  const s = String(email);
  const i = s.lastIndexOf('@');
  if (i < 0 || i === s.length - 1) return '';
  return s.slice(i + 1).toLowerCase();
}
