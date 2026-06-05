import json
import logging
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routers import classifications, import_export
from app.services.classification_service import classification_service

logger = logging.getLogger(__name__)

# Chemin vers le fichier d'exemple livré avec le dépôt
EXAMPLE_DATA_PATH = Path(__file__).parent.parent / "data" / "exemple_sous_domaine.json"


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Chargement des données d'exemple au démarrage."""
    if EXAMPLE_DATA_PATH.exists():
        try:
            with EXAMPLE_DATA_PATH.open(encoding="utf-8") as f:
                data = json.load(f)
            cf = classification_service.load_from_dict(data)
            logger.info("Données d'exemple chargées : type='%s', %d entrées", cf.type, len(cf.entries))
        except Exception as exc:
            logger.warning("Impossible de charger le fichier d'exemple : %s", exc)
    else:
        logger.info("Aucun fichier d'exemple trouvé, démarrage avec un store vide.")
    yield


app = FastAPI(
    title="SI Classifications",
    description="Système d'information de gestion des classifications ontologiques pour actes administratifs",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS : autorise le frontend Vite en développement
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(classifications.router)
app.include_router(import_export.router)


@app.get("/", tags=["health"])
def health_check():
    return {"status": "ok"}
