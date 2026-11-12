// Calcul de la TPS/TVQ. Module PUR. Montants en cents.
//
// Règles (validées sources officielles 2026) :
//  - TPS 5 %, TVQ 9,975 %, calculées sur le montant AVANT taxes.
//  - Un autonome inscrit PERÇOIT la taxe sur ses revenus (à remettre) et
//    RÉCUPÈRE celle payée sur ses dépenses (CTI/RTI), proportionnellement au
//    % déductible de la dépense (ex. repas 50 % -> 50 % de la taxe récupérable).
//  - Remise nette = perçue - récupérable, séparément pour TPS et TVQ.
//  - Le montant d'une DÉPENSE est le TOTAL PAYÉ, taxes comprises (c'est ce que
//    l'utilisateur lit sur sa facture). La taxe payée en est extraite.

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
 * Extrait la TPS et la TVQ d'un montant TAXES COMPRISES (en cents).
 * Montant avant taxes = total / (1 + TPS + TVQ), puis chaque taxe sur ce montant.
 */
export function extractSalesTaxFromTotal(totalCents: number, config: FiscalConfig): TaxAmounts {
  const total = totalCents > 0 ? totalCents : 0;
  const { gstRate, qstRate } = config.salesTax;
  const beforeTax = Math.round(total / (1 + gstRate + qstRate));
  return {
    gstCents: Math.round(beforeTax * gstRate),
    qstCents: Math.round(beforeTax * qstRate),
  };
}

/** Revenu ventilé : montant avant taxes + taxes perçues. */
export interface IncomeSplit {
  amountCents: number;
  gstCents: number;
  qstCents: number;
}

/**
 * Ventile un revenu saisi TAXES COMPRISES en montant avant taxes + TPS/TVQ.
 * Les taxes saisies manuellement (si fournies) priment sur l'extraction.
 * Le montant avant taxes est le reste, pour que la somme égale le total.
 */
export function splitIncomeTotal(
  totalCents: number,
  config: FiscalConfig,
  manualTaxes?: TaxAmounts,
): IncomeSplit {
  const taxes = manualTaxes ?? extractSalesTaxFromTotal(totalCents, config);
  return {
    amountCents: totalCents - taxes.gstCents - taxes.qstCents,
    gstCents: taxes.gstCents,
    qstCents: taxes.qstCents,
  };
}

/**
 * Taxe payée sur une dépense : montants saisis s'ils existent (ex. facture
 * sans taxe, assurance), sinon extraite du total taxes comprises.
 */
export function expenseTaxPaid(expense: Expense, config: FiscalConfig): TaxAmounts {
  if (expense.gstCents !== undefined && expense.qstCents !== undefined) {
    return { gstCents: expense.gstCents, qstCents: expense.qstCents };
  }
  return extractSalesTaxFromTotal(expense.amountCents, config);
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
 * Taxe récupérable (CTI/RTI) sur une dépense : la taxe payée (extraite du
 * total ou saisie), multipliée par le % déductible de la dépense.
 */
export function expenseTaxRecoverable(expense: Expense, config: FiscalConfig): TaxAmounts {
  const paid = expenseTaxPaid(expense, config);
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

/**
 * Les dépenses « au prorata du véhicule » sont exclues ici : leur taxe
 * récupérable dépend du ratio d'usage commercial et est calculée par
 * computeVehicleCosts, puis passée dans `vehicleRecoverable`.
 */
export function buildSalesTaxSummary(
  incomes: Income[],
  expenses: Expense[],
  config: FiscalConfig,
  vehicleRecoverable: TaxAmounts = { gstCents: 0, qstCents: 0 },
): SalesTaxSummary {
  let gstCollected = 0;
  let qstCollected = 0;
  for (const inc of incomes) {
    const t = incomeTaxCollected(inc, config);
    gstCollected += t.gstCents;
    qstCollected += t.qstCents;
  }
  let gstRecoverable = vehicleRecoverable.gstCents;
  let qstRecoverable = vehicleRecoverable.qstCents;
  for (const exp of expenses) {
    if (config.expenseCategories[exp.category]?.vehicleProRata === true) continue;
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
