import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { fr } from '@codegouvfr/react-dsfr';
import { fetchRuntimeConfig } from './runtimeConfig';
import { initAuth, type AuthClient } from './oidc';
import { setAccessTokenProvider } from '../api/client';

const AuthContext = createContext<AuthClient | null>(null);

/**
 * Hook d'accès à l'authentification. Doit être utilisé sous <AuthProvider>.
 */
export function useAuth(): AuthClient {
  const client = useContext(AuthContext);
  if (client === null) {
    throw new Error('useAuth doit être utilisé à l\'intérieur de <AuthProvider>.');
  }
  return client;
}

/** Écran de chargement sobre conforme au DSFR. */
function LoadingScreen({ message }: { message: string }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        flexDirection: 'column',
        gap: fr.spacing('4v'),
      }}
    >
      <p style={{ fontSize: '1.25rem', color: fr.colors.decisions.text.title.grey.default }}>
        {message}
      </p>
    </div>
  );
}

/**
 * Fournit l'AuthClient à toute l'application.
 * Au montage : lit la config d'exécution (GET /api/config), initialise
 * l'authentification, et connecte le client axios à la source du jeton.
 * Tant que ce n'est pas prêt, un écran de chargement DSFR est affiché.
 * Si OIDC est activé et l'utilisateur non connecté, la connexion est déclenchée.
 */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [client, setClient] = useState<AuthClient | null>(null);
  const loginTriggered = useRef(false);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const config = await fetchRuntimeConfig();
      const authClient = await initAuth(config.oidc);
      if (cancelled) {
        return;
      }
      // Connecte axios à l'authentification.
      setAccessTokenProvider(() => authClient.getAccessToken());
      setClient(authClient);
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  // Déclenche la connexion automatiquement si OIDC est activé et non connecté.
  useEffect(() => {
    if (
      client !== null &&
      client.isEnabled &&
      !client.isLoggedIn &&
      !loginTriggered.current
    ) {
      loginTriggered.current = true;
      client.login();
    }
  }, [client]);

  if (client === null) {
    return <LoadingScreen message="Initialisation…" />;
  }

  if (client.isEnabled && !client.isLoggedIn) {
    return <LoadingScreen message="Redirection vers la connexion…" />;
  }

  return <AuthContext.Provider value={client}>{children}</AuthContext.Provider>;
}
