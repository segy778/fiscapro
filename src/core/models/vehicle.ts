// Modèles de données pour le kilométrage et les frais de véhicule.
// Montants en CENTS, distances en kilomètres entiers (1 décimale tolérée -> stocker en mètres si besoin plus tard).
// Aucune dépendance UI.

/** Un trajet enregistré. Saisie par trajet (recommandé ARC). */
export interface Trip {
  id: string;
  /** Date ISO 8601 (AAAA-MM-JJ). */
  date: string;
  /** Kilomètres d'affaires de ce trajet. */
  businessKm: number;
  /** Kilomètres personnels de ce trajet (optionnel; 0 si non précisé). */
  personalKm?: number;
  /** Motif / description du trajet. */
  purpose?: string;
}

/** Type de frais de véhicule (pour la saisie par total annuel ou par dépense). */
export type VehicleExpenseKind =
  | 'essence'
  | 'entretien'
  | 'assurance'
  | 'immatriculation'
  | 'autre';

/** Une dépense de véhicule individuelle (niveau « par dépense »). */
export interface VehicleExpense {
  id: string;
  date: string;
  kind: VehicleExpenseKind;
  amountCents: number;
  description?: string;
}

/**
 * Un véhicule. Supporte les DEUX niveaux de saisie demandés :
 *  - expenses[] : dépenses individuelles (essence, entretien...).
 *  - annualTotals : totaux annuels saisis directement par type (raccourci).
 * Le moteur additionne les deux sources pour obtenir le total par type.
 */
export interface Vehicle {
  id: string;
  name: string;
  expenses: VehicleExpense[];
  /** Totaux annuels saisis directement (en cents), par type. Optionnel. */
  annualTotals?: Partial<Record<VehicleExpenseKind, number>>;
}
