// Moteur de calcul fiscal — travailleur autonome du Québec.
//
// Règles (CLAUDE.md) :
//  - Fonctions PURES, aucun effet de bord, aucune dépendance UI.
//  - AUCUN chiffre fiscal en dur : tout vient de `config` (FiscalConfig).
//  - Montants en CENTS (entiers).
//
// ⚠️ ESTIMATION, pas un avis fiscal. Avertissement obligatoire côté UI.
//
// Traitement RRQ (validé sources officielles 2026) :
//  - Base (10,6 % total) : part employé -> CRÉDIT fédéral; part employeur -> DÉDUCTION.
//    Au Québec : part employé -> aucun allègement (déjà dans montant de base);
//    part employeur -> déduction.
//  - 1er + 2e supplémentaires (bonifié) : entièrement DÉDUCTIBLES (féd et QC).

import type { FiscalConfig, TaxBracket } from './fiscalConfig';
import type {
  TaxInput,
  TaxResult,
  RrqBreakdown,
  RqapBreakdown,
} from './types';

/** Borne basse à 0 (jamais de montant négatif). */
function nonNeg(n: number): number {
  return n > 0 ? n : 0;
}

/** Portion d'un revenu comprise entre deux bornes (en cents), bornée à >= 0. */
function earningsInBand(incomeCents: number, fromCents: number, toCents: number): number {
  return nonNeg(Math.min(incomeCents, toCents) - fromCents);
}

/**
 * Applique un barème progressif à un revenu imposable (en cents).
 * Somme des (portion dans la tranche × taux) sur toutes les tranches.
 */
export function computeProgressiveTax(
  taxableIncomeCents: number,
  brackets: TaxBracket[],
): number {
  const income = nonNeg(taxableIncomeCents);
  let tax = 0;
  let lowerCents = 0;
  for (const bracket of brackets) {
    const upper = bracket.upToCents ?? Infinity;
    const portion = nonNeg(Math.min(income, upper) - lowerCents);
    if (portion <= 0) break;
    tax += portion * bracket.rate;
    lowerCents = upper;
    if (income <= upper) break;
  }
  return Math.round(tax);
}

/**
 * Cotisation RRQ du travailleur autonome (deux parts), décomposée.
 * Permet de séparer crédit (base employé) et déduction (base employeur + bonifié).
 */
export function computeRrq(netIncomeCents: number, config: FiscalConfig): RrqBreakdown {
  const { rrq } = config;
  const income = nonNeg(netIncomeCents);
  const { base, firstAdditional, secondAdditional } = rrq.components;

  // Assiettes
  const baseEarnings = earningsInBand(income, base.fromCents, base.toCents);
  const firstEarnings = earningsInBand(income, firstAdditional.fromCents, firstAdditional.toCents);
  const secondEarnings = earningsInBand(income, secondAdditional.fromCents, secondAdditional.toCents);

  // Cotisations par composante (taux totaux = deux parts)
  const baseTotal = baseEarnings * base.totalRate;
  const baseEmployee = Math.round(baseTotal * rrq.employeeShare);
  const baseEmployer = Math.round(baseTotal - baseEmployee);
  const firstAdditionalCents = Math.round(firstEarnings * firstAdditional.totalRate);
  const secondAdditionalCents = Math.round(secondEarnings * secondAdditional.totalRate);

  const totalCents = baseEmployee + baseEmployer + firstAdditionalCents + secondAdditionalCents;

  // Déductible = base employeur + tout le bonifié (1er + 2e suppl.)
  const deductibleCents = baseEmployer + firstAdditionalCents + secondAdditionalCents;
  // Crédit fédéral = base part employé
  const federalCreditBaseCents = baseEmployee;

  return {
    baseEmployeeCents: baseEmployee,
    baseEmployerCents: baseEmployer,
    firstAdditionalCents,
    secondAdditionalCents,
    totalCents,
    deductibleCents,
    federalCreditBaseCents,
  };
}

/**
 * Cotisation RQAP du travailleur autonome, décomposée.
 * Part employeur déductible; part employé -> crédit fédéral.
 */
