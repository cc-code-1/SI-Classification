# Guide d'utilisation — SI Classifications

Ce guide explique comment utiliser l'interface web du SI Classifications.

---

## Connexion

Si l'authentification SSO est activée (en production sur Onyxia), vous serez
automatiquement redirigé vers la page de connexion de votre organisation au
premier accès. Utilisez vos identifiants habituels. Un bouton **Se déconnecter**
apparaît ensuite dans l'en-tête avec votre nom d'utilisateur.

En développement local, aucune connexion n'est requise.

---

## Page d'accueil

La page d'accueil liste toutes les **classifications actuellement chargées** en
mémoire (ou rechargées depuis S3 au démarrage si la persistance est activée).

- **Cliquer sur une carte** ou sur le bouton **Ouvrir** pour accéder à l'arbre
  d'une classification.
- **Bouton « Importer une classification »** pour charger un nouveau fichier.

---

## Importer une classification

Cliquez sur **« Importer une classification »** depuis la page d'accueil.

### Formats acceptés

| Format | Extension | Particularités |
|---|---|---|
| JSON natif | `.json` | Aperçu automatique avant import |
| JSON brut | `.json` | Champs `sous_domaine`/`domaine`, `children`… convertis automatiquement |
| CSV | `.csv` | UTF-8 ou UTF-8 avec BOM ; saisir le type dans le formulaire |
| Excel | `.xlsx` | En-têtes en première ligne ; saisir le type dans le formulaire |

### Étapes pour un import JSON

1. Cliquez sur **« Importer une classification »**
2. Sélectionnez votre fichier `.json`
3. L'application affiche un **aperçu** : type détecté, nombre d'entrées,
   indication si une conversion automatique a été appliquée, et un échantillon
   des 3 premières entrées
4. Si l'aperçu est correct, cliquez sur **« Importer »**

### Étapes pour un import CSV ou Excel

1. Sélectionnez votre fichier `.csv` ou `.xlsx`
2. Un champ apparaît : **saisissez le nom du type** de classification
   (ex : `sous-domaine`, `domaine`, `matière`)
3. Cliquez sur **« Importer »**

> **Remarque :** si une classification du même type est déjà chargée, elle est
> remplacée par le nouveau fichier.

---

## Visualiser une classification

L'arbre hiérarchique présente toutes les entrées de la classification sélectionnée.

### Navigation dans l'arbre

- **Cliquez sur le chevron** (▶ / ▼) à gauche d'une entrée pour la déplier/replier
- **Cliquez sur le texte** d'une entrée pour afficher sa fiche détail dans le
  panneau de droite
- L'entrée sélectionnée est mise en évidence par un contour bleu

### Couleurs par niveau

Les barres colorées à gauche indiquent la profondeur de l'entrée dans la
hiérarchie :

| Couleur | Niveau |
|---|---|
| Bleu | Racine (niveau 0) |
| Vert émeraude | Niveau 1 |
| Violet | Niveau 2 |
| Orange | Niveau 3 et plus |

### Contrôles globaux

En haut de l'arbre :
- **« Tout déplier »** — affiche toutes les entrées à tous les niveaux
- **« Tout replier »** — ne montre que les racines

### Barre de statistiques

Juste en dessous des contrôles, une ligne affiche :
`📊 X entrées · Y racines · profondeur Z`

### Recherche

La barre de recherche filtre l'arbre en temps réel sur les champs **code**,
**nom**, **définition** et **annotations**. Les parents des entrées
correspondantes sont conservés pour maintenir le contexte hiérarchique. Le
nombre de résultats est affiché. La recherche force le dépliage automatique de
l'arbre pour rendre les résultats visibles.

---

## Fiche détail d'une entrée

Cliquez sur une entrée dans l'arbre pour afficher sa fiche dans le panneau droit.

### Informations affichées

- **Fil d'Ariane** : chemin des codes parents (ex : `COM_PUB_01 › COM_PUB_01_01 › (courant)`)
- **Badge code** : code unique de l'entrée
- **Nom** : libellé court
- **Parent** : code du parent (si applicable)
- **Définition** : description complète
- **Annotations** : mots-clés affichés sous forme de tags

### Modifier une entrée

1. Cliquez sur l'icône **crayon** (✏️) en haut à droite de la fiche
2. Modifiez les champs : **Nom**, **Définition**, **Annotations**
   (séparées par des virgules)
3. Cliquez sur **« Sauvegarder »** ou **« Annuler »**

> Le **code** et le **parent_code** ne sont pas modifiables depuis la fiche
> (ils définissent la structure de l'arbre).

### Supprimer une entrée

1. Cliquez sur l'icône **poubelle** (🗑) en haut à droite de la fiche
2. Un message de confirmation s'affiche : confirmez ou annulez
3. Si l'entrée a des enfants, ils deviennent des racines dans l'arbre

---

## Ajouter une entrée enfant

1. Dans l'arbre, cliquez sur l'icône **+** à droite d'une entrée existante
2. Un formulaire apparaît en dessous avec les champs :
   - **Code** (suggestion automatique basée sur le parent, ex : `COM_PUB_01_03`)
   - **Nom**
   - **Définition**
3. Cliquez sur **« Ajouter »**

---

## Exporter une classification

En haut à droite de la vue d'une classification, quatre boutons d'export :

| Bouton | Format | Usage recommandé |
|---|---|---|
| **JSON imbriqué** | `.json` avec `children` | Fichier source pour Git, lisible |
| **JSON plat** | `.json` avec `parent_code` | Intégration technique |
| **CSV** | `.csv` UTF-8 BOM | Tableur (Excel, LibreOffice) |
| **Excel** | `.xlsx` | Tableur avec mise en forme |

Le nom du fichier exporté contient le type et la date (ex : `sous-domaine_2026-06-05.json`).

---

## Conseils pour la gestion des classifications

### Conventions de code

Utilisez un code **hiérarchique et lisible**, par exemple :
```
DOMAINE_01               ← racine
DOMAINE_01_01            ← niveau 1
DOMAINE_01_01_01         ← niveau 2
```

Cette convention permet au convertisseur de déduire automatiquement les
relations parent/enfant si elles sont absentes du fichier source.

### Workflow recommandé avec Git

1. Conservez vos fichiers JSON imbriqués dans un dépôt Git (source de vérité)
2. Importez-les dans l'application pour les modifier
3. Exportez au format **JSON imbriqué** et commitez dans Git

### Gestion des types multiples

Chaque classification a un **type** (ex : `domaine`, `sous-domaine`). Vous
pouvez charger plusieurs types simultanément — l'accueil affiche une carte par
type. Ils sont indépendants les uns des autres.
