import { createOidc } from 'oidc-spa';
import type { OidcConfig } from './runtimeConfig';

/**
 * Interface stable consommée par le reste de l'application.
 * Toute la dépendance à oidc-spa est encapsulée dans ce module : si l'API de
 * la bibliothèque change, seul ce fichier est à ajuster.
 */
export interface AuthClient {
  isEnabled: boolean;
  isLoggedIn: boolean;
  login: () => void;
  logout: () => void;
  getAccessToken: () => Promise<string | undefined>;
  username?: string;
}

/** Client no-op : aucune authentification, rien n'est bloqué. */
function createDisabledClient(): AuthClient {
  return {
    isEnabled: false,
    isLoggedIn: true,
    login: () => {},
    logout: () => {},
    getAccessToken: async () => undefined,
  };
}

/** Client de repli quand OIDC est activé mais que l'init a échoué. */
function createFailedClient(): AuthClient {
  return {
    isEnabled: true,
    isLoggedIn: false,
    login: () => {},
    logout: () => {},
    getAccessToken: async () => undefined,
  };
}

type DecodedIdToken = {
  preferred_username?: string;
  name?: string;
  email?: string;
};

/**
 * Initialise l'authentification en fonction de la configuration d'exécution.
 * - Si OIDC désactivé : retourne immédiatement un client no-op.
 * - Si OIDC activé : initialise oidc-spa et mappe son API vers AuthClient.
 *   Toute erreur d'init est capturée afin de ne pas casser l'application.
 */
export async function initAuth(config: OidcConfig): Promise<AuthClient> {
  if (!config.enabled) {
    return createDisabledClient();
  }

  try {
    const oidc = await createOidc<DecodedIdToken>({
      issuerUri: config.issuer,
      clientId: config.clientId,
      homeUrl: window.location.origin + '/',
    });

    if (!oidc.isUserLoggedIn) {
      return {
        isEnabled: true,
        isLoggedIn: false,
        login: () => {
          void oidc.login({ doesCurrentHrefRequiresAuth: true });
        },
        logout: () => {},
        getAccessToken: async () => undefined,
      };
    }

    let username: string | undefined;
    try {
      const claims = oidc.getDecodedIdToken();
      username = claims?.preferred_username ?? claims?.name ?? claims?.email;
    } catch {
      username = undefined;
    }

    return {
      isEnabled: true,
      isLoggedIn: true,
      login: () => {},
      logout: () => {
        void oidc.logout({ redirectTo: 'home' });
      },
      getAccessToken: async () => {
        try {
          const tokens = await oidc.getTokens_next();
          return tokens.accessToken;
        } catch {
          return undefined;
        }
      },
      username,
    };
  } catch (error) {
    console.warn('[auth] Échec de l\'initialisation OIDC, mode dégradé:', error);
    return createFailedClient();
  }
}
