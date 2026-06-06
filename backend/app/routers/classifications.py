from fastapi import APIRouter, HTTPException, Depends, Body
from app.models import (
    ClassificationEntry,
    ClassificationEntryCreate,
    ClassificationEntryUpdate,
    ClassificationFile,
    ClassificationTreeNode,
)
from app.services.classification_service import service
from app.auth import require_user

# Toutes les routes de ce routeur exigent un utilisateur authentifié
# lorsque l'OIDC est activé (sinon la dépendance laisse passer).
router = APIRouter(
    prefix="/api/classifications",
    tags=["classifications"],
    dependencies=[Depends(require_user)],
)


@router.get("", response_model=list[str])
def list_types():
    """Retourne la liste de tous les types de classifications disponibles."""
    return service.get_all_types()


@router.get("/{type_}", response_model=ClassificationFile)
def get_classification(type_: str):
    """Retourne toutes les entrées d'un type de classification."""
    cf = service.get_by_type(type_)
    if not cf:
        raise HTTPException(status_code=404, detail=f"Type '{type_}' introuvable")
    return cf


@router.get("/{type_}/tree", response_model=list[ClassificationTreeNode])
def get_tree(type_: str):
    """Retourne l'arbre hiérarchique imbriqué pour un type de classification."""
    cf = service.get_by_type(type_)
    if not cf:
        raise HTTPException(status_code=404, detail=f"Type '{type_}' introuvable")
    return service.get_tree(type_)


@router.post("/{type_}/entries", response_model=ClassificationEntry, status_code=201)
def create_entry(type_: str, data: ClassificationEntryCreate):
    """Crée une nouvelle entrée dans le type de classification spécifié."""
    try:
        return service.create_entry(type_, data)
    except ValueError as e:
        raise HTTPException(status_code=409, detail=str(e))


@router.put("/{type_}/entries/{code}", response_model=ClassificationEntry)
def update_entry(type_: str, code: str, data: ClassificationEntryUpdate):
    """Modifie une entrée existante identifiée par son code."""
    entry = service.update_entry(type_, code, data)
    if not entry:
        raise HTTPException(
            status_code=404, detail=f"Entrée '{code}' introuvable dans '{type_}'"
        )
    return entry


@router.patch("/{type_}/rename")
def rename_classification(type_: str, body: dict = Body(...)):
    """Renomme un type de classification."""
    new_type = (body.get("new_type") or "").strip()
    if not new_type:
        raise HTTPException(status_code=422, detail="new_type requis")
    success = service.rename_classification(type_, new_type)
    if not success:
        raise HTTPException(status_code=409, detail=f"Type '{type_}' introuvable ou '{new_type}' existe déjà")
    return {"type": new_type}


@router.delete("/{type_}", status_code=204)
def delete_classification(type_: str):
    """Supprime entièrement un type de classification."""
    deleted = service.delete_classification(type_)
    if not deleted:
        raise HTTPException(status_code=404, detail=f"Type '{type_}' introuvable")


@router.delete("/{type_}/entries/{code}", status_code=204)
def delete_entry(type_: str, code: str):
    """Supprime une entrée identifiée par son code."""
    deleted = service.delete_entry(type_, code)
    if not deleted:
        raise HTTPException(
            status_code=404, detail=f"Entrée '{code}' introuvable dans '{type_}'"
        )
