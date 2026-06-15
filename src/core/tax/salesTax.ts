// Calcul de la TPS/TVQ. Module PUR. Montants en cents.
//
// Règles (validées sources officielles 2026) :
//  - TPS 5 %, TVQ 9,975 %, calculées sur le montant AVANT taxes.
//  - Un autonome inscrit PERÇOIT la taxe sur ses revenus (à remettre) et
//    RÉCUPÈRE celle payée sur ses dépenses (CTI/RTI), proportionnellement au
//    % déductible de la dépense (ex. repas 50 % -> 50 % de la taxe récupérable).
//  - Remise nette = perçue - récupérable, séparément pour TPS et TVQ.

import type { FiscalConfig } from './fiscalConfig';
import type { Income, Expense } from '../models/income';

/** Taxes calculées (ou ajustées) sur un montant. */
export interface TaxAmounts {
  gstCents: number;
  qstCents: number;
}

/**
 * Calcule la TPS et la TVQ sur un montant AVANT taxes (en cents).
 * Arrondi au cent.
 */
export function computeSalesTax(amountCents: number, config: FiscalConfig): TaxAmounts {
  const base = amountCents > 0 ? amountCents : 0;
  return {
    gstCents: Math.round(base * config.salesTax.gstRate),
    qstCents: Math.round(base * config.salesTax.qstRate),
  };
}

/**
 * Taxe perçue sur un revenu : utilise les montants saisis s'ils existent,
 * sinon calcule depuis le montant. Ne compte que si gstQstCollected = true.
 */
export function incomeTaxCollected(income: Income, config: FiscalConfig): TaxAmounts {
  if (!income.gstQstCollected) {
    return { gstCents: 0, qstCents: 0 };
  }
  if (income.gstCents !== undefined && income.qstCents !== undefined) {
    return { gstCents: income.gstCents, qstCents: income.qstCents };
  }
  return computeSalesTax(income.amountCents, config);
}

/**
 * Taxe récupérable (CTI/RTI) sur une dépense : la taxe payée, calculée ou
 * saisie, multipliée par le % déductible de la dépense.
 */
export function expenseTaxRecoverable(expense: Expense, config: FiscalConfig): TaxAmounts {
  const paid: TaxAmounts =
    expense.gstCents !== undefined && expense.qstCents !== undefined
      ? { gstCents: expense.gstCents, qstCents: expense.qstCents }
      : computeSalesTax(expense.amountCents, config);
  return {
    gstCents: Math.round(paid.gstCents * expense.deductiblePercent),
    qstCents: Math.round(paid.qstCents * expense.deductiblePercent),
  };
}

/** Sommaire TPS/TVQ : perçue, récupérable, remise nette. */
export interface SalesTaxSummary {
  gstCollectedCents: number;
  qstCollectedCents: number;
  gstRecoverableCents: number;
  qstRecoverableCents: number;
  /** Remise nette = perçue - récupérable (peut être négative = remboursement). */
  gstNetCents: number;
  qstNetCents: number;
}

export function buildSalesTaxSummary(
  incomes: Income[],
  expenses: Expense[],
  config: FiscalConfig,
): SalesTaxSummary {
  let gstCollected = 0;
  let qstCollected = 0;
  for (const inc of incomes) {
    const t = incomeTaxCollected(inc, config);
    gstCollected += t.gstCents;
    qstCollected += t.qstCents;
  }
  let gstRecoverable = 0;
  let qstRecoverable = 0;
  for (const exp of expenses) {
    const t = expenseTaxRecoverable(exp, config);
    gstRecoverable += t.gstCents;
    qstRecoverable += t.qstCents;
  }
  return {
    gstCollectedCents: gstCollected,
    qstCollectedCents: qstCollected,
    gstRecoverableCents: gstRecoverable,
    qstRecoverableCents: qstRecoverable,
    gstNetCents: gstCollected - gstRecoverable,
    qstNetCents: qstCollected - qstRecoverable,
  };
}
