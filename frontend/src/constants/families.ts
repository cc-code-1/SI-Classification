export interface Family {
  id: number;
  name: string;
  color: string; // couleur principale
}

export const FAMILIES: Family[] = [
  { id: 1, name: "Institutions et vie publique",          color: "#7D4E5B" },
  { id: 2, name: "Fonction publique territoriale",        color: "#FDCF41" },
  { id: 3, name: "Finances locales",                      color: "#5770BE" },
  { id: 4, name: "Commande publique",                     color: "#91AE4F" },
  { id: 5, name: "Domaine et patrimoine",                 color: "#00AC8C" },
  { id: 6, name: "Urbanisme",                             color: "#FF9940" },
  { id: 7, name: "Libertés publiques et pouvoirs de police", color: "#FF8D7E" },
  { id: 8, name: "Autres classifications",                color: "#000091" },
];

/**
 * Correspondance entre préfixe de code (début de chaîne, insensible à la
 * casse) et l'identifiant de famille à assigner automatiquement à l'import.
 * Ordre décroissant de priorité : les préfixes les plus spécifiques
 * doivent apparaître avant les plus courts.
 */
export const CODE_PREFIX_TO_FAMILY_ID: { prefix: string; familyId: number }[] = [
  { prefix: 'INSTIT_VIE_PUB', familyId: 1 },
  { prefix: 'FPT',            familyId: 2 },
  { prefix: 'FIN_LOC',        familyId: 3 },
  { prefix: 'COM_PUB',        familyId: 4 },
  { prefix: 'DOM_ET_PATRI',   familyId: 5 },
  { prefix: 'URBA',           familyId: 6 },
  { prefix: 'LIB_PUB_PV_POL', familyId: 7 },
  { prefix: 'ENTITE_',        familyId: 8 },
  { prefix: 'ANNOT_',         familyId: 8 },
  { prefix: 'NAT_',           familyId: 8 },
];

/**
 * Détecte automatiquement la famille à partir d'une liste de codes.
 * Parcourt les codes en cherchant le premier qui commence par un préfixe connu.
 * Retourne null si aucun match.
 */
export function detectFamilyFromCodes(codes: string[]): number | null {
  for (const code of codes) {
    const upper = code.toUpperCase();
    for (const { prefix, familyId } of CODE_PREFIX_TO_FAMILY_ID) {
      if (upper.startsWith(prefix)) return familyId;
    }
  }
  return null;
}

/** Retourne des niveaux d'accentuation de la couleur pour l'arbre hiérarchique.
 *  level 0 = couleur pleine, level 1 = 70% opacité, level 2+ = 45% opacité
 */
export function familyLevelColor(familyColor: string, level: number): string {
  const opacity = level === 0 ? '1' : level === 1 ? '0.65' : '0.4';
  // Convertit hex en rgba
  const r = parseInt(familyColor.slice(1, 3), 16);
  const g = parseInt(familyColor.slice(3, 5), 16);
  const b = parseInt(familyColor.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
}

/** Retourne la couleur de fond (très clair) pour un badge de niveau donné */
export function familyLevelBg(familyColor: string, level: number): string {
  const r = parseInt(familyColor.slice(1, 3), 16);
  const g = parseInt(familyColor.slice(3, 5), 16);
  const b = parseInt(familyColor.slice(5, 7), 16);
  const opacity = level === 0 ? '0.18' : level === 1 ? '0.12' : '0.07';
  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
}
