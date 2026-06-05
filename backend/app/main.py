import json
import os
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from app.routers import classifications, import_export
from app.services.classification_service import service
from app.auth import config as oidc_config

DATA_DIR = Path(__file__).parent.parent / "data"
EXEMPLE_FILE = DATA_DIR / "exemple_sous_domaine.json"

# En production (image Docker), le frontend compilé est copié ici et servi
# par le même serveur que l'API (déploiement « single container »).
STATIC_DIR = Path(os.getenv("STATIC_DIR", Path(__file__).parent / "static"))


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Chargement des données d'exemple au démarrage si le fichier existe
    if EXEMPLE_FILE.exists():
        with open(EXEMPLE_FILE, encoding="utf-8") as f:
            data = json.load(f)
        service.load_from_dict(data)
        print(f"[SI Classifications] Données d'exemple chargées depuis {EXEMPLE_FILE}")
    print(f"[SI Classifications] OIDC activé : {oidc_config.enabled}")
    yield


app = FastAPI(
    title="SI Classifications",
    description="Système d'Information de gestion des classifications ontologiques pour actes administratifs français",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS : en développement le frontend Vite tourne sur un port différent (5173).
# La liste des origines autorisées est configurable (CORS_ORIGINS, séparées par
# des virgules) pour s'adapter au déploiement.
_default_origins = "http://localhost:5173,http://127.0.0.1:5173"
_origins = [o.strip() for o in os.getenv("CORS_ORIGINS", _default_origins).split(",") if o.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origins=_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(classifications.router)
app.include_router(import_export.router)


@app.get("/api/health", tags=["health"])
def health_check():
    """Sonde de vivacité (utilisée par Kubernetes / Onyxia)."""
    return {"status": "ok"}


@app.get("/api/config", tags=["config"])
def runtime_config():
    """
    Configuration publique lue par le frontend au démarrage.

    Permet d'injecter la config OIDC à l'exécution (et non à la compilation),
    indispensable sur Onyxia où l'image est construite une fois puis configurée
    par variables d'environnement au lancement.
    """
    return {"oidc": oidc_config.public_dict()}


# --- Service des fichiers statiques du frontend (production uniquement) -------
# Si le dossier static existe (présent dans l'image Docker), on sert l'app React
# et on gère le routage SPA (toute route inconnue renvoie index.html).
if STATIC_DIR.exists():
    assets_dir = STATIC_DIR / "assets"
    if assets_dir.exists():
        app.mount("/assets", StaticFiles(directory=assets_dir), name="assets")

    @app.get("/", include_in_schema=False)
    def serve_index():
        return FileResponse(STATIC_DIR / "index.html")

    @app.get("/{full_path:path}", include_in_schema=False)
    def serve_spa(full_path: str):
        # Sert un fichier statique réel s'il existe, sinon index.html (routage SPA)
        candidate = STATIC_DIR / full_path
        if candidate.is_file():
            return FileResponse(candidate)
        return FileResponse(STATIC_DIR / "index.html")
else:
    @app.get("/", tags=["health"])
    def root():
        return {"status": "ok", "mode": "api-only (frontend non embarqué)"}
