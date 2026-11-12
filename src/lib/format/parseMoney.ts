// Conversion d'une saisie en dollars (chaîne) vers des cents (entier).
// Gère les formats fr-CA (« 1 234,56 », « 1234.56 ») et évite les pièges de flottant.

/**
 * Convertit une chaîne de dollars en cents (entier).
 * Retourne null si l'entrée n'est pas un montant valide.
 * Exemples : "320" -> 32000, "19,99" -> 1999, "1 234.50" -> 123450
 */
export function parseDollarsToCents(input: string): number | null {
  if (typeof input !== 'string') return null;
  // Retirer espaces (séparateurs de milliers fr-CA) et normaliser la virgule décimale.
  const cleaned = input
    .replace(/\s/g, '')
    .replace(/\u00A0/g, '')
    .replace(',', '.')
    .trim();
  if (cleaned === '' || !/^-?\d*\.?\d*$/.test(cleaned)) return null;
  const dollars = Number(cleaned);
  if (!Number.isFinite(dollars)) return null;
  // Arrondi au cent le plus proche pour neutraliser l'imprécision binaire.
  return Math.round(dollars * 100);
}
