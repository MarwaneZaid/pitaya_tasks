import React, { useState } from 'react';
import Dashboard from './Dashboard';
import ErrorBoundary from './components/ErrorBoundary';
import SetupScreen from './components/SetupScreen';
import { hasSupabaseCredentials } from './lib/storage-supabase';

export default function App() {
  const [configured, setConfigured] = useState(() => hasSupabaseCredentials());

  if (!configured) {
    return (
      <SetupScreen
        onComplete={() => {
          // Laisser le client Supabase s'initialiser avant d'afficher le Dashboard
          setTimeout(() => setConfigured(true), 150);
        }}
      />
    );
  }

  return (
    <ErrorBoundary>
      <Dashboard onResetConfig={() => setConfigured(false)} />
    </ErrorBoundary>
  );
}
