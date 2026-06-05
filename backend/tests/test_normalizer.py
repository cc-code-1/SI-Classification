"""Tests du convertisseur de formats de classification."""
from app.services import normalizer


def test_format_brut_avec_sous_domaine():
    """Champ 'sous_domaine'/'domaine' converti en 'nom', parent déduit du code."""
    data = [
        {"code": "A_01", "domaine": "Racine", "definition": "def racine"},
        {"code": "A_01_01", "sous_domaine": "Enfant", "definition": "def enfant"},
    ]
    result = normalizer.normalize(data, fallback_type="test")
    assert result["type"] == "test"
    assert len(result["entries"]) == 2
    racine, enfant = result["entries"]
    assert racine["nom"] == "Racine"
    assert racine["parent_code"] is None
    assert enfant["nom"] == "Enfant"
    # parent déduit de la structure du code
    assert enfant["parent_code"] == "A_01"


def test_annotations_chaine_vers_liste():
    """Une chaîne 'a, b' devient ['a', 'b']."""
    data = [{"code": "X", "nom": "X", "definition": "", "annotations": "alpha, beta; gamma"}]
    result = normalizer.normalize(data)
    assert result["entries"][0]["annotations"] == ["alpha", "beta", "gamma"]


def test_format_canonique_inchange():
    """Un fichier déjà canonique n'est pas modifié."""
    data = {
        "type": "domaine",
        "version": "2.0.0",
        "description": "desc",
        "entries": [
            {"id": "1", "code": "D1", "nom": "Dom", "definition": "d", "annotations": [], "parent_code": None}
        ],
    }
    assert normalizer.is_canonical(data) is True
    result = normalizer.normalize(data)
    assert result == data


def test_structure_imbriquee_children():
    """Une structure imbriquée 'children' est aplatie avec parent issu de l'imbrication."""
    data = [
        {
            "code": "COM_PUB_01",
            "sous_domaine": "Marchés publics",
            "definition": "racine",
            "children": [
                {
                    "code": "COM_PUB_01_01",
                    "sous_domaine": "Ordinaires",
                    "definition": "niv1",
                    "children": [
                        {"code": "COM_PUB_01_01_01", "sous_domaine": "Génie civil", "definition": "niv2"}
                    ],
                }
            ],
        }
    ]
    result = normalizer.normalize(data, fallback_type="sous_domaine")
    entries = {e["code"]: e for e in result["entries"]}
    assert len(entries) == 3
    assert entries["COM_PUB_01"]["parent_code"] is None
    assert entries["COM_PUB_01_01"]["parent_code"] == "COM_PUB_01"
    assert entries["COM_PUB_01_01_01"]["parent_code"] == "COM_PUB_01_01"
    assert entries["COM_PUB_01_01_01"]["nom"] == "Génie civil"


def test_enveloppe_avec_cle_classifications():
    """Détecte la liste sous une clé alternative ('classifications')."""
    data = {"type": "matiere", "classifications": [{"code": "M1", "libelle": "Mat"}]}
    result = normalizer.normalize(data)
    assert result["type"] == "matiere"
    assert result["entries"][0]["nom"] == "Mat"
