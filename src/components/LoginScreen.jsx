import React, { useState } from 'react';
import { ChefHat, Mail, Lock, AlertCircle, Loader2 } from 'lucide-react';
import { supabase } from '../lib/storage-supabase';
import { DEFAULT_SITE_NAME } from '../config/constants';

export default function LoginScreen({ onEnter }) {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) return;
    
    setLoading(true);
    setError(null);

    try {
      if (!supabase) {
        throw new Error("Supabase n'est pas configuré. Veuillez vérifier les variables d'environnement.");
      }

      if (isLogin) {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (signInError) throw signInError;
      } else {
        const { error: signUpError } = await supabase.auth.signUp({
          email,
          password,
        });
        if (signUpError) throw signUpError;
        
        // Optionnel : si on veut autologin ou afficher un message de vérification email
        alert("Compte créé ! (S'il y a une confirmation par email activée, veuillez vérifier vos mails)");
      }
      
      onEnter(); // Recharger ou notifier Dashboard que l'utilisateur est connecté
    } catch (err) {
      console.error(err);
      setError(err.message || "Une erreur est survenue");
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
            <p className="text-slate-500 text-sm mt-1">Tableau de bord partagé · {DEFAULT_SITE_NAME}</p>
          </div>

          {error && (
            <div className="mb-6 bg-red-50 text-red-600 p-4 rounded-xl flex items-start gap-3 text-sm">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
              <p>{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Adresse Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type="email"
                  required
                  placeholder="nom@restaurant.fr"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500 text-slate-800"
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
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500 text-slate-800"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || !email || !password}
              className="w-full py-3 px-4 flex items-center justify-center gap-2 bg-amber-500 hover:bg-amber-600 text-white font-semibold rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed mt-6"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : isLogin ? "Se connecter" : "Créer mon compte"}
            </button>
          </form>

          <div className="mt-6 text-center">
            <button
              onClick={() => setIsLogin(!isLogin)}
              className="text-sm text-slate-500 hover:text-amber-600 font-medium"
            >
              {isLogin ? "Nouveau restaurant ? S'inscrire" : "Déjà un compte ? Se connecter"}
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
