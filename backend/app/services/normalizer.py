"""
Convertisseur / normaliseur de fichiers de classification.

Objectif : accepter des fichiers JSON aux formats variés (notamment ceux où le
libellé est porté par un champ spécifique comme `sous_domaine` ou `domaine`, ou
ceux qui ne fournissent pas explicitement la hiérarchie parent/enfant) et les
transformer vers le schéma interne canonique `ClassificationFile`.

Le schéma canonique attendu in fine :
    {
        "type": "sous-domaine",
        "version": "1.0.0",
        "description": "...",
        "entries": [
            {"code", "nom", "definition", "annotations", "parent_code"}
        ]
    }
"""
from __future__ import annotations
import re
import uuid
from typing import Any, Optional

# Champs alternatifs reconnus pour le libellé d'une entrée, par ordre de priorité.
# On y inclut les noms de classification métier (domaine, sous_domaine, matiere...)
# car dans les exports existants le libellé est souvent porté par ce champ.
NOM_FIELDS = [
    "nom", "name", "label", "libelle", "libellé", "intitule", "intitulé",
    "title", "titre", "sous_domaine", "sous-domaine", "domaine", "matiere",
    "matière", "categorie", "catégorie", "valeur",
]

DEFINITION_FIELDS = ["definition", "définition", "description", "desc", "commentaire"]

CODE_FIELDS = ["code", "id", "identifiant", "ref", "reference", "référence"]

PARENT_FIELDS = [
    "parent_code", "parent", "code_parent", "parentCode", "parent_id",
    "code_pere", "père", "pere",
]

ANNOTATION_FIELDS = ["annotations", "annotation", "mots_cles", "mots-clés", "keywords", "tags"]

# Champs susceptibles de contenir les entrées enfants imbriquées
CHILDREN_FIELDS = ["children", "enfants", "sous_entrees", "sous-entrées", "items"]


def _first_present(entry: dict, candidates: list[str]) -> Optional[Any]:
    """Retourne la première valeur non vide trouvée parmi les champs candidats."""
    for key in candidates:
        if key in entry and entry[key] not in (None, "", []):
            return entry[key]
    return None


def _as_str_list(value: Any) -> list[str]:
    """Normalise un champ annotations vers une liste de chaînes."""
    if value is None:
        return []
    if isinstance(value, list):
        return [str(v).strip() for v in value if str(v).strip()]
    if isinstance(value, str):
        # Autorise une chaîne séparée par des virgules ou points-virgules
        parts = re.split(r"[;,]", value)
        return [p.strip() for p in parts if p.strip()]
    return [str(value)]


def _derive_parent_from_code(code: str, all_codes: set[str]) -> Optional[str]:
    """
    Déduit le code parent à partir de la structure du code lui-même.

    Exemple : 'COM_PUB_01_01_01' → on retire le dernier segment numérique pour
    obtenir 'COM_PUB_01_01' ; si ce code existe dans le jeu de données, c'est le
    parent. Sinon on remonte encore d'un cran. Fonctionne pour les séparateurs
    courants (_, -, .).
    """
    # Sépare en segments en conservant le séparateur dominant
    for sep in ["_", "-", "."]:
        if sep in code:
            segments = code.split(sep)
            # Remonte segment par segment jusqu'à trouver un parent existant
            for cut in range(len(segments) - 1, 0, -1):
                candidate = sep.join(segments[:cut])
                if candidate in all_codes and candidate != code:
                    return candidate
            return None
    return None


def _children_of(entry: dict) -> list[dict]:
    """Retourne la liste d'enfants imbriqués d'une entrée, quel que soit le champ."""
    for key in CHILDREN_FIELDS:
        value = entry.get(key)
        if isinstance(value, list):
            return [c for c in value if isinstance(c, dict)]
    return []


def flatten_entries(
    raw_entries: list[dict], parent_code: Optional[str] = None
) -> list[dict]:
    """
    Aplatit une structure imbriquée (entrées contenant un champ `children`) vers
    une liste plate. Le `parent_code` est porté par l'imbrication : chaque enfant
    reçoit le code de l'entrée qui le contient.

    Retourne des dicts bruts enrichis d'une clé interne `__parent__` ; la
    normalisation finale des champs est faite ensuite par `normalize_entry`.
    """
    flat: list[dict] = []
    for entry in raw_entries:
        code = _first_present(entry, CODE_FIELDS)
        code = str(code).strip() if code is not None else str(uuid.uuid4())
        # On mémorise le parent issu de l'imbrication
        enriched = dict(entry)
        enriched["__parent__"] = parent_code
        flat.append(enriched)
        # Récursion sur les enfants, avec le code courant comme parent
        children = _children_of(entry)
        if children:
            flat.extend(flatten_entries(children, parent_code=code))
    return flat


