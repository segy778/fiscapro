// Agrège revenus et dépenses déductibles par mois pour le graphique.

import type { Income, Expense } from '../../core/models/income';
import { deductibleExpenseAmount } from '../../core/tax/expenseCalc';
import type { FiscalConfig } from '../../core/tax/fiscalConfig';

const MOIS = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc'];

export interface MonthlyPoint {
  mois: string;
  revenus: number;   // en dollars (pour l'affichage du graphique)
  depenses: number;
}

export function buildMonthlySeries(
  incomes: Income[],
  expenses: Expense[],
  config: FiscalConfig,
  taxRegistered: boolean,
): MonthlyPoint[] {
  const series: MonthlyPoint[] = MOIS.map((mois) => ({ mois, revenus: 0, depenses: 0 }));
  for (const inc of incomes) {
    const m = new Date(inc.date + 'T00:00:00').getMonth();
    series[m]!.revenus += inc.amountCents / 100;
  }
  for (const exp of expenses) {
    const m = new Date(exp.date + 'T00:00:00').getMonth();
    series[m]!.depenses += deductibleExpenseAmount(exp, config, taxRegistered) / 100;
  }
  return series;
}
