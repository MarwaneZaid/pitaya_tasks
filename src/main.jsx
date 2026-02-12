import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { initSupabaseStorage, isSupabaseConfigured } from './storage-supabase.js';
import './storage-polyfill';
import './index.css';
import App from './App.jsx';

// Données partagées : Supabase = tous les managers (téléphones inclus) ; sinon localStorage = même appareil
if (isSupabaseConfigured()) {
  initSupabaseStorage();
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>
);
