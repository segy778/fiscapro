import { describe, it, expect } from 'vitest';
import {
  computeSalesTax,
  incomeTaxCollected,
  expenseTaxRecoverable,
  buildSalesTaxSummary,
  extractSalesTaxFromTotal,
  splitIncomeTotal,
} from './salesTax';
import { deductibleExpenseAmount } from './expenseCalc';
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
    // 1 149,75 $ taxes comprises = 1 000 $ + 50 $ TPS + 99,75 $ TVQ
    const exp: Expense = { id: '1', date: '2026-01-01', amountCents: 114975, category: 'fournitures_bureau', deductiblePercent: 1.0 };
    expect(expenseTaxRecoverable(exp, config)).toEqual({ gstCents: 5000, qstCents: 9975 });
  });
  it('récupère 50 % de la taxe sur un repas (déductible 50 %)', () => {
    const exp: Expense = { id: '1', date: '2026-01-01', amountCents: 114975, category: 'repas_representation', deductiblePercent: 0.5 };
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
      { id: 'e1', date: '2026-01-02', amountCents: 114975, category: 'fournitures_bureau', deductiblePercent: 1.0 }, // total TTC -> récup 5000 / 9975
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

describe('extractSalesTaxFromTotal', () => {
  it('extrait la TPS et la TVQ d\'un total taxes comprises', () => {
    // 114,98 $ = 100,00 $ + 5,00 $ TPS + 9,98 $ TVQ
    expect(extractSalesTaxFromTotal(11498, config)).toEqual({ gstCents: 500, qstCents: 998 });
  });
  it('retourne 0 pour un montant nul ou négatif', () => {
    expect(extractSalesTaxFromTotal(0, config)).toEqual({ gstCents: 0, qstCents: 0 });
    expect(extractSalesTaxFromTotal(-500, config)).toEqual({ gstCents: 0, qstCents: 0 });
  });
  it('utilise les taxes saisies plutôt que l\'extraction (ex. assurance)', () => {
    const exp: Expense = { id: '1', date: '2026-01-01', amountCents: 50000, category: 'autre', deductiblePercent: 1.0, gstCents: 0, qstCents: 0 };
    expect(expenseTaxRecoverable(exp, config)).toEqual({ gstCents: 0, qstCents: 0 });
  });
});

describe('deductibleExpenseAmount (montant = total taxes comprises)', () => {
  const office: Expense = { id: '1', date: '2026-01-01', amountCents: 11498, category: 'fournitures_bureau', deductiblePercent: 1.0 };
  const meal: Expense = { id: '2', date: '2026-01-01', amountCents: 11498, category: 'repas_representation', deductiblePercent: 0.5 };

  it('non inscrit : la taxe fait partie du coût, tout le total est déductible', () => {
    expect(deductibleExpenseAmount(office, config, false)).toBe(11498);
  });
  it('inscrit : la taxe récupérée n\'est pas déduite une deuxième fois', () => {
    // 114,98 $ - 14,98 $ récupérés = 100,00 $
    expect(deductibleExpenseAmount(office, config, true)).toBe(10000);
  });
  it('inscrit, repas à 50 % : (total - taxe récupérée à 50 %) x 50 %', () => {
    // récupérable = 2,50 $ + 4,99 $ = 7,49 $ ; (114,98 - 7,49) x 50 % = 53,745 -> 53,75 $
    expect(deductibleExpenseAmount(meal, config, true)).toBe(5375);
  });
  it('non inscrit, repas à 50 % : total x 50 %', () => {
    expect(deductibleExpenseAmount(meal, config, false)).toBe(5749);
  });
});

describe('splitIncomeTotal', () => {
  it('ventile un total en montant avant taxes + TPS + TVQ, sans perte de cent', () => {
    const split = splitIncomeTotal(11498, config);
    expect(split).toEqual({ amountCents: 10000, gstCents: 500, qstCents: 998 });
    expect(split.amountCents + split.gstCents + split.qstCents).toBe(11498);
  });
  it('utilise les taxes saisies manuellement si fournies', () => {
    expect(splitIncomeTotal(10500, config, { gstCents: 500, qstCents: 0 })).toEqual({
      amountCents: 10000, gstCents: 500, qstCents: 0,
    });
  });
});

describe('buildSalesTaxSummary — frais de véhicule', () => {
  it('exclut les dépenses au prorata et ajoute la taxe récupérable du véhicule', () => {
    const expenses: Expense[] = [
      { id: 'e', date: '2026-01-01', amountCents: 11498, category: 'essence_carburant', deductiblePercent: 1 },
    ];
    const s = buildSalesTaxSummary([], expenses, config, { gstCents: 400, qstCents: 798 });
    expect(s.gstRecoverableCents).toBe(400);
    expect(s.qstRecoverableCents).toBe(798);
  });
});
