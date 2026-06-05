# Contribuer au SI Classifications

## Prérequis

- Python 3.11+ et `pip`
- Node.js 18+ et `npm`
- Git

## Installation en développement

```bash
git clone https://github.com/cc-code-1/si-classification.git
cd si-classification

# Backend
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt

# Frontend
cd ../frontend
npm install
```

## Lancer l'environnement de développement

```bash
# Terminal 1 — backend (rechargement automatique)
cd backend && source .venv/bin/activate
uvicorn app.main:app --reload

# Terminal 2 — frontend (HMR)
cd frontend && npm run dev
```

## Tests

```bash
cd backend
source .venv/bin/activate
python -m pytest tests/ -v
```

## Vérification TypeScript

```bash
cd frontend
npx tsc --noEmit
```

## Structure des branches

| Branche | Rôle |
|---|---|
| `main` | Code stable, déployé |
| `develop` | Intégration des features en cours |
| `feature/<nom>` | Développement d'une fonctionnalité |
| `fix/<nom>` | Correction de bug |

## Conventions de code

### Backend (Python)

- Formatage : `black` (longueur de ligne 100)
- Types : annotations de type Python obligatoires
- Commentaires : uniquement quand le *pourquoi* n'est pas évident
- Pas de commentaires sur le *quoi* (le code parle de lui-même)

### Frontend (TypeScript/React)

- Composants en PascalCase, fonctions utilitaires en camelCase
- Props explicitement typées avec `interface`
- Utiliser les composants DSFR (`@codegouvfr/react-dsfr`) plutôt que du HTML brut
- Pas de `any`, pas de `// @ts-ignore`

## Ajouter un nouveau type de classification

Les types de classifications sont entièrement dynamiques — aucune modification
du code n'est nécessaire. Il suffit d'importer un fichier JSON avec un champ
`type` différent (ex : `"type": "matiere"`).

## Ajouter un nouveau format d'import

1. Ajouter la logique de parsing dans `backend/app/routers/import_export.py`
2. Ajouter la fonction appelante dans `frontend/src/api/client.ts`
3. Mettre à jour `ImportPanel.tsx` pour détecter et gérer la nouvelle extension
4. Ajouter les tests dans `backend/tests/`

## Variables d'environnement de développement

Créez un fichier `.env` à la racine du projet (ignoré par Git) :

```bash
# Activer l'OIDC en local (nécessite un Keycloak accessible)
OIDC_ENABLED=false

# Activer la persistance S3 en local (nécessite un MinIO)
S3_ENDPOINT_URL=http://localhost:9000
S3_ACCESS_KEY_ID=minioadmin
S3_SECRET_ACCESS_KEY=minioadmin
S3_BUCKET=si-classification
```

## Signaler un problème

Ouvrez une issue GitHub en décrivant :
1. Le comportement observé
2. Le comportement attendu
3. Les étapes pour reproduire
