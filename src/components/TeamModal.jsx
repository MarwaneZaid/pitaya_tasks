import React, { useState, useEffect } from 'react';
import { X, Users, Copy, Check, LogIn, Loader2, User, RefreshCw } from 'lucide-react';
import {
  getInviteCode,
  getTeamMembers,
  joinRestaurantByCode,
  getUserRestaurant,
  rotateInviteCode,
} from '../lib/db';

function formatExpiry(iso) {
  if (!iso) return null;
  try {
    return new Date(iso).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return null;
  }
}

export default function TeamModal({ isOpen, onClose, onJoined }) {
  const [tab, setTab] = useState('invite');
  const [inviteCode, setInviteCode] = useState('');
  const [inviteExpiresAt, setInviteExpiresAt] = useState(null);
  const [joinCode, setJoinCode] = useState('');
  const [members, setMembers] = useState([]);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);
  const [rotating, setRotating] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [myRole, setMyRole] = useState(null);

  useEffect(() => {
    if (!isOpen) return;
    const init = async () => {
      const resto = await getUserRestaurant();
      if (resto) {
        setMyRole(resto.role);
        if (resto.role === 'owner' || resto.role === 'manager') {
          const code = await getInviteCode();
          setInviteCode(code ?? '');
          setInviteExpiresAt(resto.inviteCodeExpiresAt || null);
          const team = await getTeamMembers();
          setMembers(Array.isArray(team) ? team : []);
          setTab('invite');
        } else {
          setTab('join');
        }
      } else {
        setMyRole(null);
        setTab('join');
      }
    };
    init();
  }, [isOpen]);

  const copyCode = () => {
    navigator.clipboard.writeText(inviteCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleRotate = async () => {
    if (!confirm('Régénérer le code ? L’ancien code ne fonctionnera plus.')) return;
    setRotating(true);
    setError(null);
    try {
      const result = await rotateInviteCode(30);
      setInviteCode(result.code || '');
      setInviteExpiresAt(result.expiresAt || null);
      setSuccess('Nouveau code généré (valide 30 jours).');
    } catch (err) {
      setError(err.message);
    } finally {
      setRotating(false);
    }
  };

  const handleJoin = async () => {
    if (!joinCode.trim()) return;
    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      const resto = await joinRestaurantByCode(joinCode.trim().toUpperCase());
      setSuccess(`Vous avez rejoint "${resto.name}" avec succès !`);
      if (onJoined) onJoined();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const isManager = myRole === 'owner' || myRole === 'manager';
  const expiryLabel = formatExpiry(inviteExpiresAt);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between p-6 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-blue-50 text-blue-600">
              <Users className="w-5 h-5" />
            </div>
            <h2 className="font-bold text-slate-800 text-lg">Mon Équipe</h2>
          </div>
          <button type="button" onClick={onClose} className="p-2 rounded-lg hover:bg-slate-100 text-slate-500">
            <X className="w-5 h-5" />
          </button>
        </div>

        {isManager && (
          <div className="flex border-b border-slate-200">
            <button
              type="button"
              onClick={() => setTab('invite')}
              className={`flex-1 py-3 text-sm font-medium transition-colors ${tab === 'invite' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-slate-500 hover:text-slate-700'}`}
            >
              Inviter un Employé
            </button>
            <button
              type="button"
              onClick={() => setTab('members')}
              className={`flex-1 py-3 text-sm font-medium transition-colors ${tab === 'members' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-slate-500 hover:text-slate-700'}`}
            >
              Membres ({members.length})
            </button>
          </div>
        )}

        <div className="p-6">
          {tab === 'invite' && isManager && (
            <div className="space-y-5">
              <p className="text-sm text-slate-500">
                Partagez ce code à vos employés. Ils pourront rejoindre votre restaurant en l&apos;entrant dans l&apos;application.
              </p>
              {error && (
                <div className="bg-red-50 text-red-600 p-3 rounded-xl text-sm">{error}</div>
              )}
              {success && (
                <div className="bg-green-50 text-green-700 p-3 rounded-xl text-sm">{success}</div>
              )}
              <div className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl p-6 text-center">
                <p className="text-sm text-slate-500 mb-2">Code d&apos;invitation</p>
                <p className="text-4xl font-bold tracking-[0.3em] text-slate-800 font-mono">{inviteCode}</p>
                {expiryLabel && (
                  <p className="text-xs text-slate-400 mt-2">Expire le {expiryLabel}</p>
                )}
              </div>
              <button
                type="button"
                onClick={copyCode}
                className={`w-full flex items-center justify-center gap-2 py-3 rounded-xl font-semibold transition-all ${
                  copied
                    ? 'bg-green-500 text-white'
                    : 'bg-blue-600 hover:bg-blue-700 text-white'
                }`}
              >
                {copied ? (
                  <>
                    <Check className="w-5 h-5" />
                    Copié !
                  </>
                ) : (
                  <>
                    <Copy className="w-5 h-5" />
                    Copier le code
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={handleRotate}
                disabled={rotating}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-50"
              >
                {rotating ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <RefreshCw className="w-4 h-4" />
                )}
                Régénérer le code (30 jours)
              </button>
            </div>
          )}

          {tab === 'members' && isManager && (
            <div className="space-y-3">
              {members.length === 0 ? (
                <p className="text-center text-slate-400 py-6">Aucun membre pour le moment.</p>
              ) : (
                members.map((m, i) => (
                  <div key={i} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center">
                        <User className="w-4 h-4 text-blue-600" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-slate-700 font-mono">
                          {(m.user_id ? `${String(m.user_id).slice(0, 8)}…` : '—')}
                        </p>
                        <p className="text-xs text-slate-400">{m.role}</p>
                      </div>
                    </div>
                    <span className={`text-xs px-2 py-1 rounded-lg font-medium ${
                      m.role === 'owner' ? 'bg-amber-100 text-amber-700' :
                      m.role === 'manager' ? 'bg-blue-100 text-blue-700' :
                      'bg-slate-100 text-slate-600'
                    }`}>
                      {m.role === 'owner' ? '👑 Gérant' : m.role === 'manager' ? '🔑 Manager' : '👤 Employé'}
                    </span>
                  </div>
                ))
              )}
            </div>
          )}

          {tab === 'join' && (
            <div className="space-y-5">
              <p className="text-sm text-slate-500">
                Entrez le code fourni par votre gérant pour rejoindre son restaurant.
              </p>

              {error && (
                <div className="bg-red-50 text-red-600 p-3 rounded-xl text-sm">{error}</div>
              )}
              {success && (
                <div className="bg-green-50 text-green-600 p-3 rounded-xl text-sm">{success}</div>
              )}

              <div>
                <input
                  type="text"
                  placeholder="Ex: A1B2C3D4"
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                  maxLength={8}
                  className="w-full px-4 py-3 border border-slate-300 rounded-xl text-center text-2xl font-mono tracking-widest text-slate-800 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 uppercase"
                />
              </div>

              <button
                type="button"
                onClick={handleJoin}
                disabled={loading || !joinCode.trim() || !!success}
                className="w-full flex items-center justify-center gap-2 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    <LogIn className="w-5 h-5" />
                    Rejoindre l&apos;équipe
                  </>
                )}
              </button>
            </div>
          )}

          {isManager && (
            <div className="mt-4 pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setTab('join')}
                className="w-full text-sm text-slate-400 hover:text-blue-600 transition-colors py-1"
              >
                Vous avez un code d&apos;invitation à entrer ?
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
