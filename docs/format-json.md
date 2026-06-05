# Format JSON des classifications

Ce document décrit le format JSON attendu par l'application, ainsi que les
formats alternatifs acceptés grâce au convertisseur automatique.

---

## Format canonique (natif)

C'est le format produit par l'export de l'application et consommé sans conversion.

### Format plat (interne)

```json
{
  "type": "sous-domaine",
  "version": "1.0.0",
  "description": "Classifications des sous-domaines de commande publique",
  "entries": [
    {
      "id": "a1b2c3d4-...",
      "code": "COM_PUB_01",
      "nom": "Marchés publics",
      "definition": "Contrats conclus par un acheteur public...",
      "annotations": ["marché public", "commande publique"],
      "parent_code": null
    },
    {
      "id": "e5f6g7h8-...",
      "code": "COM_PUB_01_01",
      "nom": "Marchés de travaux",
      "definition": "Marchés ayant pour objet la réalisation de travaux...",
      "annotations": ["travaux publics", "BTP"],
      "parent_code": "COM_PUB_01"
    }
  ]
}
```

**Points clés :**
- `id` est généré automatiquement à l'import (UUID v4)
- `parent_code` est `null` pour les racines, sinon la valeur du champ `code` du parent
- `annotations` est une liste de chaînes (peut être vide `[]`)

### Format imbriqué (recommandé pour vos fichiers source)

C'est le format produit par l'export « JSON imbriqué » de l'application. Il est
**plus lisible** pour l'édition manuelle et le versionnage Git.

```json
{
  "type": "sous-domaine",
  "version": "1.0.0",
  "description": "Classifications des sous-domaines de commande publique",
  "entries": [
    {
      "code": "COM_PUB_01",
      "nom": "Marchés publics",
      "definition": "Contrats conclus par un acheteur public...",
      "annotations": ["marché public", "commande publique"],
      "children": [
        {
          "code": "COM_PUB_01_01",
          "nom": "Marchés de travaux",
          "definition": "Marchés ayant pour objet la réalisation de travaux...",
          "annotations": ["travaux publics", "BTP"],
          "children": [
            {
              "code": "COM_PUB_01_01_01",
              "nom": "Génie civil",
              "definition": "Travaux de construction d'infrastructures...",
              "annotations": ["infrastructure", "voirie"],
              "children": []
            }
          ]
        }
      ]
    }
  ]
}
```

**Différences avec le format plat :**
- Pas de champ `id` (généré à l'import)
- Pas de `parent_code` (déduit de l'imbrication)
- Les enfants sont directement imbriqués dans `children`

---

## Formats bruts acceptés (conversion automatique)

Le convertisseur (`backend/app/services/normalizer.py`) transforme les formats
suivants vers le format canonique **sans que vous ayez à modifier vos fichiers**.

### Libellé dans un champ métier

Si le libellé est porté par un champ spécifique à votre domaine plutôt que `nom`,
il est détecté automatiquement :

```json
[
  {
    "code": "COM_PUB_01",
    "sous_domaine": "Marchés publics",
    "definition": "...",
    "annotations": []
  }
]
```

Champs reconnus (par ordre de priorité) :
`nom`, `name`, `label`, `libelle`, `libellé`, `intitule`, `titre`,
**`sous_domaine`**, **`domaine`**, `matiere`, `categorie`, `valeur`

### Hiérarchie par structure de code

Si `parent_code` est absent, il est déduit de la structure du code lui-même :

| Code                  | Parent déduit       |
|-----------------------|---------------------|
| `COM_PUB_01`          | `null` (racine)     |
| `COM_PUB_01_01`       | `COM_PUB_01`        |
| `COM_PUB_01_01_01`    | `COM_PUB_01_01`     |

Séparateurs reconnus : `_`, `-`, `.`

### Annotations en chaîne

```json
{ "annotations": "marché public, travaux; BTP" }
```
→ `["marché public", "travaux", "BTP"]`

Séparateurs reconnus : `,` et `;`

### Tableau sans enveloppe

```json
[
  { "code": "A", "nom": "...", "definition": "..." },
  { "code": "A_01", "nom": "...", "definition": "..." }
]
```

Le `type` prend alors le nom du fichier importé (sans extension).

### Clés alternatives pour la liste d'entrées

L'application cherche les entrées sous les clés suivantes (dans cet ordre) :
`entries`, `classifications`, `items`, `data`, `valeurs`

---

## Format CSV

Le format CSV utilise les colonnes suivantes, dans cet ordre :

| Colonne      | Description                                         |
|--------------|-----------------------------------------------------|
| `code`       | Code de l'entrée                                    |
| `nom`        | Libellé court                                       |
| `definition` | Description complète                                |
| `annotations`| Annotations séparées par ` ; ` (point-virgule)      |
| `parent_code`| Code du parent (vide pour les racines)              |

**Exemple :**

```csv
code,nom,definition,annotations,parent_code
COM_PUB_01,Marchés publics,Contrats conclus par un acheteur public,marché public ; commande publique,
COM_PUB_01_01,Marchés de travaux,Marchés ayant pour objet des travaux,travaux publics ; BTP,COM_PUB_01
```

**Notes :**
- Encodage : UTF-8 avec BOM (pour compatibilité avec Excel)
- La première ligne est l'en-tête
- Lors de l'import CSV, vous devez préciser le `type` de la classification dans l'interface (ex : `sous-domaine`)

---

## Versionner vos classifications avec Git

**Recommandation :** utilisez le **format imbriqué** pour vos fichiers source dans
Git — il est plus lisible dans les diffs et plus facile à éditer manuellement.

Workflow typique :

```
Fichier source Git (imbriqué)
          │
          │  import via l'interface
          ▼
    Application (édition)
          │
          │  export JSON imbriqué
          ▼
  Commit dans Git (source de vérité)
```

Le convertisseur garantit que votre fichier source existant est accepté tel quel,
même s'il utilise `sous_domaine`, `children` imbriqués ou d'autres variantes.
