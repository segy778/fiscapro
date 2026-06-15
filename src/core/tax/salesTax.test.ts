import { describe, it, expect } from 'vitest';
import {
  computeSalesTax,
  incomeTaxCollected,
  expenseTaxRecoverable,
  buildSalesTaxSummary,
} from './salesTax';
import { loadFiscalConfig } from './loadConfig';
import type { Income, Expense } from '../models/income';

const config = loadFiscalConfig(2026);

describe('computeSalesTax', () => {
  it('calcule TPS 5 % et TVQ 9,975 % sur 1 000 $', () => {
    const t = computeSalesTax(100000, config);
    expect(t.gstCents).toBe(5000);   // 5 %
    expect(t.qstCents).toBe(9975);   // 9,975 %
  });
  it('retourne 0 pour un montant nul', () => {
    expect(computeSalesTax(0, config)).toEqual({ gstCents: 0, qstCents: 0 });
  });
});

describe('incomeTaxCollected', () => {
  it('ne perçoit rien si gstQstCollected est faux', () => {
    const inc: Income = { id: '1', date: '2026-01-01', amountCents: 100000 };
    expect(incomeTaxCollected(inc, config)).toEqual({ gstCents: 0, qstCents: 0 });
  });
  it('calcule la taxe si perçue', () => {
    const inc: Income = { id: '1', date: '2026-01-01', amountCents: 100000, gstQstCollected: true };
    expect(incomeTaxCollected(inc, config)).toEqual({ gstCents: 5000, qstCents: 9975 });
  });
  it('utilise les montants saisis s\'ils existent', () => {
    const inc: Income = {
      id: '1', date: '2026-01-01', amountCents: 100000,
      gstQstCollected: true, gstCents: 4000, qstCents: 8000,
    };
    expect(incomeTaxCollected(inc, config)).toEqual({ gstCents: 4000, qstCents: 8000 });
  });
});

describe('expenseTaxRecoverable', () => {
  it('récupère 100 % de la taxe sur une dépense déductible à 100 %', () => {
    const exp: Expense = { id: '1', date: '2026-01-01', amountCents: 100000, category: 'fournitures_bureau', deductiblePercent: 1.0 };
    expect(expenseTaxRecoverable(exp, config)).toEqual({ gstCents: 5000, qstCents: 9975 });
  });
  it('récupère 50 % de la taxe sur un repas (déductible 50 %)', () => {
    const exp: Expense = { id: '1', date: '2026-01-01', amountCents: 100000, category: 'repas_representation', deductiblePercent: 0.5 };
    const t = expenseTaxRecoverable(exp, config);
    expect(t.gstCents).toBe(2500);   // 50 % de 5000
    expect(t.qstCents).toBe(4988);   // 50 % de 9975, arrondi
  });
});

describe('buildSalesTaxSummary', () => {
  it('calcule la remise nette (perçue - récupérable)', () => {
    const incomes: Income[] = [
      { id: 'i1', date: '2026-01-01', amountCents: 1000000, gstQstCollected: true }, // perçoit 50000 TPS / 99750 TVQ
    ];
    const expenses: Expense[] = [
      { id: 'e1', date: '2026-01-02', amountCents: 100000, category: 'fournitures_bureau', deductiblePercent: 1.0 }, // récup 5000 / 9975
    ];
    const s = buildSalesTaxSummary(incomes, expenses, config);
    expect(s.gstCollectedCents).toBe(50000);
    expect(s.gstRecoverableCents).toBe(5000);
    expect(s.gstNetCents).toBe(45000);
    expect(s.qstCollectedCents).toBe(99750);
    expect(s.qstRecoverableCents).toBe(9975);
    expect(s.qstNetCents).toBe(89775);
  });
});
