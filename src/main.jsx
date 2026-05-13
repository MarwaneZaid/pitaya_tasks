import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { initSupabaseStorage, isSupabaseConfigured } from './lib/storage-supabase.js';
import './lib/storage-polyfill.js';
import './index.css';
import App from './App.jsx';
import { ToastProvider } from './context/ToastContext.jsx';

/** Réduit la latence TLS/DNS au premier appel Auth / PostgREST. */
function ensureSupabasePreconnect() {
  const url = import.meta.env.VITE_SUPABASE_URL;
  if (!url || typeof document === 'undefined') return;
  try {
    const origin = new URL(url).origin;
    const id = 'dailydo-preconnect-supabase';
    if (document.getElementById(id)) return;
    const link = document.createElement('link');
    link.id = id;
    link.rel = 'preconnect';
    link.href = origin;
    link.crossOrigin = 'anonymous';
    document.head.appendChild(link);
    const dns = document.createElement('link');
    dns.rel = 'dns-prefetch';
    dns.href = origin;
    document.head.appendChild(dns);
  } catch (_) {}
}
ensureSupabasePreconnect();

// Données partagées : Supabase = tous les managers (téléphones inclus) ; sinon localStorage = même appareil
try {
  if (isSupabaseConfigured()) {
    initSupabaseStorage();
  }
} catch (e) {
  console.error('Storage init error:', e);
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ToastProvider>
      <App />
    </ToastProvider>
  </StrictMode>
);
