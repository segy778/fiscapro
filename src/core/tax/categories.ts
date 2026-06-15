// Helpers pour exposer les catégories de dépenses de la config à l'UI.

import type { FiscalConfig } from './fiscalConfig';

export interface CategoryOption {
  value: string;
  label: string;
  /** % déductible par défaut (0..1). undefined si véhicule au prorata. */
  defaultDeductiblePercent?: number;
  vehicleProRata: boolean;
}

/** Liste les catégories de dépenses pour un menu déroulant. */
export function listExpenseCategories(config: FiscalConfig): CategoryOption[] {
  return Object.entries(config.expenseCategories)
    .filter(([key]) => !key.startsWith('_'))
    .map(([value, cfg]) => ({
      value,
      label: cfg.label,
      defaultDeductiblePercent: cfg.deductiblePercent,
      vehicleProRata: cfg.vehicleProRata === true,
    }));
}
