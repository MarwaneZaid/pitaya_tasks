import React, { useState, useRef } from 'react';
import { ChefHat, Store, Lock, AlertCircle, Loader2, Users, Building2, KeyRound } from 'lucide-react';
import { supabase } from '../lib/storage-supabase';
import { enterTeamWithInviteCode, clearRestaurantCache } from '../lib/db';
import { APP_PUBLIC_ORIGIN } from '../config/constants';
import {
  AUTH_DOMAIN,
  AUTH_DOMAIN_LEGACY,
  emailFromRestaurantName,
  readPreferredAuthDomain,
  savePreferredAuthDomain,
  readLastAuthEmail,
  saveLastAuthEmail,
  slugFromRestaurantName,
  domainFromEmail,
} from '../lib/authPrefs';

/** Délai max par tentative Auth (sign-in / sign-up). Les appels peuvent être longs (TLS, mobile, proxy). */
const AUTH_SIGNIN_ATTEMPT_MS = 120000;
/** Inscription : même ordre de grandeur. */
const AUTH_SIGNUP_ATTEMPT_MS = 120000;

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
  if (
    normalized.includes('email signups are disabled') ||
    normalized.includes('signup_disabled') ||
    normalized.includes('signups not allowed')
  ) {
    return 'Les inscriptions par e-mail sont désactivées sur ce projet Supabase. Dashboard → Authentication → désactivez uniquement si voulu ; sinon activez « Allow new users to sign up », enregistrez, puis réessayez.';
  }
  if (
    normalized.includes('anonymous') &&
    (normalized.includes('disabled') || normalized.includes('not enabled'))
  ) {
    return 'Connexion équipe indisponible : activez le fournisseur Anonymous dans Supabase (Authentication → Providers).';
  }
  if (normalized.includes('invalid refresh token') || normalized.includes('refresh token not found')) {
    return 'Session expirée ou invalide. Rechargez la page ; si le message revient, déconnectez-vous ou videz le stockage du site pour ce domaine (localhost).';
  }
  if (normalized.includes('connexion trop lente') || normalized.includes('délai dépassé')) {
    return 'Le serveur d’authentification met trop longtemps à répondre. Vérifiez la connexion, un VPN ou un pare-feu, l’URL du projet Supabase dans .env, puis réessayez. Si le problème continue, ouvrez le dashboard Supabase pour vérifier que le projet est actif.';
  }
  if (normalized.includes('aborted') || normalized.includes('abort')) {
    return 'Connexion interrompue. Réessayez une fois.';
  }
  return raw || "Une erreur est survenue";
}

