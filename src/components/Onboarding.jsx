import React, { useState, useEffect } from 'react';
import { ChefHat, Loader2, Store, LogIn, Building2 } from 'lucide-react';
import { createRestaurant, joinRestaurantByCode } from '../lib/db';
import { getSupabase } from '../lib/storage-supabase';
import { DEFAULT_SITE_NAME } from '../config/constants';

export default function Onboarding({ onComplete, defaultName = '' }) {
  const [mode, setMode] = useState('create'); // 'create' | 'join'
  const [restoName, setRestoName] = useState(defaultName);
  const [joinCode, setJoinCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Réchauffer la connexion Supabase dès l'affichage pour accélérer la création
  useEffect(() => {
    const client = getSupabase();
    if (client) client.auth.getSession().catch(() => {});
  }, []);

  // Sync le nom par défaut si fourni après montage
  useEffect(() => {
    if (defaultName && !restoName) setRestoName(defaultName);
  }, [defaultName]);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!restoName.trim()) return;
    setLoading(true);
    setError(null);
    try {
      await createRestaurant(restoName.trim());
      onComplete();
    } catch (err) {
      console.error(err);
      setError(err.message || 'Impossible de créer le restaurant.');
    } finally {
      setLoading(false);
    }
  };

  const handleJoin = async (e) => {
    e.preventDefault();
    if (!joinCode.trim()) return;
    setLoading(true);
    setError(null);
    try {
      await joinRestaurantByCode(joinCode.trim().toUpperCase());
      onComplete();
    } catch (err) {
      console.error(err);
      setError(err.message || "Code invalide. Vérifiez auprès de votre gérant.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-amber-500 text-white mb-3 shadow-lg">
            <ChefHat className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-bold text-white">DailyDo</h1>
          <p className="text-slate-400 text-sm mt-1">Gestion d'équipe pour restaurants</p>
        </div>

        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          {/* Toggle tabs */}
          <div className="flex border-b border-slate-200">
            <button
              onClick={() => { setMode('create'); setError(null); }}
              className={`flex-1 py-4 flex items-center justify-center gap-2 text-sm font-semibold transition-colors ${
                mode === 'create'
                  ? 'text-amber-600 border-b-2 border-amber-500 bg-amber-50'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <Building2 className="w-4 h-4" />
              Créer mon restaurant
            </button>
            <button
              onClick={() => { setMode('join'); setError(null); }}
              className={`flex-1 py-4 flex items-center justify-center gap-2 text-sm font-semibold transition-colors ${
                mode === 'join'
                  ? 'text-blue-600 border-b-2 border-blue-500 bg-blue-50'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <LogIn className="w-4 h-4" />
              Rejoindre une équipe
            </button>
          </div>

          <div className="p-8">
            {error && (
              <div className="mb-5 bg-red-50 text-red-600 p-4 rounded-xl text-sm border border-red-200">
                {error}
              </div>
            )}

            {/* Mode : Créer */}
            {mode === 'create' && (
              <form onSubmit={handleCreate} className="space-y-6">
                <div>
                  <p className="text-slate-500 text-sm mb-5">
                    Vous êtes gérant ou manager ? Créez l'espace de votre établissement. Votre équipe pourra ensuite vous rejoindre avec un code.
                  </p>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Nom de votre restaurant
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
                      autoFocus={mode === 'create'}
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
                      Création en cours…
                    </>
                  ) : (
                    'Créer mon espace'
                  )}
                </button>
                {loading && (
                  <p className="text-center text-sm text-slate-400">Cela peut prendre 10 à 15 secondes.</p>
                )}
              </form>
            )}

            {/* Mode : Rejoindre */}
            {mode === 'join' && (
              <form onSubmit={handleJoin} className="space-y-6">
                <div>
                  <p className="text-slate-500 text-sm mb-5">
                    Votre gérant vous a donné un code à 8 caractères ? Entrez-le ici pour rejoindre son équipe automatiquement.
                  </p>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Code d'invitation
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: A1B2C3D4"
                    value={joinCode}
                    onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                    maxLength={8}
                    className="w-full px-4 py-3 border border-slate-300 rounded-xl text-center text-2xl font-mono tracking-widest text-slate-800 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 uppercase"
                    autoFocus={mode === 'join'}
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading || joinCode.trim().length < 6}
                  className="w-full py-3 px-4 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Connexion en cours…
                    </>
                  ) : (
                    <>
                      <LogIn className="w-5 h-5" />
                      Rejoindre l'équipe
                    </>
                  )}
                </button>
              </form>
            )}
          </div>
        </div>

        <p className="text-center text-slate-500 text-xs mt-5">
          Vos données sont sécurisées et isolées par restaurant.
        </p>
      </div>
    </div>
  );
}
