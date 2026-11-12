import { describe, it, expect } from 'vitest';
import { buildAnnualReport } from './report';
import { loadFiscalConfig } from './loadConfig';
import type { Income, Expense } from '../models/income';
import type { Trip, Vehicle } from '../models/vehicle';

const config = loadFiscalConfig(2026);

const incomes: Income[] = [
  { id: 'i1', date: '2026-01-01', amountCents: 1000000, gstQstCollected: true },
  { id: 'i2', date: '2026-02-01', amountCents: 500000 },
];
const expenses: Expense[] = [
  { id: 'e1', date: '2026-01-05', amountCents: 10000, category: 'repas_representation', deductiblePercent: 0.5 },
  { id: 'e2', date: '2026-01-06', amountCents: 20000, category: 'fournitures_bureau', deductiblePercent: 1.0 },
  { id: 'e3', date: '2026-01-07', amountCents: 8000, category: 'fournitures_bureau', deductiblePercent: 1.0 },
  // dépense de catégorie véhicule -> exclue de la ventilation par catégorie,
  // mais comptée dans les frais de véhicule (au ratio d'usage)
  { id: 'e4', date: '2026-01-08', amountCents: 5000, category: 'essence_carburant', deductiblePercent: 1.0 },
];
const trips: Trip[] = [
  { id: 't1', date: '2026-01-10', businessKm: 80, personalKm: 20 },
];
const vehicle: Vehicle = {
  id: 'v1', name: 'Auto',
  expenses: [{ id: 've1', date: '2026-01-10', kind: 'essence', amountCents: 10000 }],
};

describe('buildAnnualReport', () => {
  const r = buildAnnualReport(config, incomes, expenses, trips, vehicle);

  it('totalise le revenu brut', () => {
    expect(r.grossIncomeCents).toBe(1500000);
    expect(r.incomeCount).toBe(2);
  });

  it('ventile les dépenses par catégorie (hors véhicule)', () => {
    const fournitures = r.expensesByCategory.find((c) => c.category === 'fournitures_bureau');
    expect(fournitures?.totalCents).toBe(28000); // 20000 + 8000
    expect(fournitures?.deductibleCents).toBe(28000); // 100 %
    const repas = r.expensesByCategory.find((c) => c.category === 'repas_representation');
    expect(repas?.deductibleCents).toBe(5000); // 50 % de 10000
    // la catégorie véhicule n'apparaît PAS dans la ventilation
    expect(r.expensesByCategory.find((c) => c.category === 'essence_carburant')).toBeUndefined();
  });

  it('calcule la déduction véhicule selon le ratio km (80 %)', () => {
    // ratio 80/100 = 0,8 ; frais véhicule 10000 (section Véhicule)
    // + 5000 (dépense « Essence ») = 15000 -> 12000 déductibles
    expect(r.km.businessRatio).toBeCloseTo(0.8, 5);
    expect(r.vehicleTotalCents).toBe(15000);
    expect(r.vehicleDeductibleCents).toBe(12000);
  });

  it('résume la TPS/TVQ perçue', () => {
    expect(r.gstQst.incomesWithGstQst).toBe(1);
    expect(r.gstQst.grossWithGstQstCents).toBe(1000000);
    // sans inscription, pas de détail salesTax
    expect(r.gstQst.registered).toBe(false);
    expect(r.gstQst.salesTax).toBeNull();
  });

  it('inclut le détail TPS/TVQ si inscrit aux taxes', () => {
    const r2 = buildAnnualReport(config, incomes, expenses, trips, vehicle, true);
    expect(r2.gstQst.registered).toBe(true);
    expect(r2.gstQst.salesTax).not.toBeNull();
    // TPS perçue = 5 % de 1 000 000 = 50000
    expect(r2.gstQst.salesTax?.gstCollectedCents).toBe(50000);
  });

  it('inclut un résultat fiscal cohérent', () => {
    expect(r.tax.grossIncomeCents).toBe(1500000);
    expect(r.tax.totalTaxCents).toBeGreaterThan(0);
  });
});
