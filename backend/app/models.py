from __future__ import annotations
from typing import Optional
import uuid
from pydantic import BaseModel, Field


class ClassificationEntry(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    code: str
    nom: str
    definition: str
    annotations: list[str] = []
    parent_code: Optional[str] = None


class ClassificationEntryCreate(BaseModel):
    code: str
    nom: str
    definition: str
    annotations: list[str] = []
    parent_code: Optional[str] = None


class ClassificationEntryUpdate(BaseModel):
    code: Optional[str] = None
    nom: Optional[str] = None
    definition: Optional[str] = None
    annotations: Optional[list[str]] = None
    parent_code: Optional[str] = None


class ClassificationFile(BaseModel):
    type: str
    version: str
    description: str
    family_id: Optional[int] = None
    entries: list[ClassificationEntry] = []


# Noeud d'arbre récursif avec enfants imbriqués
class ClassificationTreeNode(BaseModel):
    id: str
    code: str
    nom: str
    definition: str
    annotations: list[str] = []
    parent_code: Optional[str] = None
    children: list[ClassificationTreeNode] = []
    level: int = 0

ClassificationTreeNode.model_rebuild()
