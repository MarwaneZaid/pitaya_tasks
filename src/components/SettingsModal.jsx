import React from 'react';
import {
  isSupabaseConfigured,
  setSupabaseConfig,
  getStoredSupabaseConfig,
  clearSupabaseConfig,
  initSupabaseStorage,
} from '../lib/storage-supabase';

export default function SettingsModal({ isOpen, onClose, supabaseUrl, setSupabaseUrl, supabaseKey, setSupabaseKey }) {
  if (!isOpen) return null;

  const handleSave = () => {
    setSupabaseConfig(supabaseUrl, supabaseKey);
    initSupabaseStorage();
    setTimeout(() => window.location.reload(), 600);
  };

  const handleClear = () => {
    clearSupabaseConfig();
    setTimeout(() => window.location.reload(), 400);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-lg font-bold text-slate-800 mb-1">Synchronisation équipe</h3>
        <p className="text-sm text-slate-500 mb-4">
          Configurez Supabase une fois pour que tous les managers voient les mêmes tâches sur leur téléphone.
        </p>
        {isSupabaseConfigured() && (
          <p className="text-sm text-emerald-600 font-medium mb-3">Synchronisation active</p>
        )}
        <div className="space-y-3 mb-4">
          <label className="block text-sm font-medium text-slate-700">URL Supabase</label>
          <input
            type="url"
            placeholder="https://xxxxx.supabase.co"
            value={supabaseUrl}
            onChange={(e) => setSupabaseUrl(e.target.value)}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-800"
          />
          <label className="block text-sm font-medium text-slate-700">Clé anon (publique)</label>
          <input
            type="password"
            placeholder="eyJhbGciOi..."
            value={supabaseKey}
            onChange={(e) => setSupabaseKey(e.target.value)}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-800"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={handleSave}
            disabled={!supabaseUrl.trim() || !supabaseKey.trim()}
            className="px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 disabled:opacity-50 text-sm font-medium"
          >
            Enregistrer
          </button>
          {isSupabaseConfigured() && (
            <button onClick={handleClear} className="px-4 py-2 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 text-sm">
              Désactiver
            </button>
          )}
          <button onClick={onClose} className="px-4 py-2 text-slate-600 text-sm">
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
}
