export interface OidcConfig {
  enabled: boolean;
  issuer: string;
  clientId: string;
}

export interface RuntimeConfig {
  oidc: OidcConfig;
}

const DEFAULT_CONFIG: RuntimeConfig = {
  oidc: { enabled: false, issuer: '', clientId: '' },
};

/**
 * Lit la configuration d'exécution exposée par le backend (GET /api/config).
 * En cas d'échec (réseau, parsing, champs manquants), retourne un défaut en
 * mode dégradé qui n'empêche pas l'application de fonctionner (OIDC désactivé).
 */
export async function fetchRuntimeConfig(): Promise<RuntimeConfig> {
  try {
    const res = await fetch('/api/config', {
      headers: { Accept: 'application/json' },
    });
    if (!res.ok) {
      return DEFAULT_CONFIG;
    }
    const data = (await res.json()) as { oidc?: Partial<OidcConfig> };
    const oidc: Partial<OidcConfig> = data?.oidc ?? {};
    return {
      oidc: {
        enabled: Boolean(oidc.enabled),
        issuer: typeof oidc.issuer === 'string' ? oidc.issuer : '',
        clientId: typeof oidc.clientId === 'string' ? oidc.clientId : '',
      },
    };
  } catch {
    return DEFAULT_CONFIG;
  }
}
