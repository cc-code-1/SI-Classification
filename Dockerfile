# =============================================================================
# Image Docker « single container » : le frontend React compilé est servi par
# le backend FastAPI. Un seul port exposé (8000), idéal pour Onyxia/Kubernetes.
# =============================================================================

# --- Étape 1 : compilation du frontend React -------------------------------
FROM node:20-alpine AS frontend-build

WORKDIR /frontend
# On copie d'abord les manifestes pour profiter du cache Docker sur npm install
COPY frontend/package.json frontend/package-lock.json* ./
RUN npm install
COPY frontend/ ./
RUN npm run build
# Le résultat est dans /frontend/dist

# --- Étape 2 : image finale Python avec backend + frontend embarqué ---------
FROM python:3.11-slim AS runtime

# Bonnes pratiques : pas de .pyc, sorties non bufferisées (logs immédiats)
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

WORKDIR /app

# Dépendances Python (couche cachée tant que requirements ne change pas)
COPY backend/requirements.txt ./requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

# Code backend
COPY backend/app ./app
COPY backend/data ./data

# Frontend compilé copié dans le dossier servi par FastAPI (app/static)
COPY --from=frontend-build /frontend/dist ./app/static

# Sécurité : exécution sous un utilisateur non-root
RUN useradd --create-home --uid 1000 appuser && chown -R appuser:appuser /app
USER appuser

EXPOSE 8000

# Sonde de vivacité interne (Kubernetes utilisera /api/health)
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8000/api/health')" || exit 1

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
