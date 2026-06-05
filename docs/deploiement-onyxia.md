# Déploiement sur Onyxia

Ce guide explique comment empaqueter le SI Classifications en image Docker et le
déployer sur [Onyxia](https://github.com/InseeFrLab/onyxia) via le chart Helm.

## Architecture de déploiement

L'application est livrée en **image Docker unique** (« single container ») :
le frontend React compilé est servi directement par le backend FastAPI. Un seul
port (8000) est exposé.

```
┌─────────────────────────────────────────┐
│  Conteneur (port 8000)                   │
│                                          │
│  FastAPI (uvicorn)                        │
│   ├─ /api/*        → API REST            │
│   ├─ /api/config   → config OIDC runtime │
│   ├─ /api/health   → sonde Kubernetes    │
│   └─ /*            → frontend React (SPA) │
└─────────────────────────────────────────┘
```

Avantages : un seul objet à déployer, pas de CORS en production (même origine),
configuration simple sur Kubernetes.

## 1. Construire et publier l'image

```bash
# Construction de l'image
docker build -t ghcr.io/cc-code-1/si-classification:1.0.0 .

# Test local (http://localhost:8000)
docker compose up --build

# Publication sur un registre accessible par le cluster
docker push ghcr.io/cc-code-1/si-classification:1.0.0
```

## 2. Configuration OIDC (SSO)

L'authentification est **injectée à l'exécution** via variables d'environnement.
Le frontend lit `/api/config` au démarrage pour savoir s'il doit authentifier.

| Variable          | Rôle                                              |
|-------------------|---------------------------------------------------|
| `OIDC_ENABLED`    | `true` pour exiger une connexion                  |
| `OIDC_ISSUER_URL` | URL du realm Keycloak (issuer)                    |
| `OIDC_CLIENT_ID`  | Identifiant du client déclaré dans Keycloak       |

Sur Onyxia, ces valeurs correspondent au Keycloak de la plateforme. Le backend
vérifie cryptographiquement la signature des jetons (clé publique JWKS), il ne
gère donc aucun mot de passe.

## 3. Déployer avec Helm

```bash
helm install si-classification ./helm/si-classification \
  --set image.tag=1.0.0 \
  --set oidc.enabled=true \
  --set oidc.issuerUrl=https://auth.exemple.fr/realms/mon-realm \
  --set oidc.clientId=si-classification
```

Le chart crée un `Deployment`, un `Service` et un `Ingress`. Onyxia injecte
l'URL publique et le certificat TLS automatiquement.

### Paramètres principaux (`values.yaml`)

| Paramètre              | Défaut                                   | Description                |
|------------------------|------------------------------------------|----------------------------|
| `image.repository`     | `ghcr.io/cc-code-1/si-classification`    | Dépôt de l'image           |
| `image.tag`            | `latest`                                 | Version déployée           |
| `oidc.enabled`         | `false`                                  | Active le SSO              |
| `ingress.enabled`      | `true`                                   | Expose l'app en HTTP(S)    |
| `resources.limits`     | 500m CPU / 512Mi                         | Limites de ressources      |

## 4. Intégration au catalogue Onyxia

Onyxia liste les services depuis un dépôt de charts Helm. Pour publier ce chart
dans un catalogue :

1. Empaqueter le chart : `helm package helm/si-classification`
2. Publier le `.tgz` et un `index.yaml` (`helm repo index`) sur une URL HTTP.
3. Déclarer cette URL comme **source de catalogue** dans la configuration Onyxia.

Le fichier `values.schema.json` génère automatiquement le formulaire de
configuration affiché dans l'interface Onyxia (image, SSO, ressources).

## Limites actuelles (Phase 4)

- **Données en mémoire** : les modifications non exportées sont perdues au
  redémarrage du conteneur. La persistance (stockage S3/MinIO chiffré) est
  l'objet de la **Phase 3**, à venir.
- Une seule réplique recommandée tant que le stockage n'est pas externalisé
  (sinon les répliques auraient des données divergentes).
