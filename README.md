# SI Classifications — Phase 1

Système d'Information de gestion des classifications ontologiques pour les actes administratifs français.
Développé pour la Direction Générale des Collectivités Locales (DGCL).

## Description

Ce SI permet de gérer des classifications hiérarchiques utilisées pour qualifier et indexer les actes administratifs. Les données sont stockées en mémoire (import/export JSON manuel) — cette approche est volontaire pour la Phase 1 afin de rester simple et déployable sans base de données.

## Prérequis

- **Python 3.11+**
- **Node.js 18+** et **npm**

## Installation et démarrage

### Backend (FastAPI)

```bash
cd backend
python -m venv .venv
source .venv/bin/activate  # Windows : .venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

L'API est disponible sur `http://localhost:8000`.
La documentation interactive (Swagger) est accessible sur `http://localhost:8000/docs`.

### Frontend (React + DSFR)

```bash
cd frontend
npm install
npm run dev
```

L'interface est disponible sur `http://localhost:5173`.

## Structure du projet

```
SI-Classification/
├── backend/
│   ├── app/
│   │   ├── main.py                    ← point d'entrée FastAPI
│   │   ├── models.py                  ← modèles Pydantic
│   │   ├── routers/
│   │   │   ├── classifications.py     ← CRUD des entrées
│   │   │   └── import_export.py       ← import/export JSON
│   │   └── services/
│   │       └── classification_service.py  ← logique métier + stockage mémoire
│   ├── data/
│   │   └── exemple_sous_domaine.json  ← données d'exemple (commande publique)
│   └── requirements.txt
└── frontend/
    └── src/
        ├── main.tsx                   ← initialisation DSFR + React
        ├── App.tsx                    ← routing + Header/Footer DSFR
        ├── api/client.ts              ← appels Axios vers FastAPI
        ├── types/classification.ts    ← interfaces TypeScript
        ├── components/
        │   ├── ClassificationTree.tsx ← arbre hiérarchique interactif
        │   ├── ClassificationCard.tsx ← fiche détail + édition inline
        │   ├── ImportPanel.tsx        ← modal d'import JSON
        │   └── ExportPanel.tsx        ← bouton d'export JSON
        └── pages/
            ├── Home.tsx               ← accueil + liste des types
            └── ClassificationDetail.tsx ← vue arbre d'un type
```

## Modèle de données

### ClassificationEntry

| Champ        | Type            | Description                                                               |
|--------------|-----------------|---------------------------------------------------------------------------|
| `id`         | UUID (string)   | Identifiant unique généré automatiquement                                 |
| `code`       | string          | Code hiérarchique lisible (ex : `COM_PUB_01_01`)                          |
| `nom`        | string          | Libellé court de l'entrée                                                 |
| `definition` | string          | Description complète                                                      |
| `annotations`| list[string]    | Mots-clés et synonymes utilisés pour la recherche                         |
| `parent_code`| string ou null  | Code de l'entrée parente — `null` pour les racines de l'arbre             |

Le champ `parent_code` est la clé de la hiérarchie : il référence le `code` d'une autre entrée du même fichier. Le backend reconstruit l'arbre à la volée à chaque appel à `/tree`.

### ClassificationFile

| Champ         | Type                      | Description                          |
|---------------|---------------------------|--------------------------------------|
| `type`        | string                    | Identifiant du type (ex : `sous-domaine`) |
| `version`     | string                    | Version sémantique (ex : `1.0.0`)    |
| `description` | string                    | Description du jeu de classifications |
| `entries`     | list[ClassificationEntry] | Toutes les entrées (liste plate)      |

## Routes API

| Méthode  | Route                                       | Description                             |
|----------|---------------------------------------------|-----------------------------------------|
| `GET`    | `/api/health`                               | Sonde de vivacité (Kubernetes)          |
| `GET`    | `/api/config`                               | Configuration publique (OIDC) runtime   |
| `GET`    | `/api/classifications`                      | Liste tous les types disponibles        |
| `GET`    | `/api/classifications/{type}`               | Toutes les entrées d'un type            |
| `GET`    | `/api/classifications/{type}/tree`          | Arbre hiérarchique imbriqué             |
| `POST`   | `/api/classifications/{type}/entries`       | Créer une entrée                        |
| `PUT`    | `/api/classifications/{type}/entries/{code}`| Modifier une entrée                     |
| `DELETE` | `/api/classifications/{type}/entries/{code}`| Supprimer une entrée                    |
| `POST`   | `/api/import`                               | Importer un fichier JSON (multipart)    |
| `POST`   | `/api/import/preview`                       | Analyser un fichier sans l'importer     |
| `GET`    | `/api/export/{type}`                        | Télécharger le JSON d'un type           |

## Import et conversion automatique

L'import accepte le **schéma natif** mais aussi des **formats bruts** courants,
grâce à un convertisseur (`backend/app/services/normalizer.py`) activé par défaut
(paramètre `auto_convert=true`). Il gère notamment :

- **Libellé porté par un champ métier** : `domaine`, `sous_domaine`, `libelle`,
  `intitule`, `name`… → normalisé vers `nom`.
- **Hiérarchie déduite du code** : si `parent_code` est absent, le parent est
  déduit de la structure du code. Exemple : `COM_PUB_01_01_01` → parent
  `COM_PUB_01_01` (si ce code existe). Séparateurs reconnus : `_`, `-`, `.`.
- **Annotations en chaîne** : `"marché public, travaux"` → `["marché public", "travaux"]`.
- **Liste sans enveloppe** : un fichier qui est directement un tableau d'entrées
  est accepté ; le `type` prend alors le nom du fichier importé.
- **Clés alternatives** : la liste d'entrées peut être sous `entries`,
  `classifications`, `items`, `data`…

La route `/api/import/preview` renvoie un récapitulatif (type détecté, nombre
d'entrées, indicateur `was_converted`, échantillon) **sans** charger les données :
l'interface l'utilise pour afficher un aperçu avant validation.

## Tests

```bash
cd backend
source .venv/bin/activate
python -m pytest tests/ -q
```

## Déploiement (Onyxia / Docker)

L'application se déploie en **image Docker unique** (le frontend compilé est
servi par le backend). Voir le guide détaillé : [`docs/deploiement-onyxia.md`](docs/deploiement-onyxia.md).

```bash
# Test local de l'image de production
docker compose up --build      # → http://localhost:8000
```

L'**authentification SSO (OIDC/Keycloak)** est optionnelle et injectée à
l'exécution via les variables `OIDC_ENABLED`, `OIDC_ISSUER_URL`, `OIDC_CLIENT_ID`.
Désactivée par défaut (développement local), elle protège toutes les routes
`/api` une fois activée. Le chart **Helm** (`helm/si-classification/`) est prêt
pour le catalogue Onyxia.

## État d'avancement

- **Phase 1** ✅ Modèle de données, API CRUD, import JSON, arbre DSFR
- **Phase 2** ✅ Visualisation enrichie (recherche, statistiques, couleurs, fil
  d'Ariane), format imbriqué `children`, export imbriqué/plat
- **Phase 4** ✅ Docker, Helm (Onyxia), authentification SSO OIDC
- **Phase 3** ⏳ Persistance S3/MinIO chiffrée, import/export CSV et Excel
- **Phase 5** ⏳ Documentation GitHub complète
