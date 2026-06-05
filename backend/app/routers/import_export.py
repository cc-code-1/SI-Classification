import json
from fastapi import APIRouter, HTTPException, UploadFile, File
from fastapi.responses import JSONResponse
from app.models import ClassificationFile
from app.services.classification_service import service

router = APIRouter(prefix="/api", tags=["import-export"])


@router.post("/import", response_model=ClassificationFile)
async def import_classification(file: UploadFile = File(...)):
    """
    Importe un fichier JSON de classification.
    Le fichier doit respecter le schéma ClassificationFile.
    """
    if not file.filename or not file.filename.endswith(".json"):
        raise HTTPException(status_code=400, detail="Le fichier doit être au format JSON (.json)")
    content = await file.read()
    try:
        data = json.loads(content)
    except json.JSONDecodeError as e:
        raise HTTPException(status_code=400, detail=f"JSON invalide : {e}")
    try:
        cf = service.load_from_dict(data)
    except Exception as e:
        raise HTTPException(status_code=422, detail=f"Structure du fichier invalide : {e}")
    return cf


@router.get("/export/{type_}")
def export_classification(type_: str):
    """Exporte le JSON complet d'un type de classification."""
    data = service.export_to_dict(type_)
    if data is None:
        raise HTTPException(status_code=404, detail=f"Type '{type_}' introuvable")
    return JSONResponse(
        content=data,
        headers={
            "Content-Disposition": f'attachment; filename="{type_}.json"',
            "Content-Type": "application/json",
        },
    )
