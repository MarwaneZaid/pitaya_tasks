import React, { useState } from 'react';
import { ChefHat, Loader2, Store } from 'lucide-react';
import { createRestaurant } from '../lib/db';
import { DEFAULT_SITE_NAME } from '../config/constants';

export default function Onboarding({ onComplete }) {
  const [restoName, setRestoName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!restoName.trim()) return;
    
    setLoading(true);
    setError(null);

    try {
      await createRestaurant(restoName.trim());
      onComplete(); // Signale au Dashboard qu'on a un resto !
    } catch (err) {
      console.error(err);
      setError(err.message || "Impossible de créer le restaurant.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-amber-500 text-white mb-4">
              <ChefHat className="w-8 h-8" />
            </div>
            <h1 className="text-2xl font-bold text-slate-800">Bienvenue sur DailyDo</h1>
            <p className="text-slate-500 text-sm mt-2">
              Pour commencer, veuillez créer l'espace de votre établissement.
            </p>
          </div>

          {error && (
            <div className="mb-6 bg-red-50 text-red-600 p-4 rounded-xl text-sm">
              <p>{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Nom de votre Restaurant
              </label>
              <div className="relative">
                <Store className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type="text"
                  required
                  placeholder={`Ex: ${DEFAULT_SITE_NAME}`}
                  value={restoName}
                  onChange={(e) => setRestoName(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500 text-slate-800"
                  autoFocus
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || !restoName.trim()}
              className="w-full py-3 px-4 flex items-center justify-center gap-2 bg-amber-500 hover:bg-amber-600 text-white font-semibold rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Création en cours...
                </>
              ) : (
                "Créer mon espace"
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
