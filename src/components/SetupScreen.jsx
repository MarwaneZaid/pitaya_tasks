import React, { useState } from 'react';
import { ChefHat, Database, Eye, EyeOff, CheckCircle2, AlertCircle, Loader2, ExternalLink, ArrowRight, Key, Link } from 'lucide-react';
import { testSupabaseConnection, saveSupabaseCredentials } from '../lib/storage-supabase';

const STEPS = ['Bienvenue', 'Base de données', 'Connexion'];

export default function SetupScreen({ onComplete }) {
  const [step, setStep] = useState(0);
  const [url, setUrl] = useState('');
  const [anonKey, setAnonKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState(null); // null | { ok, error }

  const canTest = url.trim().startsWith('https://') && anonKey.trim().length > 20;

  const handleTest = async () => {
    setTesting(true);
    setTestResult(null);
    const result = await testSupabaseConnection(url, anonKey);
    setTestResult(result);
    setTesting(false);
  };

  const handleSave = () => {
    saveSupabaseCredentials(url, anonKey);
    onComplete();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-amber-500 text-white mb-4 shadow-lg">
            <ChefHat className="w-8 h-8" />
          </div>
          <h1 className="text-3xl font-bold text-white">DailyDo</h1>
          <p className="text-slate-400 text-sm mt-1">Gestion d'équipe pour restaurants</p>
        </div>

        {/* Progress steps */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {STEPS.map((label, i) => (
            <React.Fragment key={label}>
              <div className="flex items-center gap-1.5">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                  i < step ? 'bg-amber-500 text-white' :
                  i === step ? 'bg-white text-slate-800' :
                  'bg-slate-700 text-slate-400'
                }`}>
                  {i < step ? '✓' : i + 1}
                </div>
                <span className={`text-xs font-medium hidden sm:block ${i === step ? 'text-white' : 'text-slate-500'}`}>{label}</span>
              </div>
              {i < STEPS.length - 1 && <div className={`h-px w-8 ${i < step ? 'bg-amber-500' : 'bg-slate-700'}`} />}
            </React.Fragment>
          ))}
        </div>

        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
          {/* Step 0: Welcome */}
          {step === 0 && (
            <div className="p-8">
              <h2 className="text-xl font-bold text-slate-800 mb-2">Bienvenue !</h2>
              <p className="text-slate-500 text-sm mb-6">
                DailyDo synchronise les tâches de votre équipe en temps réel. <strong>Un seul projet Supabase</strong> peut servir tous les restaurants : chaque établissement est isolé dans la base (droits et données séparés). Les utilisateurs n’ont jamais à coller une URL ou une clé sur l’app en ligne.
              </p>

              {import.meta.env.DEV && (
                <div className="mb-6 p-4 bg-slate-100 border border-slate-200 rounded-xl text-sm text-slate-700">
                  <p className="font-semibold text-slate-800 mb-1">Mode développement</p>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Pour sauter cet écran en local, copiez <code className="bg-white px-1 rounded border">.env.example</code> vers{' '}
                    <code className="bg-white px-1 rounded border">.env</code> et renseignez{' '}
                    <code className="bg-white px-1 rounded border">VITE_SUPABASE_URL</code> +{' '}
                    <code className="bg-white px-1 rounded border">VITE_SUPABASE_ANON_KEY</code> (comme sur Vercel). Redémarrez <code className="bg-white px-1 rounded border">npm run dev</code>.
                  </p>
                </div>
              )}

              <div className="space-y-4 mb-8">
                <div className="flex items-start gap-3 p-4 bg-amber-50 rounded-xl border border-amber-200">
                  <Database className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-semibold text-amber-800">Hébergement technique</p>
                    <p className="text-xs text-amber-700 mt-0.5">Les données passent par Supabase (offre gratuite possible). Ce n’est pas « un compte par restaurant » : c’est le même backend DailyDo, configuré une fois par l’administrateur.</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-4 bg-blue-50 rounded-xl border border-blue-200">
                  <CheckCircle2 className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-semibold text-blue-800">Cet écran = mode spécial</p>
                    <p className="text-xs text-blue-700 mt-0.5">Vous le voyez si l’app n’a pas de variables d’environnement (ex. test local sans .env). Sinon, vous arrivez directement sur la connexion restaurant.</p>
                  </div>
                </div>
              </div>

              <a
                href="https://supabase.com/dashboard/new"
                target="_blank"
                rel="noopener noreferrer"
                className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium rounded-xl transition-colors mb-3 text-sm"
              >
                <ExternalLink className="w-4 h-4" />
                Créer un projet Supabase (auto-hébergement / dev)
              </a>

              <button
                type="button"
                onClick={() => setStep(1)}
                className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-amber-500 hover:bg-amber-600 text-white font-semibold rounded-xl transition-colors"
              >
                J’ai l’URL et la clé anon
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Step 1: Database credentials */}
          {step === 1 && (
            <div className="p-8">
              <h2 className="text-xl font-bold text-slate-800 mb-2">Connecter le backend</h2>
              <p className="text-slate-500 text-sm mb-6">
                Dans le projet Supabase utilisé par DailyDo → <strong>Project Settings</strong> → <strong>API</strong>, copiez l’URL et la clé <strong>anon public</strong> :
              </p>

              {/* Instruction boxes */}
              <div className="space-y-3 mb-6">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <p className="text-xs font-semibold text-slate-600 mb-1 flex items-center gap-1.5">
                    <Link className="w-3.5 h-3.5" /> Project URL
                  </p>
                  <input
                    type="url"
                    placeholder="https://xxxxxxxxxxxx.supabase.co"
                    value={url}
                    onChange={e => { setUrl(e.target.value); setTestResult(null); }}
                    className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm text-slate-800 placeholder-slate-400 focus:ring-2 focus:ring-amber-500 focus:border-amber-500 font-mono"
                  />
                </div>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <p className="text-xs font-semibold text-slate-600 mb-1 flex items-center gap-1.5">
                    <Key className="w-3.5 h-3.5" /> anon public key
                  </p>
                  <div className="relative">
                    <input
                      type={showKey ? 'text' : 'password'}
                      placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                      value={anonKey}
                      onChange={e => { setAnonKey(e.target.value); setTestResult(null); }}
                      className="w-full px-3 py-2.5 pr-10 border border-slate-300 rounded-lg text-sm text-slate-800 placeholder-slate-400 focus:ring-2 focus:ring-amber-500 focus:border-amber-500 font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => setShowKey(!showKey)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </div>

              {/* SQL Script reminder */}
              <div className="mb-6 p-3 bg-blue-50 border border-blue-200 rounded-xl">
                <p className="text-xs text-blue-700">
                  <strong>Important :</strong> dans le SQL Editor Supabase, exécutez le script du dépôt <code className="bg-blue-100 px-1 rounded">src/supabase-saas-setup.sql</code> (ou <code className="bg-blue-100 px-1 rounded">supabase-setup.sql</code> selon votre version). Cela crée les tables et règles nécessaires.
                </p>
              </div>

              {/* Test result */}
              {testResult && (
                <div className={`mb-4 p-3 rounded-xl flex items-start gap-2 text-sm ${
                  testResult.ok ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'
                }`}>
                  {testResult.ok
                    ? <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5" />
                    : <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />}
                  <span>{testResult.ok ? 'Connexion réussie ! Vous pouvez continuer.' : testResult.error}</span>
                </div>
              )}

              <div className="flex gap-3">
                <button
                  onClick={() => setStep(0)}
                  className="flex-1 py-3 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium rounded-xl transition-colors text-sm"
                >
                  Retour
                </button>
                <button
                  onClick={handleTest}
                  disabled={!canTest || testing}
                  className="flex-1 flex items-center justify-center gap-2 py-3 px-4 bg-slate-700 hover:bg-slate-800 text-white font-medium rounded-xl transition-colors disabled:opacity-50 text-sm"
                >
                  {testing ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                  {testing ? 'Test...' : 'Tester'}
                </button>
                <button
                  onClick={() => setStep(2)}
                  disabled={!canTest}
                  className="flex-1 flex items-center justify-center gap-2 py-3 px-4 bg-amber-500 hover:bg-amber-600 text-white font-semibold rounded-xl transition-colors disabled:opacity-50 text-sm"
                >
                  Continuer
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* Step 2: Confirm and save */}
          {step === 2 && (
            <div className="p-8">
              <h2 className="text-xl font-bold text-slate-800 mb-2">Tout est prêt !</h2>
              <p className="text-slate-500 text-sm mb-6">
                Vos credentials sont configurés. Cliquez sur <strong>Lancer l'application</strong> pour créer votre espace restaurant et inviter votre équipe.
              </p>

              <div className="space-y-3 mb-8">
                <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-xl border border-slate-200">
                  <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-xs text-slate-500">URL Supabase</p>
                    <p className="text-sm font-mono text-slate-700 truncate">{url}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-xl border border-slate-200">
                  <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
                  <div>
                    <p className="text-xs text-slate-500">Clé anon</p>
                    <p className="text-sm font-mono text-slate-700">{'•'.repeat(24)} (masquée)</p>
                  </div>
                </div>
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6">
                <p className="text-xs text-amber-700">
                  <strong>Sauvegarde locale.</strong> Ces clés sont enregistrées dans le navigateur de cet appareil uniquement. Sur un déploiement Vercel avec <code className="bg-amber-100 px-0.5 rounded">VITE_SUPABASE_*</code>, l’équipe n’a pas à les saisir.
                </p>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setStep(1)}
                  className="flex-1 py-3 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium rounded-xl transition-colors text-sm"
                >
                  Modifier
                </button>
                <button
                  onClick={handleSave}
                  className="flex-2 flex-1 flex items-center justify-center gap-2 py-3 px-4 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-xl transition-colors"
                >
                  <ChefHat className="w-5 h-5" />
                  Lancer l'application
                </button>
              </div>
            </div>
          )}
        </div>

        <p className="text-center text-slate-600 text-xs mt-6 max-w-md mx-auto leading-relaxed">
          DailyDo utilise Supabase comme base sécurisée ; chaque restaurant ne voit que ses données. L’application ne lit pas vos tables hors de ce modèle.
        </p>
      </div>
    </div>
  );
}
