// Types d'entrée et de sortie du moteur de calcul fiscal.
// Montants en CENTS (entiers). Aucune dépendance UI.

/** Données d'entrée agrégées pour une année d'imposition. */
export interface TaxInput {
  /** Revenu brut d'entreprise de l'année, en cents. */
  grossIncomeCents: number;
  /** Total des dépenses déjà ramenées à leur portion déductible, en cents
   *  (inclut la portion déductible des frais de véhicule). */
  deductibleExpensesCents: number;
}

/** Détail de la cotisation RRQ décomposée (montants en cents). */
export interface RrqBreakdown {
  /** Cotisation de base, part employé. */
  baseEmployeeCents: number;
  /** Cotisation de base, part employeur. */
  baseEmployerCents: number;
  /** 1er supplémentaire (bonifié), total. */
  firstAdditionalCents: number;
  /** 2e supplémentaire (bonifié), total. */
  secondAdditionalCents: number;
  /** Total RRQ (somme de toutes les composantes). */
  totalCents: number;
  /** Portion déductible du revenu net (employeur base + tout le bonifié). */
  deductibleCents: number;
  /** Portion donnant droit à un crédit fédéral (base employé). */
  federalCreditBaseCents: number;
}

/** Détail de la cotisation RQAP (montants en cents). */
export interface RqapBreakdown {
  totalCents: number;
  deductibleCents: number;
  federalCreditBaseCents: number;
}

/** Résultat détaillé du calcul fiscal. Montants en cents. */
export interface TaxResult {
  grossIncomeCents: number;
  deductionsCents: number;
  /** Revenu net d'entreprise = brut - dépenses déductibles. */
  netBusinessIncomeCents: number;

  // Cotisations sociales (travailleur autonome : deux parts)
  rrq: RrqBreakdown;
  rqap: RqapBreakdown;
  rrqCents: number; // raccourci = rrq.totalCents
  rqapCents: number; // raccourci = rqap.totalCents

  // Revenus imposables après déductions (diffèrent féd/QC)
  federalTaxableIncomeCents: number;
  quebecTaxableIncomeCents: number;

  // Impôts
  federalTaxCents: number;   // après crédits et abattement du Québec
  provincialTaxCents: number; // après crédits
  totalTaxCents: number;     // fédéral + provincial + RRQ + RQAP

  /** Montant suggéré à mettre de côté (provision fiscale). */
  suggestedSetAsideCents: number;
}
