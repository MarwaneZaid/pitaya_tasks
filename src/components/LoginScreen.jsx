import React, { useState } from 'react';
import { ChefHat, Store, Lock, AlertCircle, Loader2, Users, Building2 } from 'lucide-react';
import { supabase } from '../lib/storage-supabase';
import { joinRestaurantByCode } from '../lib/db';

// Domaine utilisé en interne par Supabase (l'utilisateur ne saisit jamais d'email)
const AUTH_DOMAIN = 'dailydo.app';
const AUTH_DOMAIN_LEGACY = 'restaurant.dailydo.app';
const AUTH_DOMAIN_PREF_KEY = 'dailydo_auth_domain_pref';
const AUTH_TIMEOUT_MS = 12000;

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

function readPreferredAuthDomain() {
  try {
    const value = localStorage.getItem(AUTH_DOMAIN_PREF_KEY);
    if (value === AUTH_DOMAIN || value === AUTH_DOMAIN_LEGACY) return value;
  } catch (_) {}
  return AUTH_DOMAIN;
}

function savePreferredAuthDomain(domain) {
  try {
    localStorage.setItem(AUTH_DOMAIN_PREF_KEY, domain);
  } catch (_) {}
}

function isInvalidCredentialsError(error) {
  const msg = error?.message || '';
  return msg.includes('Invalid login credentials') || msg.includes('invalid_credentials');
}

function mapAuthErrorMessage(error) {
  const raw = error?.message || String(error || '');
  const normalized = raw.toLowerCase();
  if (
    normalized.includes('failed to fetch') ||
    normalized.includes('load failed') ||
    normalized.includes('networkerror') ||
    normalized.includes('network request failed')
  ) {
    return "Connexion au serveur impossible. Vérifiez Internet, l'URL Supabase et la clé anon, puis réessayez.";
  }
  return raw || "Une erreur est survenue";
}

async function withTimeout(promise, message = 'Délai dépassé. Vérifiez votre connexion.', timeoutMs = AUTH_TIMEOUT_MS) {
  let timeoutId;
  try {
    return await Promise.race([
      promise,
      new Promise((_, reject) => {
        timeoutId = setTimeout(() => reject(new Error(message)), timeoutMs);
      }),
    ]);
  } finally {
    clearTimeout(timeoutId);
  }
}

