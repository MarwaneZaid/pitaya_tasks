import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { initSupabaseStorage, isSupabaseConfigured } from './lib/storage-supabase.js';
import './lib/storage-polyfill.js';
import './index.css';
import App from './App.jsx';

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
    <App />
  </StrictMode>
);
