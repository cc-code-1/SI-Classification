import json

from fastapi import APIRouter, File, HTTPException, UploadFile, status
from fastapi.responses import JSONResponse

from app.models import ClassificationFile
from app.services.classification_service import classification_service

router = APIRouter(prefix="/api", tags=["import-export"])


@router.post("/import", response_model=ClassificationFile)
async def import_classification(file: UploadFile = File(...)):
    """
    Reçoit un fichier JSON multipart et le charge en mémoire.
    Écrase le type s'il existait déjà.
    """
    if file.content_type not in ("application/json", "text/plain", "application/octet-stream"):
        # Accepte aussi application/octet-stream pour les navigateurs qui ne détectent pas bien le type
        pass

    contents = await file.read()
    try:
        data = json.loads(contents)
    except json.JSONDecodeError as e:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Fichier JSON invalide : {e}",
        )

    try:
        cf = classification_service.load_from_dict(data)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Structure du fichier invalide : {e}",
        )

    return cf


@router.get("/export/{type_}")
def export_classification(type_: str):
    """
    Retourne le contenu JSON d'un type de classification.
    Le Content-Disposition pousse le navigateur à télécharger le fichier.
    """
    try:
        data = classification_service.export_to_dict(type_)
    except KeyError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))

    return JSONResponse(
        content=data,
        headers={
            "Content-Disposition": f'attachment; filename="{type_}.json"',
        },
    )