/** Connexion : gérant qui crée l'espace, ou membre qui se connecte avec son identifiant + code (première fois). */
export default function LoginScreen({ onEnter }) {
  /** owner = gérant (nom du restaurant) ; member = équipe (identifiant perso + code à la 1re inscription) */
  const [flow, setFlow] = useState('owner');
  const [isLogin, setIsLogin] = useState(true);
  const [identifier, setIdentifier] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  React.useEffect(() => {
    if (!supabase) return;
    // Réchauffe la session Auth pour réduire la latence perçue du premier submit.
    supabase.auth.getSession().catch(() => {});
  }, []);

  const signInWithFallbackDomains = async (name, userPassword) => {
    const preferred = readPreferredAuthDomain();
    const secondary = preferred === AUTH_DOMAIN ? AUTH_DOMAIN_LEGACY : AUTH_DOMAIN;
    const attempts = [preferred, secondary];

    let lastError = null;
    for (const domain of attempts) {
      const email = emailFromRestaurantName(name, domain);
      const { error: signInError } = await withTimeout(
        supabase.auth.signInWithPassword({ email, password: userPassword }),
        'Connexion trop lente. Réessayez dans quelques secondes.'
      );
      if (!signInError) {
        savePreferredAuthDomain(domain);
        return;
      }
      lastError = signInError;
      if (!isInvalidCredentialsError(signInError)) {
        throw signInError;
      }
    }

    if (lastError) throw lastError;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const name = identifier.trim();
    if (!name || !password) return;
    if (flow === 'member' && !isLogin && inviteCode.trim().length < 8) return;

    setLoading(true);
    setError(null);

    let shouldEnter = false;
    try {
      if (!supabase) {
        throw new Error("Supabase n'est pas configuré. Vérifiez les variables d'environnement.");
      }

      if (flow === 'member') {
        if (isLogin) {
          await signInWithFallbackDomains(name, password);
          shouldEnter = true;
        } else {
          const code = inviteCode.trim().toUpperCase();
          const { data: signUpData, error: signUpError } = await withTimeout(
            supabase.auth.signUp({
              email: emailFromRestaurantName(name),
              password,
              options: {
                data: {
                  restaurant_name: '',
                  member_display_name: name,
                },
              },
            }),
            'Inscription trop lente. Vérifiez votre connexion et réessayez.'
          );
          if (signUpError) {
            if (signUpError.message?.includes('already registered') || signUpError.message?.includes('already exists')) {
              setError('Cet identifiant est déjà pris. Connectez-vous ou choisissez un autre identifiant.');
              return;
            }
            throw signUpError;
          }
          savePreferredAuthDomain(AUTH_DOMAIN);
          if (!signUpData.session) {
            setError('Vérifiez votre boîte mail : ouvrez le lien de confirmation, puis reconnectez-vous avec votre identifiant.');
            return;
          }
          try {
            await joinRestaurantByCode(code);
          } catch (joinErr) {
            await supabase.auth.signOut();
            throw joinErr;
          }
          shouldEnter = true;
        }
      } else if (isLogin) {
        await signInWithFallbackDomains(name, password);
        shouldEnter = true;
      } else {
        const { data: signUpData, error: signUpError } = await withTimeout(
          supabase.auth.signUp({
            email: emailFromRestaurantName(name),
            password,
            options: {
              data: { restaurant_name: name },
            },
          }),
          'Création du compte trop lente. Vérifiez votre connexion et réessayez.'
        );
        if (signUpError) {
          if (signUpError.message?.includes('already registered') || signUpError.message?.includes('already exists')) {
            setError('Un restaurant avec ce nom existe déjà. Connectez-vous avec votre mot de passe.');
            return;
          }
          throw signUpError;
        }
        savePreferredAuthDomain(AUTH_DOMAIN);
        if (!signUpData.session) {
          setError('Vérifiez votre boîte mail : ouvrez le lien de confirmation, puis reconnectez-vous.');
          return;
        }
        shouldEnter = true;
      }
    } catch (err) {
      console.error(err);
      const msg = err.message || '';
      if (msg.includes('rate limit') || msg.includes('rate_limit')) {
        setError('Trop de tentatives. Réessayez dans quelques minutes.');
      } else {
        setError(mapAuthErrorMessage(err));
      }
    } finally {
      setLoading(false);
    }

    if (shouldEnter) onEnter();
  };

  const switchFlow = (next) => {
    setFlow(next);
    setError(null);
    setInviteCode('');
  };

  const ownerLabel = isLogin ? 'Nom du restaurant' : 'Nom de votre restaurant';
  const memberLabel = isLogin ? 'Mon identifiant' : 'Choisissez un identifiant personnel';
  const idPlaceholder =
    flow === 'owner' ? 'Ex: Pitaya Lyon' : 'Ex: sophie-cuisine';

  const submitDisabled =
    loading ||
    !identifier.trim() ||
    password.length < 6 ||
    (flow === 'member' && !isLogin && inviteCode.trim().length < 8);

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-amber-500 text-white mb-4">
              <ChefHat className="w-8 h-8" />
            </div>
            <h1 className="text-2xl font-bold text-slate-800">DailyDo</h1>
            <p className="text-slate-500 text-sm mt-1">Tableau de bord partagé</p>
          </div>

          {/* Gérant vs membre */}
          <div className="flex rounded-xl border border-slate-200 p-1 mb-6 bg-slate-50">
            <button
              type="button"
              onClick={() => switchFlow('owner')}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-semibold rounded-lg transition-colors ${
                flow === 'owner' ? 'bg-white text-amber-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <Building2 className="w-4 h-4 shrink-0" />
              Gérant · créer l’espace
            </button>
            <button
              type="button"
              onClick={() => switchFlow('member')}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-semibold rounded-lg transition-colors ${
                flow === 'member' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <Users className="w-4 h-4 shrink-0" />
              Équipe · code
            </button>
          </div>

          {flow === 'member' && (
            <p className="text-xs text-slate-500 mb-4 leading-relaxed">
              Avec le code partagé par votre gérant : inscrivez-vous une première fois avec identifiant + code, puis
              reconnectez-vous plus tard avec seulement identifiant et mot de passe. Vous rejoignez en{' '}
              <strong>employé</strong> : cocher les tâches, pas la config du restaurant. Les droits manager / gérant sont
              réservés au gérant et aux comptes qu’il délègue.
            </p>
          )}

          {error && (
            <div className="mb-6 bg-red-50 text-red-600 p-4 rounded-xl flex items-start gap-3 text-sm">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
              <p>{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                {flow === 'owner' ? ownerLabel : memberLabel}
              </label>
              <div className="relative">
                <Store className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type="text"
                  required
                  placeholder={idPlaceholder}
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500 text-slate-800"
                  autoComplete={flow === 'member' ? 'username' : 'organization'}
                />
              </div>
            </div>

            {flow === 'member' && !isLogin && (
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Code d’invitation (8 caractères)</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: A1B2C3D4"
                  value={inviteCode}
                  onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                  maxLength={8}
                  className="w-full px-4 py-3 border border-slate-300 rounded-xl text-center text-xl font-mono tracking-widest text-slate-800 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 uppercase"
                  autoComplete="off"
                />
              </div>
            )}

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
              <p className="mt-1 text-xs text-slate-500">6 caractères minimum</p>
            </div>

            <button
              type="submit"
              disabled={submitDisabled}
              className="w-full py-3 px-4 flex items-center justify-center gap-2 bg-amber-500 hover:bg-amber-600 text-white font-semibold rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed mt-6"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : isLogin ? (
                'Se connecter'
              ) : flow === 'member' ? (
                'Créer mon accès et rejoindre'
              ) : (
                'Continuer →'
              )}
            </button>
          </form>

          <div className="mt-6 text-center">
            <button
              type="button"
              onClick={() => {
                setIsLogin(!isLogin);
                setError(null);
              }}
              className="text-sm text-slate-500 hover:text-amber-600 font-medium"
            >
              {isLogin
                ? flow === 'owner'
                  ? 'Nouveau restaurant ? Créer mon espace'
                  : 'Première connexion ? Créer mon accès avec le code'
                : flow === 'owner'
                  ? 'Déjà un espace ? Se connecter'
                  : 'Déjà un compte ? Se connecter'}
            </button>
          </div>

          <p className="mt-8 text-xs text-slate-400 text-center">
            dailydo.app — gestion centralisée pour vos équipes.
          </p>
        </div>
      </div>
    </div>
  );
}