def normalize_entry(raw: dict, all_codes: set[str]) -> dict:
    """Transforme une entrée brute vers le schéma canonique d'une entrée."""
    code = _first_present(raw, CODE_FIELDS)
    code = str(code).strip() if code is not None else str(uuid.uuid4())

    nom = _first_present(raw, NOM_FIELDS) or ""
    definition = _first_present(raw, DEFINITION_FIELDS) or ""
    annotations = _as_str_list(_first_present(raw, ANNOTATION_FIELDS))

    # Priorité du parent : 1) imbrication (children) 2) champ explicite 3) code
    parent_code = raw.get("__parent__")
    if not parent_code:
        parent_code = _first_present(raw, PARENT_FIELDS)
    parent_code = str(parent_code).strip() if parent_code else None
    # En dernier recours, on déduit le parent de la structure du code
    if not parent_code:
        parent_code = _derive_parent_from_code(code, all_codes)

    return {
        "id": str(uuid.uuid4()),
        "code": code,
        "nom": str(nom).strip(),
        "definition": str(definition).strip(),
        "annotations": annotations,
        "parent_code": parent_code,
    }


def _extract_entries(data: Any) -> list[dict]:
    """
    Localise la liste d'entrées dans des structures variées :
      - une liste directe : [ {...}, {...} ]
      - un objet avec clé 'entries' / 'classifications' / 'items' / 'data'
      - un objet imbriqué : on prend la première liste de dicts rencontrée
    """
    if isinstance(data, list):
        return [e for e in data if isinstance(e, dict)]
    if isinstance(data, dict):
        for key in ("entries", "classifications", "items", "data", "valeurs", "values"):
            if isinstance(data.get(key), list):
                return [e for e in data[key] if isinstance(e, dict)]
        # Recherche récursive de la première liste de dicts
        for value in data.values():
            if isinstance(value, list) and value and all(isinstance(v, dict) for v in value):
                return value
            if isinstance(value, dict):
                found = _extract_entries(value)
                if found:
                    return found
    return []


def is_canonical(data: Any) -> bool:
    """
    Détermine si le fichier est déjà au format canonique : un objet avec
    'type', 'version', 'entries', et des entrées portant un champ 'nom'.
    """
    if not isinstance(data, dict):
        return False
    if not all(k in data for k in ("type", "version", "entries")):
        return False
    entries = data.get("entries")
    if not isinstance(entries, list):
        return False
    # Considéré canonique si la première entrée a déjà 'code' et 'nom'
    if entries and isinstance(entries[0], dict):
        return "code" in entries[0] and "nom" in entries[0]
    return True


def normalize(data: Any, fallback_type: str = "classification") -> dict:
    """
    Point d'entrée : convertit n'importe quel fichier vers le schéma canonique.

    `fallback_type` est utilisé si le fichier ne précise pas son type
    (par ex. le nom du fichier importé sans extension).
    """
    # Si déjà canonique, on renvoie tel quel (les annotations restent valides)
    if is_canonical(data):
        return data

    type_ = fallback_type
    version = "1.0.0"
    description = ""
    if isinstance(data, dict):
        type_ = str(data.get("type") or data.get("nom_classification") or fallback_type)
        version = str(data.get("version") or "1.0.0")
        description = str(data.get("description") or data.get("définition") or "")

    raw_entries = _extract_entries(data)
    # Aplatit la structure imbriquée (children) en liste plate, en propageant
    # le parent issu de l'imbrication
    flat_entries = flatten_entries(raw_entries)
    all_codes = {
        str(_first_present(e, CODE_FIELDS)).strip()
        for e in flat_entries
        if _first_present(e, CODE_FIELDS) is not None
    }

    entries = [normalize_entry(e, all_codes) for e in flat_entries]

    return {
        "type": type_,
        "version": version,
        "description": description,
        "entries": entries,
    }
