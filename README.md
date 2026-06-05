# SI Classifications — DGCL

Système d'information de gestion des classifications ontologiques pour actes administratifs.

## Fonctionnalités (Phase 1)

- Visualisation arborescente des classifications (hiérarchie parent/enfant)
- Modification d'entrées (code, nom, définition, annotations)
- Import de fichiers JSON de classification
- Export JSON
- Interface conforme à la charte graphique de l'État (DSFR)

## Prérequis

- Python 3.11+
- Node.js 18+

## Installation et démarrage

### Backend (FastAPI)

```bash
cd backend
python -m venv .venv
source .venv/bin/activate        # Windows : .venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

L'API est disponible sur `http://localhost:8000`.  
La documentation interactive (Swagger) est disponible sur `http://localhost:8000/docs`.

### Frontend (React + DSFR)

```bash
cd frontend
npm install
npm run dev
```

L'interface est disponible sur `http://localhost:5173`.

## Modèle de données

### Entrée de classification

```json
{
  "id": "uuid-généré-automatiquement",
  "code": "COM_PUB_01_01",
  "nom": "Marchés de travaux",
  "definition": "Contrats ayant pour objet la construction...",
  "annotations": ["marché public", "travaux"],
  "parent_code": "COM_PUB_01"
}
```

| Champ | Type | Description |
|---|---|---|
| `id` | string (UUID) | Identifiant unique généré automatiquement |
| `code` | string | Code métier unique (ex. `COM_PUB_01_01`) |
| `nom` | string | Nom de la classification |
| `definition` | string | Définition complète |
| `annotations` | string[] | Mots-clés / expressions associés |
| `parent_code` | string \| null | Code de l'entrée parente (null = racine) |

### Fichier de classification (format d'import/export)

```json
{
  "type": "sous-domaine",
  "version": "1.0.0",
  "description": "Classifications des sous-domaines de commande publique",
  "entries": [ ... ]
}
```

## Routes API

| Méthode | Route | Description |
|---|---|---|
| GET | `/api/classifications` | Liste tous les types disponibles |
| GET | `/api/classifications/{type}` | Toutes les entrées d'un type |
| GET | `/api/classifications/{type}/tree` | Arbre hiérarchique imbriqué |
| POST | `/api/classifications/{type}/entries` | Créer une entrée |
| PUT | `/api/classifications/{type}/entries/{code}` | Modifier une entrée |
| DELETE | `/api/classifications/{type}/entries/{code}` | Supprimer une entrée |
| POST | `/api/import` | Importer un fichier JSON |
| GET | `/api/export/{type}` | Exporter un type en JSON |

## Structure du projet

```
SI-Classification/
├── backend/
│   ├── app/
│   │   ├── main.py                    # Point d'entrée FastAPI
│   │   ├── models.py                  # Modèles Pydantic
│   │   ├── routers/
│   │   │   ├── classifications.py     # Routes CRUD
│   │   │   └── import_export.py       # Routes import/export
│   │   └── services/
│   │       └── classification_service.py  # Logique métier + stockage en mémoire
│   ├── data/
│   │   └── exemple_sous_domaine.json  # Données d'exemple chargées au démarrage
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── main.tsx                   # Point d'entrée React (init DSFR)
│   │   ├── App.tsx                    # Layout principal (Header, Footer, routes)
│   │   ├── api/client.ts              # Fonctions d'appel à l'API
│   │   ├── types/classification.ts    # Types TypeScript
│   │   ├── components/
│   │   │   ├── ClassificationTree.tsx # Arbre hiérarchique interactif
│   │   │   ├── ClassificationCard.tsx # Fiche d'une entrée (lecture + édition)
│   │   │   └── ImportPanel.tsx        # Modal d'import JSON
│   │   └── pages/
│   │       ├── Home.tsx               # Page d'accueil
│   │       └── ClassificationDetail.tsx # Page de visualisation/édition
│   └── package.json
└── README.md
```

## Prochaines phases

| Phase | Contenu |
|---|---|
| **2** | Visualisation enrichie : couleurs par niveau, navigation améliorée |
| **3** | Export CSV/Excel, import CSV/Excel |
| **4** | Stockage S3/MinIO, authentification SSO OIDC (Onyxia) |
| **5** | Dockerfile, Helm chart, déploiement Onyxia |
