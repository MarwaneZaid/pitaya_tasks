import React, { useState } from 'react';
import { ChefHat, Store, Lock, AlertCircle, Loader2 } from 'lucide-react';
import { supabase } from '../lib/storage-supabase';
import { createRestaurant } from '../lib/db';

// Domaine utilisé en interne par Supabase (l'utilisateur ne saisit jamais d'email)
const AUTH_DOMAIN = 'dailydo.app';
const AUTH_DOMAIN_LEGACY = 'restaurant.dailydo.app';

function slugFromRestaurantName(name) {
  return name
    .toLowerCase()
    .trim()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '') || 'restaurant';
}

function emailFromRestaurantName(name, domain = AUTH_DOMAIN) {
  return `${slugFromRestaurantName(name)}@${domain}`;
}

export default function LoginScreen({ onEnter }) {
  const [isLogin, setIsLogin] = useState(true);
  const [restaurantName, setRestaurantName] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const name = restaurantName.trim();
    if (!name || !password) return;

    setLoading(true);
    setError(null);

    try {
      if (!supabase) {
        throw new Error("Supabase n'est pas configuré. Vérifiez les variables d'environnement.");
      }

      const email = emailFromRestaurantName(name);

      if (isLogin) {
        let signInError = (await supabase.auth.signInWithPassword({ email, password })).error;
        if (signInError?.message?.includes('Invalid login credentials')) {
          const emailLegacy = emailFromRestaurantName(name, AUTH_DOMAIN_LEGACY);
          signInError = (await supabase.auth.signInWithPassword({ email: emailLegacy, password })).error;
        }
        if (signInError) throw signInError;
      } else {
        const { error: signUpError } = await supabase.auth.signUp({
          email,
          password,
        });
        if (signUpError) {
          if (signUpError.message?.includes('already registered') || signUpError.message?.includes('already exists')) {
            setError('Un restaurant avec ce nom existe déjà. Connectez-vous avec votre mot de passe.');
            return;
          }
          throw signUpError;
        }
        await createRestaurant(name);
      }

      onEnter();
    } catch (err) {
      console.error(err);
      const msg = err.message || '';
      if (msg.includes('rate limit') || msg.includes('rate_limit')) {
        setError('Trop de tentatives. Réessayez dans quelques minutes, ou désactivez la confirmation email dans Supabase (Auth → Emails).');
      } else {
        setError(msg || "Une erreur est survenue");
      }
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
            <h1 className="text-2xl font-bold text-slate-800">DailyDo</h1>
            <p className="text-slate-500 text-sm mt-1">Tableau de bord partagé</p>
          </div>

          {error && (
            <div className="mb-6 bg-red-50 text-red-600 p-4 rounded-xl flex items-start gap-3 text-sm">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
              <p>{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Nom du restaurant</label>
              <div className="relative">
                <Store className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type="text"
                  required
                  placeholder="Ex: Pitaya Lyon"
                  value={restaurantName}
                  onChange={(e) => setRestaurantName(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500 text-slate-800"
                  autoComplete="organization"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Mot de passe</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type="password"
                  required
                  minLength={6}
                  placeholder="6 caractères min"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500 text-slate-800"
                  autoComplete={isLogin ? 'current-password' : 'new-password'}
                />
              </div>
              <p className="mt-1 text-xs text-slate-500">6 caractères minimum (requis par Supabase)</p>
            </div>

            <button
              type="submit"
              disabled={loading || !restaurantName.trim() || password.length < 6}
              className="w-full py-3 px-4 flex items-center justify-center gap-2 bg-amber-500 hover:bg-amber-600 text-white font-semibold rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed mt-6"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : isLogin ? (
                'Se connecter'
              ) : (
                "Créer mon espace"
              )}
            </button>
          </form>

          <div className="mt-6 text-center">
            <button
              type="button"
              onClick={() => { setIsLogin(!isLogin); setError(null); }}
              className="text-sm text-slate-500 hover:text-amber-600 font-medium"
            >
              {isLogin ? "Nouveau restaurant ? Créer mon espace" : "Déjà un espace ? Se connecter"}
            </button>
          </div>

          <p className="mt-8 text-xs text-slate-400 text-center">
            Une gestion centralisée pour toutes vos équipes.
          </p>
        </div>
      </div>
    </div>
  );
}
