from __future__ import annotations
from typing import Optional
from uuid import uuid4

from app.models import (
    ClassificationEntry,
    ClassificationEntryCreate,
    ClassificationEntryUpdate,
    ClassificationFile,
    ClassificationTreeNode,
)


class ClassificationService:
    def __init__(self) -> None:
        # Stockage en mémoire : type -> ClassificationFile
        self._store: dict[str, ClassificationFile] = {}

    # ------------------------------------------------------------------
    # Lecture
    # ------------------------------------------------------------------

    def get_all_types(self) -> list[str]:
        return list(self._store.keys())

    def get_by_type(self, type_: str) -> Optional[ClassificationFile]:
        return self._store.get(type_)

    def get_entry(self, type_: str, code: str) -> Optional[ClassificationEntry]:
        cf = self._store.get(type_)
        if not cf:
            return None
        return next((e for e in cf.entries if e.code == code), None)

    # ------------------------------------------------------------------
    # Écriture
    # ------------------------------------------------------------------

    def create_entry(self, type_: str, data: ClassificationEntryCreate) -> ClassificationEntry:
        cf = self._store.get(type_)
        if not cf:
            raise KeyError(f"Type '{type_}' introuvable")
        if any(e.code == data.code for e in cf.entries):
            raise ValueError(f"Code '{data.code}' déjà existant dans le type '{type_}'")
        entry = ClassificationEntry(id=str(uuid4()), **data.model_dump())
        cf.entries.append(entry)
        return entry

    def update_entry(
        self, type_: str, code: str, data: ClassificationEntryUpdate
    ) -> ClassificationEntry:
        cf = self._store.get(type_)
        if not cf:
            raise KeyError(f"Type '{type_}' introuvable")
        idx = next((i for i, e in enumerate(cf.entries) if e.code == code), None)
        if idx is None:
            raise KeyError(f"Entrée '{code}' introuvable")

        existing = cf.entries[idx]
        updated_data = existing.model_dump()
        for field, value in data.model_dump(exclude_none=True).items():
            updated_data[field] = value
        updated_entry = ClassificationEntry(**updated_data)
        cf.entries[idx] = updated_entry
        return updated_entry

    def delete_entry(self, type_: str, code: str) -> None:
        cf = self._store.get(type_)
        if not cf:
            raise KeyError(f"Type '{type_}' introuvable")
        before = len(cf.entries)
        cf.entries = [e for e in cf.entries if e.code != code]
        if len(cf.entries) == before:
            raise KeyError(f"Entrée '{code}' introuvable")

    # ------------------------------------------------------------------
    # Import / Export
    # ------------------------------------------------------------------

    def load_from_dict(self, data: dict) -> ClassificationFile:
        cf = ClassificationFile(**data)
        self._store[cf.type] = cf
        return cf

    def export_to_dict(self, type_: str) -> dict:
        cf = self._store.get(type_)
        if not cf:
            raise KeyError(f"Type '{type_}' introuvable")
        return cf.model_dump()

    # ------------------------------------------------------------------
    # Construction de l'arbre
    # ------------------------------------------------------------------

    def get_tree(self, type_: str) -> list[ClassificationTreeNode]:
        cf = self._store.get(type_)
        if not cf:
            raise KeyError(f"Type '{type_}' introuvable")

        # Index code -> entrée
        index: dict[str, ClassificationTreeNode] = {
            e.code: ClassificationTreeNode(**e.model_dump(), children=[], level=0)
            for e in cf.entries
        }

        roots: list[ClassificationTreeNode] = []
        for node in index.values():
            if node.parent_code and node.parent_code in index:
                index[node.parent_code].children.append(node)
            else:
                roots.append(node)

        # Calcul récursif des niveaux
        def _set_levels(nodes: list[ClassificationTreeNode], level: int) -> None:
            for n in nodes:
                n.level = level
                _set_levels(n.children, level + 1)

        _set_levels(roots, 0)
        return roots


# Instance singleton utilisée par toute l'application
classification_service = ClassificationService()
