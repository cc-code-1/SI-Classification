import json
import os
from fastapi import APIRouter, HTTPException, UploadFile, File, Query, Depends
from fastapi.responses import JSONResponse
from app.models import ClassificationFile
from app.services.classification_service import service
from app.services import normalizer
from app.auth import require_user

router = APIRouter(prefix="/api", tags=["import-export"], dependencies=[Depends(require_user)])


@router.post("/import", response_model=ClassificationFile)
async def import_classification(
    file: UploadFile = File(...),
    auto_convert: bool = Query(
        True,
        description="Convertit automatiquement les formats non canoniques "
        "(champ 'sous_domaine'/'domaine' au lieu de 'nom', hiérarchie déduite "
        "du code, liste d'entrées sans enveloppe, etc.).",
    ),
):
    """
    Importe un fichier JSON de classification.

    Si `auto_convert` est activé (par défaut), le fichier est normalisé vers le
    schéma interne : libellé déduit de divers champs, parent déduit du code, etc.
    """
    if not file.filename or not file.filename.endswith(".json"):
        raise HTTPException(status_code=400, detail="Le fichier doit être au format JSON (.json)")
    content = await file.read()
    try:
        data = json.loads(content)
    except json.JSONDecodeError as e:
        raise HTTPException(status_code=400, detail=f"JSON invalide : {e}")

    if auto_convert:
        # Type de repli = nom du fichier sans extension (ex: "sous_domaine.json")
        fallback_type = os.path.splitext(file.filename)[0]
        try:
            data = normalizer.normalize(data, fallback_type=fallback_type)
        except Exception as e:
            raise HTTPException(status_code=422, detail=f"Conversion impossible : {e}")

    try:
        cf = service.load_from_dict(data)
    except Exception as e:
        raise HTTPException(status_code=422, detail=f"Structure du fichier invalide : {e}")
    return cf


@router.post("/import/preview")
async def preview_import(file: UploadFile = File(...), auto_convert: bool = Query(True)):
    """
    Analyse un fichier sans l'importer : retourne le type détecté, le nombre
    d'entrées, et un aperçu des 3 premières entrées normalisées. Permet à
    l'interface d'afficher un récapitulatif avant validation.
    """
    if not file.filename or not file.filename.endswith(".json"):
        raise HTTPException(status_code=400, detail="Le fichier doit être au format JSON (.json)")
    content = await file.read()
    try:
        data = json.loads(content)
    except json.JSONDecodeError as e:
        raise HTTPException(status_code=400, detail=f"JSON invalide : {e}")

    was_converted = auto_convert and not normalizer.is_canonical(data)
    if auto_convert:
        fallback_type = os.path.splitext(file.filename)[0]
        data = normalizer.normalize(data, fallback_type=fallback_type)

    entries = data.get("entries", [])
    return {
        "type": data.get("type"),
        "version": data.get("version"),
        "description": data.get("description"),
        "entry_count": len(entries),
        "was_converted": was_converted,
        "sample": entries[:3],
    }


@router.get("/export/{type_}")
def export_classification(
    type_: str,
    format: str = Query(
        "nested",
        description="Format d'export : 'nested' (imbriqué, lisible, recommandé) "
        "ou 'flat' (liste plate avec parent_code).",
    ),
):
    """Exporte le JSON complet d'un type de classification, à plat ou imbriqué."""
    if format == "flat":
        data = service.export_to_dict(type_)
    else:
        data = service.export_nested(type_)
    if data is None:
        raise HTTPException(status_code=404, detail=f"Type '{type_}' introuvable")
    suffix = "" if format == "nested" else "_plat"
    return JSONResponse(
        content=data,
        headers={
            "Content-Disposition": f'attachment; filename="{type_}{suffix}.json"',
            "Content-Type": "application/json",
        },
    )
