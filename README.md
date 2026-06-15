# SI Classifications — DGCL

Système d'Information de gestion des **classifications ontologiques** utilisées pour qualifier et indexer les actes administratifs français.

Développé pour la **Direction Générale des Collectivités Locales (DGCL)**.

---

## Présentation

Ce SI permet à une équipe métier de :

- **Importer** des classifications depuis des fichiers JSON, CSV ou Excel (y compris les formats bruts existants avec champs `domaine`/`sous_domaine`)
- **Visualiser** les classifications sous forme d'arbre hiérarchique interactif avec recherche, statistiques et navigation par fil d'Ariane
- **Modifier** les entrées directement dans l'interface (édition inline, ajout d'enfants, suppression)
- **Exporter** en JSON (imbriqué ou plat), CSV et Excel
- **Sécuriser** l'accès via le SSO de la plateforme Onyxia (Keycloak/OIDC)
- **Persister** les données sur S3/MinIO entre les redémarrages

L'interface respecte la [charte graphique de l'État](https://www.systeme-de-design.gouv.fr/) via la bibliothèque `react-dsfr`.

---

## Démarrage rapide (développement local)

### Prérequis

- Python 3.11+
- Node.js 18+ et npm

### Backend (FastAPI)

```bash
cd backend
python -m venv .venv
source .venv/bin/activate   # Windows : .venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

→ API disponible sur `http://localhost:8000`  
→ Documentation Swagger interactive sur `http://localhost:8000/docs`

### Frontend (React + DSFR)

```bash
cd frontend
npm install
npm run dev
```

→ Interface disponible sur `http://localhost:5173`

Au démarrage, l'appli charge automatiquement un jeu de données d'exemple (commande publique, 3 niveaux) pour vous permettre de tester sans import préalable.

---

## Structure du projet

```
SI-Classification/
├── backend/
│   ├── app/
│   │   ├── main.py                      ← point d'entrée FastAPI, lifespan, CORS
│   │   ├── models.py                    ← modèles Pydantic (ClassificationEntry, etc.)
│   │   ├── auth.py                      ← vérification OIDC optionnelle (JWKS)
│   │   ├── routers/
│   │   │   ├── classifications.py       ← CRUD des entrées
│   │   │   └── import_export.py         ← import/export JSON, CSV, Excel
│   │   └── services/
│   │       ├── classification_service.py ← logique métier, stockage mémoire
│   │       ├── normalizer.py            ← convertisseur de formats d'import
│   │       └── s3_service.py            ← persistance S3/MinIO optionnelle
│   ├── data/
│   │   └── exemple_sous_domaine.json    ← données d'exemple (commande publique)
│   ├── tests/
│   │   ├── test_normalizer.py           ← tests du convertisseur
│   │   └── test_csv_excel.py            ← tests import/export CSV et Excel
│   └── requirements.txt
├── frontend/
│   └── src/
│       ├── main.tsx                     ← initialisation DSFR + React
│       ├── App.tsx                      ← routing, Header/Footer DSFR
│       ├── api/client.ts                ← appels Axios, injection jeton Bearer
│       ├── types/classification.ts      ← interfaces TypeScript
│       ├── auth/
│       │   ├── runtimeConfig.ts         ← lecture de /api/config au démarrage
│       │   ├── oidc.ts                  ← wrapper oidc-spa (interface stable)
│       │   └── AuthContext.tsx          ← contexte React + hook useAuth()
│       ├── components/
│       │   ├── ClassificationTree.tsx   ← arbre hiérarchique interactif
│       │   ├── ClassificationCard.tsx   ← fiche détail + édition inline
│       │   ├── ImportPanel.tsx          ← modal import JSON/CSV/Excel
│       │   └── ExportPanel.tsx          ← export JSON/CSV/Excel
│       └── pages/
│           ├── Home.tsx                 ← accueil + liste des types
│           └── ClassificationDetail.tsx ← vue arbre d'un type
├── helm/
│   └── si-classification/               ← chart Helm pour Onyxia
│       ├── Chart.yaml
│       ├── values.yaml
│       ├── values.schema.json           ← formulaire Onyxia
│       └── templates/
│           ├── deployment.yaml
│           ├── service.yaml
│           └── ingress.yaml
├── docs/
│   ├── deploiement-onyxia.md            ← guide Docker + Helm + OIDC
│   ├── format-json.md                   ← spécification du format JSON
│   └── guide-utilisateur.md             ← guide d'utilisation de l'interface
├── Dockerfile                           ← image unique (backend + frontend)
├── docker-compose.yml                   ← test local de l'image de production
└── .gitignore
```

---

## Modèle de données

### ClassificationEntry — une entrée de classification

| Champ          | Type            | Description                                                    |
|----------------|-----------------|----------------------------------------------------------------|
| `id`           | UUID (string)   | Identifiant unique, généré automatiquement                     |
| `code`         | string          | Code hiérarchique lisible (ex : `COM_PUB_01_01`)               |
| `nom`          | string          | Libellé court                                                  |
| `definition`   | string          | Description complète                                           |
| `annotations`  | list[string]    | Mots-clés et synonymes pour la recherche                       |
| `parent_code`  | string \| null  | Code de l'entrée parente — `null` pour les racines             |

### ClassificationFile — un fichier de classification

| Champ         | Type                       | Description                                 |
|---------------|----------------------------|---------------------------------------------|
| `type`        | string                     | Identifiant du type (ex : `sous-domaine`)   |
| `version`     | string                     | Version sémantique (ex : `1.0.0`)           |
| `description` | string                     | Description du jeu de classifications       |
| `entries`     | list[ClassificationEntry]  | Toutes les entrées (liste plate)            |

Le champ `parent_code` porte la hiérarchie : le backend reconstruit l'arbre à chaque appel `/tree`. À l'export, le format imbriqué (`children`) est disponible — plus lisible pour l'édition et le versionnage Git. Voir [`docs/format-json.md`](docs/format-json.md) pour le détail complet.

---

## Routes API

| Méthode  | Route                                        | Description                              |
|----------|----------------------------------------------|------------------------------------------|
| `GET`    | `/api/health`                                | Sonde de vivacité (Kubernetes)           |
| `GET`    | `/api/config`                                | Configuration OIDC runtime (pour le frontend) |
| `GET`    | `/api/classifications`                       | Liste tous les types disponibles         |
| `GET`    | `/api/classifications/{type}`                | Toutes les entrées d'un type             |
| `GET`    | `/api/classifications/{type}/tree`           | Arbre hiérarchique imbriqué              |
| `POST`   | `/api/classifications/{type}/entries`        | Créer une entrée                         |
| `PUT`    | `/api/classifications/{type}/entries/{code}` | Modifier une entrée                      |
| `DELETE` | `/api/classifications/{type}/entries/{code}` | Supprimer une entrée                     |
| `POST`   | `/api/import`                                | Importer un fichier JSON                 |
| `POST`   | `/api/import/preview`                        | Aperçu d'un fichier sans l'importer      |
| `POST`   | `/api/import/csv?type={type}`                | Importer un fichier CSV                  |
| `POST`   | `/api/import/excel?type={type}`              | Importer un fichier Excel                |
| `GET`    | `/api/export/{type}?format=nested\|flat`     | Exporter en JSON (imbriqué ou plat)      |
| `GET`    | `/api/export/{type}/csv`                     | Exporter en CSV (UTF-8 avec BOM)         |
| `GET`    | `/api/export/{type}/xlsx`                    | Exporter en Excel                        |

Toutes les routes `/api/classifications` et `/api/import|export` sont protégées par l'authentification OIDC quand `OIDC_ENABLED=true`.

---

## Import et conversion automatique

L'import JSON accepte votre format existant **sans modification**. Le convertisseur (`normalizer.py`) gère :

| Format d'entrée                         | Conversion                               |
|-----------------------------------------|------------------------------------------|
| Champ `sous_domaine` ou `domaine`       | → `nom`                                  |
| Structure imbriquée `children`          | → aplatissement avec `parent_code` déduit |
| Absence de `parent_code`               | → déduit de la structure du code         |
| `"annotations": "a, b"` (chaîne)       | → `["a", "b"]` (liste)                  |
| Tableau JSON sans enveloppe             | → enveloppé, `type` = nom du fichier     |

La route `/api/import/preview` permet de voir le résultat de la conversion **avant** d'importer.

---

## Variables d'environnement

### Authentification OIDC

| Variable           | Défaut  | Description                                      |
|--------------------|---------|--------------------------------------------------|
| `OIDC_ENABLED`     | `false` | Active la vérification des jetons (`true`/`false`) |
| `OIDC_ISSUER_URL`  | —       | URL du realm Keycloak                            |
| `OIDC_CLIENT_ID`   | —       | Identifiant du client déclaré dans Keycloak      |

### Persistance S3/MinIO

| Variable               | Défaut              | Description                          |
|------------------------|---------------------|--------------------------------------|
| `S3_ENDPOINT_URL`      | —                   | URL MinIO/S3 (active la persistance) |
| `S3_ACCESS_KEY_ID`     | —                   | Clé d'accès                          |
| `S3_SECRET_ACCESS_KEY` | —                   | Clé secrète                          |
| `S3_BUCKET`            | `si-classification` | Nom du bucket                        |
| `S3_PREFIX`            | `classifications/`  | Préfixe des objets dans le bucket    |

### Autres

| Variable       | Défaut                    | Description                              |
|----------------|---------------------------|------------------------------------------|
| `CORS_ORIGINS` | `http://localhost:5173`   | Origines CORS autorisées (séparées par `,`) |

---

## Tests

```bash
cd backend
source .venv/bin/activate
python -m pytest tests/ -v
```

8 tests couvrent : le convertisseur de formats (5 cas), l'import/export CSV (round-trip), l'export Excel (structure et gras) et le service S3 désactivé par défaut.

---

## Déploiement (Onyxia / Docker)

Voir le guide complet : [`docs/deploiement-onyxia.md`](docs/deploiement-onyxia.md)

```bash
# Test local de l'image de production (frontend + backend dans un seul conteneur)
docker compose up --build   # → http://localhost:8000
```

Le chart Helm (`helm/si-classification/`) est prêt pour le catalogue Onyxia avec formulaire de configuration généré automatiquement depuis `values.schema.json`.

---

## Documentation

| Document | Description |
|---|---|
| [`docs/guide-utilisateur.md`](docs/guide-utilisateur.md) | Utilisation de l'interface |
| [`docs/format-json.md`](docs/format-json.md) | Spécification du format JSON source |
| [`docs/deploiement-onyxia.md`](docs/deploiement-onyxia.md) | Déploiement Docker + Helm + OIDC |

---

## Contribuer

Voir [`CONTRIBUTING.md`](CONTRIBUTING.md) pour les conventions de développement, la structure des branches et le processus de contribution.

---

## Licence

Projet développé par la DGCL — Direction Générale des Collectivités Locales.
