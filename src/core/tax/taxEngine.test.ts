import { describe, it, expect } from 'vitest';
import {
  computeProgressiveTax,
  computeRrq,
  computeRqap,
  computeTax,
} from './taxEngine';
import { loadFiscalConfig } from './loadConfig';
import type { TaxInput } from './types';

const config = loadFiscalConfig(2026);

describe('computeProgressiveTax', () => {
  it('retourne 0 pour un revenu nul ou négatif', () => {
    expect(computeProgressiveTax(0, config.federalBrackets)).toBe(0);
    expect(computeProgressiveTax(-1000, config.federalBrackets)).toBe(0);
  });

  it('impose dans la première tranche fédérale (14 %)', () => {
    // 10 000 $ -> 14 %
    expect(computeProgressiveTax(1000000, config.federalBrackets)).toBe(140000);
  });

  it('impose à cheval sur deux tranches fédérales', () => {
    // 60 000 $ : 58 523 $ x 14 % + 1 477 $ x 20,5 %
    const expected = Math.round(5852300 * 0.14 + (6000000 - 5852300) * 0.205);
    expect(computeProgressiveTax(6000000, config.federalBrackets)).toBe(expected);
  });
});

describe('computeRrq (travailleur autonome, deux parts)', () => {
  it('ne cotise pas sous l\'exemption de 3 500 $', () => {
    const r = computeRrq(350000, config);
    expect(r.totalCents).toBe(0);
  });

  it('décompose correctement à 50 000 $', () => {
    const r = computeRrq(5000000, config);
    // base : (50000-3500) x 10,6 % = 4929 $
    expect(r.baseEmployeeCents + r.baseEmployerCents).toBe(Math.round((5000000 - 350000) * 0.106));
    // 1er suppl : (50000-3500) x 2 % = 930 $
    expect(r.firstAdditionalCents).toBe(Math.round((5000000 - 350000) * 0.02));
    // pas de 2e suppl sous le MGA
    expect(r.secondAdditionalCents).toBe(0);
    expect(r.totalCents).toBe(585900);
    // déductible = employeur base + bonifié
    expect(r.deductibleCents).toBe(r.baseEmployerCents + r.firstAdditionalCents);
  });

  it('plafonne au MSGA (85 000 $) et inclut le 2e supplémentaire', () => {
    const r = computeRrq(9000000, config); // 90 000 $ > MSGA
    // 2e suppl : (85000-74600) x 8 % = 832 $
    expect(r.secondAdditionalCents).toBe(Math.round((8500000 - 7460000) * 0.08));
  });
});

describe('computeRqap', () => {
  it('calcule la cotisation à 50 000 $', () => {
    const r = computeRqap(5000000, config);
    expect(r.totalCents).toBe(Math.round(5000000 * 0.00764));
  });
  it('plafonne au MRA (103 000 $)', () => {
    const r = computeRqap(12000000, config);
    expect(r.totalCents).toBe(Math.round(10300000 * 0.00764));
  });
});

describe('computeTax (cas de référence 50 000 $)', () => {
  const input: TaxInput = { grossIncomeCents: 5000000, deductibleExpensesCents: 0 };
  const result = computeTax(input, config);

  it('revenu net = brut - dépenses', () => {
    expect(result.netBusinessIncomeCents).toBe(5000000);
  });
  it('RRQ correspond à la référence', () => {
    expect(result.rrqCents).toBe(585900);
  });
  it('RQAP correspond à la référence', () => {
    expect(result.rqapCents).toBe(38200);
  });
  it('impôt fédéral (après abattement 16,5 %) correspond à la référence', () => {
    expect(result.federalTaxCents).toBe(319219);
  });
  it('impôt provincial correspond à la référence', () => {
    expect(result.provincialTaxCents).toBe(384475);
  });
  it('total à payer correspond à la référence', () => {
    expect(result.totalTaxCents).toBe(1327794);
  });
  it('provision arrondie au dollar supérieur', () => {
    expect(result.suggestedSetAsideCents).toBe(1327800);
  });
});

describe('computeTax (revenus faibles)', () => {
  it('aucun impôt sous les montants de base, mais cotisations dues', () => {
    const result = computeTax({ grossIncomeCents: 1500000, deductibleExpensesCents: 0 }, config);
    expect(result.federalTaxCents).toBe(0);
    expect(result.provincialTaxCents).toBe(0);
    expect(result.rrqCents).toBeGreaterThan(0);
  });
});