export function computeRqap(netIncomeCents: number, config: FiscalConfig): RqapBreakdown {
  const { rqap } = config;
  const insurable = Math.min(nonNeg(netIncomeCents), rqap.maxInsurableEarningsCents);
  const totalCents = Math.round(insurable * rqap.selfEmployedRate);
  const federalCreditBaseCents = Math.round(totalCents * rqap.employeeShare);
  const deductibleCents = totalCents - federalCreditBaseCents; // part employeur
  return { totalCents, deductibleCents, federalCreditBaseCents };
}

/**
 * Crédit pour montant personnel de base, en cents.
 * Crédit = montant de base × taux de crédit.
 */
export function computeBasicCredit(basicAmountCents: number, creditRate: number): number {
  return Math.round(nonNeg(basicAmountCents) * creditRate);
}

/**
 * Calcul fiscal complet. Orchestration :
 *  1. netBusinessIncome = grossIncome - deductibleExpenses
 *  2. RRQ et RQAP sur le revenu net d'entreprise
 *  3. Déductions au revenu net (féd et QC) : part déductible RRQ + RQAP
 *  4. Impôt fédéral = barème(revenu imposable féd) - crédit de base féd
 *       - crédit part employé RRQ/RQAP (au taux de crédit féd)
 *     puis abattement Québec : × (1 - tauxAbattement)
 *  5. Impôt provincial = barème(revenu imposable QC) - crédit de base QC
 *  6. totalTax = féd net + provincial + RRQ + RQAP
 *  7. suggestedSetAside = totalTax, arrondi au dollar supérieur
 */
export function computeTax(input: TaxInput, config: FiscalConfig): TaxResult {
  const grossIncomeCents = nonNeg(input.grossIncomeCents);
  const deductionsCents = nonNeg(input.deductibleExpensesCents);
  const netBusinessIncomeCents = nonNeg(grossIncomeCents - deductionsCents);

  // 2. Cotisations
  const rrq = computeRrq(netBusinessIncomeCents, config);
  const rqap = computeRqap(netBusinessIncomeCents, config);

  // 3. Déductions au revenu net
  //    Fédéral : part déductible RRQ + part employeur RQAP
  const federalDeductionCents = rrq.deductibleCents + rqap.deductibleCents;
  //    Québec : même logique (part employeur base + bonifié + part employeur RQAP)
  const quebecDeductionCents = rrq.deductibleCents + rqap.deductibleCents;

  const federalTaxableIncomeCents = nonNeg(netBusinessIncomeCents - federalDeductionCents);
  const quebecTaxableIncomeCents = nonNeg(netBusinessIncomeCents - quebecDeductionCents);

  // 4. Impôt fédéral
  const federalGross = computeProgressiveTax(federalTaxableIncomeCents, config.federalBrackets);
  const federalBasicCredit = computeBasicCredit(
    config.basicPersonalAmount.federalCents,
    config.creditRates.federal,
  );
  // Crédit fédéral pour part employé RRQ + RQAP (au taux de crédit fédéral)
  const federalContribCredit = Math.round(
    (rrq.federalCreditBaseCents + rqap.federalCreditBaseCents) * config.creditRates.federal,
  );
  const federalAfterCredits = nonNeg(federalGross - federalBasicCredit - federalContribCredit);
  // Abattement du Québec
  const federalTaxCents = Math.round(federalAfterCredits * (1 - config.quebecAbatement.rate));

  // 5. Impôt provincial
  const quebecGross = computeProgressiveTax(quebecTaxableIncomeCents, config.quebecBrackets);
  const quebecBasicCredit = computeBasicCredit(
    config.basicPersonalAmount.quebecCents,
    config.creditRates.quebec,
  );
  // Québec : part employé base = aucun allègement distinct (déjà dans montant de base)
  const provincialTaxCents = nonNeg(quebecGross - quebecBasicCredit);

  // 6. Total
  const totalTaxCents =
    federalTaxCents + provincialTaxCents + rrq.totalCents + rqap.totalCents;

  // 7. Provision = total dû, arrondi au dollar supérieur (sécuritaire sans fausser)
  const suggestedSetAsideCents = Math.ceil(totalTaxCents / 100) * 100;

  return {
    grossIncomeCents,
    deductionsCents,
    netBusinessIncomeCents,
    rrq,
    rqap,
    rrqCents: rrq.totalCents,
    rqapCents: rqap.totalCents,
    federalTaxableIncomeCents,
    quebecTaxableIncomeCents,
    federalTaxCents,
    provincialTaxCents,
    totalTaxCents,
    suggestedSetAsideCents,
  };
}
