"""
Authentification OIDC optionnelle (compatible Keycloak / Onyxia).

Principe : la vérification est pilotée par variables d'environnement. Par défaut
elle est DÉSACTIVÉE (pratique en développement local). Sur Onyxia, on active la
vérification des jetons JWT émis par le Keycloak de la plateforme.

Variables d'environnement :
- OIDC_ENABLED      : "true" pour activer la vérification (défaut : "false")
- OIDC_ISSUER_URL   : URL de l'émetteur (ex : https://auth.onyxia.../realms/xxx)
- OIDC_CLIENT_ID    : identifiant du client (audience attendue dans le jeton)
- OIDC_JWKS_URL     : optionnel, sinon déduit de l'issuer (.../protocol/openid-connect/certs)

Le SI ne gère pas de mots de passe : il fait confiance aux jetons signés par
Keycloak, qu'il vérifie cryptographiquement via la clé publique (JWKS).
"""
from __future__ import annotations

import os
import time
from typing import Any, Optional

from fastapi import Depends, HTTPException, Request, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer


def _env_bool(name: str, default: bool = False) -> bool:
    return os.getenv(name, str(default)).strip().lower() in ("1", "true", "yes", "on")


class OIDCConfig:
    """Configuration OIDC lue depuis l'environnement (au démarrage)."""

    def __init__(self) -> None:
        self.enabled = _env_bool("OIDC_ENABLED", False)
        self.issuer = os.getenv("OIDC_ISSUER_URL", "").rstrip("/")
        self.client_id = os.getenv("OIDC_CLIENT_ID", "")
        jwks = os.getenv("OIDC_JWKS_URL", "")
        if not jwks and self.issuer:
            # Convention standard Keycloak
            jwks = f"{self.issuer}/protocol/openid-connect/certs"
        self.jwks_url = jwks

    def public_dict(self) -> dict[str, Any]:
        """Configuration exposable au frontend (sans secret)."""
        return {
            "enabled": self.enabled,
            "issuer": self.issuer,
            "clientId": self.client_id,
        }


config = OIDCConfig()


class _JWKSCache:
    """Petit cache des clés publiques JWKS, rafraîchi périodiquement."""

    def __init__(self, ttl_seconds: int = 3600) -> None:
        self._keys: Optional[dict] = None
        self._fetched_at = 0.0
        self._ttl = ttl_seconds

    def get(self, jwks_url: str) -> dict:
        now = time.time()
        if self._keys is None or (now - self._fetched_at) > self._ttl:
            import urllib.request

            with urllib.request.urlopen(jwks_url, timeout=5) as resp:  # noqa: S310
                import json as _json

                self._keys = _json.loads(resp.read())
            self._fetched_at = now
        return self._keys


_jwks_cache = _JWKSCache()
_bearer = HTTPBearer(auto_error=False)


def _verify_token(token: str) -> dict[str, Any]:
    """Vérifie la signature et les claims d'un jeton JWT via la clé publique JWKS."""
    try:
        from jose import jwt  # python-jose
        from jose.exceptions import JWTError
    except ImportError as e:  # pragma: no cover
        raise HTTPException(
            status_code=500,
            detail="Dépendance manquante pour l'OIDC (python-jose).",
        ) from e

    try:
        jwks = _jwks_cache.get(config.jwks_url)
        # python-jose sait sélectionner la bonne clé via le 'kid' de l'en-tête
        claims = jwt.decode(
            token,
            jwks,
            algorithms=["RS256"],
            audience=config.client_id or None,
            issuer=config.issuer or None,
            options={"verify_aud": bool(config.client_id)},
        )
        return claims
    except JWTError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Jeton invalide : {e}",
            headers={"WWW-Authenticate": "Bearer"},
        ) from e


async def require_user(
    request: Request,
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(_bearer),
) -> Optional[dict[str, Any]]:
    """
    Dépendance FastAPI à appliquer sur les routes protégées.

    - Si l'OIDC est désactivé : laisse passer (retourne None).
    - Si activé : exige un jeton Bearer valide, sinon 401.
    """
    if not config.enabled:
        return None
    if credentials is None or not credentials.credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentification requise.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    claims = _verify_token(credentials.credentials)
    # Met l'utilisateur à disposition des handlers / logs éventuels
    request.state.user = claims
    return claims
