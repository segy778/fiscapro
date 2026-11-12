// Calcul de la portion déductible des dépenses.
// Les frais de véhicule (vehicleProRata) sont traités à part via vehicleCalc,
// car ils dépendent du ratio d'usage commercial.

import type { FiscalConfig } from './fiscalConfig';
import type { Expense } from '../models/income';
import { expenseTaxRecoverable } from './salesTax';

/**
 * Portion déductible d'une dépense non-véhicule, en cents.
 *
 * Le montant saisi est le TOTAL PAYÉ, taxes comprises.
 *  - Non inscrit aux taxes : la taxe n'est pas récupérable, elle fait partie
 *    du coût. Déductible = total × % déductible.
 *  - Inscrit : la taxe récupérée en CTI/RTI ne fait pas partie du coût (sinon
 *    elle serait comptée deux fois). Déductible = (total − taxe récupérable)
 *    × % déductible.
 */
export function deductibleExpenseAmount(
  expense: Expense,
  config: FiscalConfig,
  taxRegistered: boolean,
): number {
  let costCents = expense.amountCents;
  if (taxRegistered) {
    const recoverable = expenseTaxRecoverable(expense, config);
    costCents -= recoverable.gstCents + recoverable.qstCents;
  }
  return Math.round(costCents * expense.deductiblePercent);
}

/** true si la catégorie est de type « véhicule au prorata ». */
export function isVehicleProRata(category: string, config: FiscalConfig): boolean {
  return config.expenseCategories[category]?.vehicleProRata === true;
}

/**
 * Somme des portions déductibles des dépenses NON-véhicule.
 * Les dépenses véhicule sont exclues ici (calculées via le ratio km).
 */
export function totalDeductibleNonVehicle(
  expenses: Expense[],
  config: FiscalConfig,
  taxRegistered: boolean,
): number {
  return expenses
    .filter((e) => !isVehicleProRata(e.category, config))
    .reduce((sum, e) => sum + deductibleExpenseAmount(e, config, taxRegistered), 0);
}
