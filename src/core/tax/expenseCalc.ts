// Calcul de la portion déductible des dépenses.
// Les frais de véhicule (vehicleProRata) sont traités à part via vehicleCalc,
// car ils dépendent du ratio d'usage commercial.

import type { FiscalConfig } from './fiscalConfig';
import type { Expense } from '../models/income';

/** Portion déductible d'une dépense non-véhicule, en cents. */
export function deductibleExpenseAmount(expense: Expense): number {
  return Math.round(expense.amountCents * expense.deductiblePercent);
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
): number {
  return expenses
    .filter((e) => !isVehicleProRata(e.category, config))
    .reduce((sum, e) => sum + deductibleExpenseAmount(e), 0);
}
