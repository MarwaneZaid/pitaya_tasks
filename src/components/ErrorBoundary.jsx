import React from 'react';

export default class ErrorBoundary extends React.Component {
  state = { hasError: false, error: null };

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error('App error:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-lg border border-red-200 p-6 max-w-md">
            <h1 className="text-lg font-bold text-red-700 mb-2">Erreur de chargement</h1>
            <p className="text-slate-600 text-sm mb-4">
              L&apos;application a rencontré un problème. Rechargez la page ou vérifiez la configuration (Supabase, variables d&apos;environnement).
            </p>
            <pre className="text-xs text-slate-500 bg-slate-100 p-3 rounded overflow-auto max-h-32">
              {this.state.error?.message || 'Unknown error'}
            </pre>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="mt-4 px-4 py-2 bg-amber-500 text-white rounded-lg text-sm font-medium hover:bg-amber-600"
            >
              Recharger la page
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
