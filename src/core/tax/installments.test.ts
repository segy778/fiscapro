import { describe, it, expect } from 'vitest';
import { computeInstallments } from './installments';
import { loadFiscalConfig } from './loadConfig';
import type { TaxResult } from './types';

const config = loadFiscalConfig(2026);

function makeTax(federalTaxCents: number, provincialTaxCents: number): TaxResult {
  return {
    grossIncomeCents: 0, deductionsCents: 0, netBusinessIncomeCents: 0,
    rrq: { baseEmployeeCents: 0, baseEmployerCents: 0, firstAdditionalCents: 0, secondAdditionalCents: 0, totalCents: 0, deductibleCents: 0, federalCreditBaseCents: 0 },
    rqap: { totalCents: 0, deductibleCents: 0, federalCreditBaseCents: 0 },
    rrqCents: 0, rqapCents: 0,
    federalTaxableIncomeCents: 0, quebecTaxableIncomeCents: 0,
    federalTaxCents, provincialTaxCents,
    totalTaxCents: federalTaxCents + provincialTaxCents,
    suggestedSetAsideCents: 0,
  };
}

describe('computeInstallments', () => {
  it('aucun acompte sous les deux seuils', () => {
    // féd 2000 $ (< 3000), QC 1500 $ (< 1800)
    const s = computeInstallments(makeTax(200000, 150000), config);
    expect(s.federalRequired).toBe(false);
    expect(s.quebecRequired).toBe(false);
    expect(s.anyRequired).toBe(false);
    expect(s.payments.every((p) => p.totalCents === 0)).toBe(true);
  });

  it('acomptes Québec seulement (QC dépasse, féd non)', () => {
    // féd 2500 $ (< 3000), QC 2400 $ (> 1800)
    const s = computeInstallments(makeTax(250000, 240000), config);
    expect(s.federalRequired).toBe(false);
    expect(s.quebecRequired).toBe(true);
    expect(s.anyRequired).toBe(true);
    // 4 versements de 600 $ chacun pour le QC
    expect(s.payments[0]!.quebecCents).toBe(60000);
    expect(s.payments[0]!.federalCents).toBe(0);
  });

  it('acomptes fédéral et Québec (les deux dépassent)', () => {
    // féd 4000 $ (> 3000), QC 3000 $ (> 1800)
    const s = computeInstallments(makeTax(400000, 300000), config);
    expect(s.federalRequired).toBe(true);
    expect(s.quebecRequired).toBe(true);
    // féd : 4 x 1000 $, QC : 4 x 750 $
    expect(s.payments[0]!.federalCents).toBe(100000);
    expect(s.payments[0]!.quebecCents).toBe(75000);
    expect(s.payments[0]!.totalCents).toBe(175000);
  });

  it('exactement au seuil = pas d\'acompte (strictement supérieur requis)', () => {
    const s = computeInstallments(makeTax(300000, 180000), config);
    expect(s.federalRequired).toBe(false);
    expect(s.quebecRequired).toBe(false);
  });

  it('le total réparti égale l\'impôt (pas de perte d\'arrondi)', () => {
    // féd 4001 $ -> reste sur le dernier versement
    const s = computeInstallments(makeTax(400100, 0), config);
    const sum = s.payments.reduce((a, p) => a + p.federalCents, 0);
    expect(sum).toBe(400100);
  });

  it('produit 4 dates de versement', () => {
    const s = computeInstallments(makeTax(400000, 300000), config);
    expect(s.payments.map((p) => p.dueDate)).toEqual([
      '2026-03-15', '2026-06-15', '2026-09-15', '2026-12-15',
    ]);
  });
});
