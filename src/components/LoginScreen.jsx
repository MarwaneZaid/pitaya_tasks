import React from 'react';
import { ChefHat } from 'lucide-react';
import { USER_NAME_KEY } from '../config/constants';

export default function LoginScreen({ userName, setUserName, onEnter }) {
  const handleSubmit = (e) => {
    e.preventDefault();
    if (userName.trim()) {
      localStorage.setItem(USER_NAME_KEY, userName.trim());
      onEnter();
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background logo Pitaya */}
      <div
        className="absolute inset-0 bg-center bg-no-repeat bg-contain opacity-[0.12]"
        style={{ backgroundImage: "url('/logo-pitaya.png')", backgroundSize: '55%' }}
        aria-hidden
      />
      <div className="w-full max-w-md relative z-10">
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-amber-500 text-white mb-4">
              <ChefHat className="w-8 h-8" />
            </div>
            <h1 className="text-2xl font-bold text-slate-800">Pitaya Tasks</h1>
            <p className="text-slate-500 text-sm mt-1">Tableau de bord partagé · PITAYA BÉTHUNE</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="user-name" className="block text-sm font-medium text-slate-700 mb-2">
                Votre nom ou identifiant
              </label>
              <input
                id="user-name"
                type="text"
                placeholder="Ex: Chef Pierre, Manager Sarah..."
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
                className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500 text-slate-800 placeholder-slate-400"
                autoFocus
              />
            </div>
            <button
              type="submit"
              disabled={!userName.trim()}
              className="w-full py-3 px-4 bg-amber-500 hover:bg-amber-600 text-white font-semibold rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Accéder au tableau de bord
            </button>
          </form>

          <p className="mt-5 text-xs text-slate-500 text-center">
            Les tâches sont synchronisées entre tous les managers (téléphone et ordinateur).
          </p>
        </div>
      </div>
    </div>
  );
}