async function withTimeout(
  promise,
  message = 'Délai dépassé. Vérifiez votre connexion.',
  timeoutMs = AUTH_SIGNIN_ATTEMPT_MS
) {
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

async function signInRememberedEmailFirst(name, userPassword) {
  const stored = readLastAuthEmail();
  if (!stored || !stored.includes('@')) return 'fallback';

  const inputSlug = slugFromRestaurantName(name);
  const storedLocal = stored.split('@')[0].toLowerCase();
  if (storedLocal !== inputSlug) return 'fallback';

  try {
    const { data, error } = await withTimeout(
      supabase.auth.signInWithPassword({ email: stored, password: userPassword }),
      'Connexion trop lente. Réessayez dans quelques secondes.',
      AUTH_SIGNIN_ATTEMPT_MS
    );
    if (!error) {
      const em = data?.session?.user?.email || data?.user?.email;
      if (em) saveLastAuthEmail(em);
      const d = domainFromEmail(em || stored);
      if (d === AUTH_DOMAIN || d === AUTH_DOMAIN_LEGACY) savePreferredAuthDomain(d);
      return 'ok';
    }
    if (isInvalidCredentialsError(error)) return 'invalid';
    return 'fallback';
  } catch (e) {
    if (isInvalidCredentialsError(e)) return 'invalid';
    const msg = (e?.message || '').toLowerCase();
    if (msg.includes('connexion trop lente')) return 'fallback';
    throw e;
  }
}

async function signInWithFallbackDomains(name, userPassword) {
  const preferred = readPreferredAuthDomain();
  const secondary = preferred === AUTH_DOMAIN ? AUTH_DOMAIN_LEGACY : AUTH_DOMAIN;
  const attempts = [preferred, secondary];

  let lastError = null;

  for (const domain of attempts) {
    const email = emailFromRestaurantName(name, domain);
    const { data, error: signInError } = await withTimeout(
      supabase.auth.signInWithPassword({ email, password: userPassword }),
      'Connexion trop lente. Réessayez dans quelques secondes.',
      AUTH_SIGNIN_ATTEMPT_MS
    );
    if (!signInError) {
      savePreferredAuthDomain(domain);
      const em = data?.session?.user?.email || data?.user?.email;
      if (em) saveLastAuthEmail(em);
      return;
    }
    lastError = signInError;
    if (!isInvalidCredentialsError(signInError)) {
      throw signInError;
    }
  }

  if (lastError) throw lastError;
}

async function runLoginWithRememberedFirst(name, userPassword) {
  const remembered = await signInRememberedEmailFirst(name, userPassword);
  if (remembered === 'ok') return;
  if (remembered === 'invalid') {
    throw new Error('Invalid login credentials');
  }
  await signInWithFallbackDomains(name, userPassword);
}

/** Connexion gérant (nom + mot de passe). Équipe : code seul via enterTeamWithInviteCode. */
export default function LoginScreen({ onEnter }) {
  const [flow, setFlow] = useState('owner');
  const [isLogin, setIsLogin] = useState(true);
  const [identifier, setIdentifier] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const submitInFlightRef = useRef(false);

  const handleMemberCodeSubmit = async (e) => {
    e.preventDefault();
    const code = inviteCode.trim().toUpperCase();
    if (code.length < 8 || submitInFlightRef.current) return;

    submitInFlightRef.current = true;
    setLoading(true);
    setError(null);

    try {
      if (!supabase) {
        throw new Error("Supabase n'est pas configuré. Vérifiez les variables d'environnement.");
      }
      await withTimeout(
        enterTeamWithInviteCode(code),
        'Connexion trop lente. Vérifiez votre connexion et réessayez.',
        AUTH_SIGNIN_ATTEMPT_MS
      );
      clearRestaurantCache();
      await onEnter();
    } catch (err) {
      console.error(err);
      setError(mapAuthErrorMessage(err));
    } finally {
      submitInFlightRef.current = false;
      setLoading(false);
    }
  };

  const handleOwnerSubmit = async (e) => {
    e.preventDefault();
    const name = identifier.trim();
    if (!name || !password || submitInFlightRef.current) return;

    submitInFlightRef.current = true;
    setLoading(true);
    setError(null);

    let shouldEnter = false;
    try {
      if (!supabase) {
        throw new Error("Supabase n'est pas configuré. Vérifiez les variables d'environnement.");
      }

      if (isLogin) {
        await runLoginWithRememberedFirst(name, password);
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
          'Création du compte trop lente. Vérifiez votre connexion et réessayez.',
          AUTH_SIGNUP_ATTEMPT_MS
        );
        if (signUpError) {
          if (signUpError.message?.includes('already registered') || signUpError.message?.includes('already exists')) {
            setError('Un restaurant avec ce nom existe déjà. Connectez-vous avec votre mot de passe.');
            return;
          }
          throw signUpError;
        }
        savePreferredAuthDomain(AUTH_DOMAIN);
        const suEmail = signUpData?.session?.user?.email || signUpData?.user?.email;
        if (suEmail) saveLastAuthEmail(suEmail);
        if (!signUpData.session) {
          setError('Vérifiez votre boîte mail : ouvrez le lien de confirmation, puis reconnectez-vous.');
          return;
        }
        shouldEnter = true;
      }
    } catch (err) {
      console.error(err);
      const msg = (err?.message || '').toLowerCase();
      if (msg.includes('rate limit') || msg.includes('rate_limit')) {
        setError('Trop de tentatives. Réessayez dans quelques minutes.');
      } else if (isInvalidCredentialsError(err)) {
        setError('Identifiant ou mot de passe incorrect.');
      } else {
        setError(mapAuthErrorMessage(err));
      }
    } finally {
      submitInFlightRef.current = false;
      setLoading(false);
    }

    if (shouldEnter) await onEnter();
  };

  const switchFlow = (next) => {
    setFlow(next);
    setError(null);
    setInviteCode('');
    setIdentifier('');
    setPassword('');
    setIsLogin(true);
  };

  const ownerSubmitDisabled = loading || !identifier.trim() || password.length < 6;
  const memberSubmitDisabled = loading || inviteCode.trim().length < 8;

  return (
    <div id="app-main" className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-amber-500 text-white mb-4">
              <ChefHat className="w-8 h-8" />
            </div>
            <h1 className="text-2xl font-bold text-slate-800">DailyDo</h1>
            <p className="text-slate-500 text-sm mt-1">Tableau de bord partagé</p>
          </div>

          <div className="flex rounded-xl border border-slate-200 p-1 mb-6 bg-slate-50">
            <button
              type="button"
              onClick={() => switchFlow('owner')}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-semibold rounded-lg transition-colors ${
                flow === 'owner' ? 'bg-white text-amber-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <Building2 className="w-4 h-4 shrink-0" />
              Gérant
            </button>
            <button
              type="button"
              onClick={() => switchFlow('member')}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-semibold rounded-lg transition-colors ${
                flow === 'member' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <Users className="w-4 h-4 shrink-0" />
              Équipe
            </button>
          </div>

          {error && (
            <div className="mb-6 bg-red-50 text-red-600 p-4 rounded-xl flex items-start gap-3 text-sm">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
              <p>{error}</p>
            </div>
          )}

          {flow === 'member' ? (
            <>
              <p className="text-sm text-slate-600 mb-4 leading-relaxed">
                Saisissez le <strong>code à 8 caractères</strong> affiché par votre gérant (Équipe → Inviter).
                Aucun mot de passe : sur cet appareil, vous resterez connecté automatiquement.
              </p>
              <form onSubmit={handleMemberCodeSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Code d’invitation</label>
                  <div className="relative">
                    <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <input
                      type="text"
                      required
                      placeholder="Ex: A1B2C3D4"
                      value={inviteCode}
                      onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                      maxLength={8}
                      className="w-full pl-10 pr-4 py-3 border border-slate-300 rounded-xl text-center text-xl font-mono tracking-widest text-slate-800 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 uppercase"
                      autoComplete="off"
                      inputMode="text"
                    />
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={memberSubmitDisabled}
                  className="w-full py-3 px-4 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Rejoindre l’équipe'}
                </button>
              </form>
            </>
          ) : (
            <form onSubmit={handleOwnerSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  {isLogin ? 'Nom du restaurant' : 'Nom de votre restaurant'}
                </label>
                <div className="relative">
                  <Store className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input
                    type="text"
                    required
                    placeholder="Ex: Pitaya Lyon"
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
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
                <p className="mt-1 text-xs text-slate-500">6 caractères minimum</p>
              </div>
              <button
                type="submit"
                disabled={ownerSubmitDisabled}
                className="w-full py-3 px-4 flex items-center justify-center gap-2 bg-amber-500 hover:bg-amber-600 text-white font-semibold rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed mt-2"
              >
                {loading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : isLogin ? (
                  'Se connecter'
                ) : (
                  'Continuer →'
                )}
              </button>
              <div className="text-center pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsLogin(!isLogin);
                    setError(null);
                  }}
                  className="text-sm text-slate-500 hover:text-amber-600 font-medium"
                >
                  {isLogin ? 'Nouveau restaurant ? Créer mon espace' : 'Déjà un espace ? Se connecter'}
                </button>
              </div>
            </form>
          )}

          <p className="mt-8 text-xs text-slate-400 text-center">
            {APP_PUBLIC_ORIGIN.replace(/^https?:\/\//, '')} — gestion centralisée pour vos équipes.
          </p>
        </div>
      </div>
    </div>
  );
}