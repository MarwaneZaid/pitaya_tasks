import React, { useState } from 'react';
import Dashboard from './Dashboard';
import ErrorBoundary from './components/ErrorBoundary';
import SetupScreen from './components/SetupScreen';
import { hasSupabaseCredentials, isSupabaseEmbeddedInBuild } from './lib/storage-supabase';

export default function App() {
  const [configured, setConfigured] = useState(() => hasSupabaseCredentials());

  if (!configured) {
    return (
      <SetupScreen
        onComplete={() => {
          setConfigured(true);
        }}
      />
    );
  }

  return (
    <ErrorBoundary>
      <Dashboard
        onResetConfig={() => {
          // Config embarquée (Vercel) : ne pas renvoyer vers l'écran technique des clés
          if (!isSupabaseEmbeddedInBuild()) setConfigured(false);
        }}
      />
    </ErrorBoundary>
  );
}
