// Charge et type la configuration fiscale d'une année.
// Le JSON contient des champs de commentaire (_comment, _note...) ignorés par le typage.

import type { FiscalConfig } from './fiscalConfig';
import config2026 from '../../config/fiscal/2026.json';

const configs: Record<number, FiscalConfig> = {
  2026: config2026 as unknown as FiscalConfig,
};

export function loadFiscalConfig(year: number): FiscalConfig {
  const cfg = configs[year];
  if (!cfg) {
    throw new Error(`Aucune configuration fiscale pour l'année ${year}.`);
  }
  return cfg;
}
