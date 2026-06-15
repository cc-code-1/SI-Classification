import React from 'react';
import ReactDOM from 'react-dom/client';
import { startReactDsfr } from '@codegouvfr/react-dsfr/spa';
import App from './App';
import { AuthProvider } from './auth/AuthContext';

// Initialisation du Système de Design de l'État Français
startReactDsfr({ defaultColorScheme: 'system' });

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <AuthProvider>
      <App />
    </AuthProvider>
  </React.StrictMode>
);
