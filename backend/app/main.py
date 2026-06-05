import json
import os
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routers import classifications, import_export
from app.services.classification_service import service

DATA_DIR = Path(__file__).parent.parent / "data"
EXEMPLE_FILE = DATA_DIR / "exemple_sous_domaine.json"


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Chargement des données d'exemple au démarrage si le fichier existe
    if EXEMPLE_FILE.exists():
        with open(EXEMPLE_FILE, encoding="utf-8") as f:
            data = json.load(f)
        service.load_from_dict(data)
        print(f"[SI Classifications] Données d'exemple chargées depuis {EXEMPLE_FILE}")
    yield


app = FastAPI(
    title="SI Classifications",
    description="Système d'Information de gestion des classifications ontologiques pour actes administratifs français",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS : autorise le frontend React en développement (Vite sur port 5173)
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
