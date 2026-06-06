from __future__ import annotations
from typing import Optional
import uuid
from app.services.s3_service import s3
from app.models import (
    ClassificationEntry,
    ClassificationEntryCreate,
    ClassificationEntryUpdate,
    ClassificationFile,
    ClassificationTreeNode,
)


class ClassificationService:
    def __init__(self):
        # Stockage en mémoire : clé = type (ex: "sous-domaine")
        self.classifications: dict[str, ClassificationFile] = {}

    def get_all_types(self) -> list[str]:
        return list(self.classifications.keys())

    def get_by_type(self, type_: str) -> Optional[ClassificationFile]:
        return self.classifications.get(type_)

    def get_entry(self, type_: str, code: str) -> Optional[ClassificationEntry]:
        cf = self.classifications.get(type_)
        if not cf:
            return None
        return next((e for e in cf.entries if e.code == code), None)

    def create_entry(self, type_: str, data: ClassificationEntryCreate) -> ClassificationEntry:
        if type_ not in self.classifications:
            # Crée automatiquement le type s'il n'existe pas encore
            self.classifications[type_] = ClassificationFile(
                type=type_, version="1.0.0", description="", entries=[]
            )
        cf = self.classifications[type_]
        # Vérifie l'unicité du code
        if any(e.code == data.code for e in cf.entries):
            raise ValueError(f"Une entrée avec le code '{data.code}' existe déjà dans '{type_}'")
        entry = ClassificationEntry(id=str(uuid.uuid4()), **data.model_dump())
        cf.entries.append(entry)
        if s3.is_enabled:
            exported = self.export_to_dict(type_)
            if exported:
                s3.save_classification(type_, exported)
        return entry

    def update_entry(
        self, type_: str, code: str, data: ClassificationEntryUpdate
    ) -> Optional[ClassificationEntry]:
        cf = self.classifications.get(type_)
        if not cf:
            return None
        for i, entry in enumerate(cf.entries):
            if entry.code == code:
                updated = entry.model_copy(
                    update={k: v for k, v in data.model_dump().items() if v is not None}
                )
                cf.entries[i] = updated
                if s3.is_enabled:
                    exported = self.export_to_dict(type_)
                    if exported:
                        s3.save_classification(type_, exported)
                return updated
        return None

    def delete_classification(self, type_: str) -> bool:
        if type_ not in self.classifications:
            return False
        del self.classifications[type_]
        if s3.is_enabled:
            s3.delete_classification(type_)
        return True

    def delete_entry(self, type_: str, code: str) -> bool:
        cf = self.classifications.get(type_)
        if not cf:
            return False
        original_count = len(cf.entries)
        cf.entries = [e for e in cf.entries if e.code != code]
        deleted = len(cf.entries) < original_count
        if deleted and s3.is_enabled:
            exported = self.export_to_dict(type_)
            if exported:
                s3.save_classification(type_, exported)
        return deleted

    def load_from_dict(self, data: dict) -> ClassificationFile:
        cf = ClassificationFile.model_validate(data)
        self.classifications[cf.type] = cf
        if s3.is_enabled:
            s3.save_classification(cf.type, cf.model_dump())
        return cf

    def export_to_dict(self, type_: str) -> Optional[dict]:
        cf = self.classifications.get(type_)
        if not cf:
            return None
        return cf.model_dump()

    def export_nested(self, type_: str) -> Optional[dict]:
        """
        Exporte au format imbriqué (entrées contenant un champ `children`),
        plus lisible et adapté à l'édition manuelle / au versionnage Git.
        Conserve l'enveloppe (type, version, description).
        """
        cf = self.classifications.get(type_)
        if not cf:
            return None

        tree = self.get_tree(type_)

        def to_nested(node: ClassificationTreeNode) -> dict:
            return {
                "code": node.code,
                "nom": node.nom,
                "definition": node.definition,
                "annotations": node.annotations,
                "children": [to_nested(c) for c in node.children],
            }

        return {
            "type": cf.type,
            "version": cf.version,
            "description": cf.description,
            "entries": [to_nested(root) for root in tree],
        }

    def get_tree(self, type_: str) -> list[ClassificationTreeNode]:
        """Construit un arbre imbriqué à partir de la liste plate d'entrées."""
        cf = self.classifications.get(type_)
        if not cf:
            return []

        # Index par code pour accès rapide
        nodes: dict[str, ClassificationTreeNode] = {
            e.code: ClassificationTreeNode(**e.model_dump(), children=[], level=0)
            for e in cf.entries
        }

        roots: list[ClassificationTreeNode] = []

        for entry in cf.entries:
            node = nodes[entry.code]
            if entry.parent_code and entry.parent_code in nodes:
                parent = nodes[entry.parent_code]
                node.level = parent.level + 1
                parent.children.append(node)
            else:
                roots.append(node)

        # Recalcule les niveaux en profondeur (BFS) pour s'assurer de la cohérence
        stack = [(r, 0) for r in roots]
        while stack:
            node, level = stack.pop()
            node.level = level
            stack.extend((child, level + 1) for child in node.children)

        return roots


# Instance singleton partagée par les routers
service = ClassificationService()
