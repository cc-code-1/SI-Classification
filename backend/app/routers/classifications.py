from fastapi import APIRouter, HTTPException, status

from app.models import (
    ClassificationEntry,
    ClassificationEntryCreate,
    ClassificationEntryUpdate,
    ClassificationFile,
    ClassificationTreeNode,
)
from app.services.classification_service import classification_service

router = APIRouter(prefix="/api/classifications", tags=["classifications"])


@router.get("", response_model=list[str])
def list_types():
    """Retourne tous les types de classifications chargés en mémoire."""
    return classification_service.get_all_types()


@router.get("/{type_}", response_model=ClassificationFile)
def get_classification(type_: str):
    """Retourne toutes les entrées d'un type de classification."""
    cf = classification_service.get_by_type(type_)
    if not cf:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Type '{type_}' introuvable",
        )
    return cf


@router.get("/{type_}/tree", response_model=list[ClassificationTreeNode])
def get_tree(type_: str):
    """Retourne l'arbre hiérarchique imbriqué pour un type."""
    try:
        return classification_service.get_tree(type_)
    except KeyError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))


@router.post(
    "/{type_}/entries",
    response_model=ClassificationEntry,
    status_code=status.HTTP_201_CREATED,
)
def create_entry(type_: str, data: ClassificationEntryCreate):
    """Crée une nouvelle entrée dans le type donné."""
    try:
        return classification_service.create_entry(type_, data)
    except KeyError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(e))


@router.put("/{type_}/entries/{code}", response_model=ClassificationEntry)
def update_entry(type_: str, code: str, data: ClassificationEntryUpdate):
    """Met à jour les champs fournis d'une entrée existante."""
    try:
        return classification_service.update_entry(type_, code, data)
    except KeyError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))


@router.delete("/{type_}/entries/{code}", status_code=status.HTTP_204_NO_CONTENT)
def delete_entry(type_: str, code: str):
    """Supprime une entrée (et laisse ses enfants orphelins)."""
    try:
        classification_service.delete_entry(type_, code)
    except KeyError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
