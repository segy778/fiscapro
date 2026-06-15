// Acomptes provisionnels. Module PUR. Montants en cents.
//
// Règles (validées sources officielles 2026) :
//  - Seuils d'impôt NET évalués PAR ADMINISTRATION : fédéral 3 000 $, Québec 1 800 $.
//  - L'assiette est l'IMPÔT seul (fédéral d'un côté, provincial de l'autre).
//    RRQ et RQAP ne font PAS l'objet d'acomptes; ils sont réglés à la production.
//  - Si un seuil est franchi, 4 versements égaux aux dates officielles
//    (15 mars, 15 juin, 15 sept, 15 déc).
//  - NOTE : la règle officielle évalue aussi l'année antérieure; l'app n'a que
//    l'année courante, donc c'est une estimation prudente sur l'année en cours.

import type { FiscalConfig } from './fiscalConfig';
import type { TaxResult } from './types';

export interface InstallmentSchedule {
  /** Le seuil fédéral est-il franchi (impôt fédéral > seuil) ? */
  federalRequired: boolean;
  /** Le seuil provincial est-il franchi ? */
  quebecRequired: boolean;
  /** Au moins une administration requiert des acomptes. */
  anyRequired: boolean;

  federalThresholdCents: number;
  quebecThresholdCents: number;

  /** Impôt fédéral servant d'assiette (après abattement). */
  federalTaxCents: number;
  /** Impôt provincial servant d'assiette. */
  provincialTaxCents: number;

  /** Montant fédéral par versement (0 si non requis). */
  federalPerInstallmentCents: number;
  /** Montant provincial par versement (0 si non requis). */
  quebecPerInstallmentCents: number;

  /** Versements aux 4 dates : date + montant total (féd + prov). */
  payments: { dueDate: string; federalCents: number; quebecCents: number; totalCents: number }[];
}

/** Répartit un montant en n versements égaux, le reste sur le dernier. */
function splitEvenly(totalCents: number, n: number): number[] {
  if (n <= 0) return [];
  const base = Math.floor(totalCents / n);
  const parts = Array.from({ length: n }, () => base);
  const remainder = totalCents - base * n;
  if (parts.length > 0) {
    parts[parts.length - 1] = (parts[parts.length - 1] ?? 0) + remainder;
  }
  return parts;
}

export function computeInstallments(tax: TaxResult, config: FiscalConfig): InstallmentSchedule {
  const { installments } = config;
  const dates = installments.dueDates;
  const n = dates.length;

  const federalTaxCents = tax.federalTaxCents;
  const provincialTaxCents = tax.provincialTaxCents;

  const federalRequired = federalTaxCents > installments.federalThresholdCents;
  const quebecRequired = provincialTaxCents > installments.quebecThresholdCents;

  const fedParts = federalRequired ? splitEvenly(federalTaxCents, n) : new Array(n).fill(0);
  const qcParts = quebecRequired ? splitEvenly(provincialTaxCents, n) : new Array(n).fill(0);

  const payments = dates.map((dueDate, i) => {
    const federalCents = fedParts[i] ?? 0;
    const quebecCents = qcParts[i] ?? 0;
    return { dueDate, federalCents, quebecCents, totalCents: federalCents + quebecCents };
  });

  return {
    federalRequired,
    quebecRequired,
    anyRequired: federalRequired || quebecRequired,
    federalThresholdCents: installments.federalThresholdCents,
    quebecThresholdCents: installments.quebecThresholdCents,
    federalTaxCents,
    provincialTaxCents,
    federalPerInstallmentCents: federalRequired ? Math.floor(federalTaxCents / n) : 0,
    quebecPerInstallmentCents: quebecRequired ? Math.floor(provincialTaxCents / n) : 0,
    payments,
  };
}
