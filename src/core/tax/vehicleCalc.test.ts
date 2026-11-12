import { describe, it, expect } from 'vitest';
import {
  summarizeKm,
  totalVehicleExpensesByKind,
  totalVehicleExpenses,
  deductibleVehicleExpenses,
  computeVehicleCosts,
} from './vehicleCalc';
import { loadFiscalConfig } from './loadConfig';
import type { Trip, Vehicle } from '../models/vehicle';
import type { Expense } from '../models/income';

const trips: Trip[] = [
  { id: '1', date: '2026-01-05', businessKm: 100, personalKm: 50 },
  { id: '2', date: '2026-01-06', businessKm: 200, personalKm: 0 },
  { id: '3', date: '2026-01-07', businessKm: 50 }, // personalKm omis
];

describe('summarizeKm', () => {
  it('agrège km affaires et personnels', () => {
    const s = summarizeKm(trips);
    expect(s.totalBusinessKm).toBe(350);
    expect(s.totalPersonalKm).toBe(50);
    expect(s.totalKm).toBe(400);
    expect(s.businessRatio).toBeCloseTo(0.875, 5);
  });
  it('ratio 0 si aucun trajet', () => {
    expect(summarizeKm([]).businessRatio).toBe(0);
  });
});

const vehicle: Vehicle = {
  id: 'v1',
  name: 'Auto',
  expenses: [
    { id: 'e1', date: '2026-01-05', kind: 'essence', amountCents: 8000 },
    { id: 'e2', date: '2026-01-10', kind: 'essence', amountCents: 7000 },
    { id: 'e3', date: '2026-02-01', kind: 'entretien', amountCents: 25000 },
  ],
  annualTotals: { assurance: 120000 },
};

describe('totaux de dépenses véhicule (deux niveaux)', () => {
  it('combine dépenses individuelles et totaux annuels', () => {
    const byKind = totalVehicleExpensesByKind(vehicle);
    expect(byKind.essence).toBe(15000);
    expect(byKind.entretien).toBe(25000);
    expect(byKind.assurance).toBe(120000);
    expect(totalVehicleExpenses(vehicle)).toBe(160000);
  });
});

describe('deductibleVehicleExpenses', () => {
  it('applique le ratio d\'usage commercial', () => {
    // 160 000 cents x 0,875 = 140 000
    expect(deductibleVehicleExpenses(vehicle, trips)).toBe(140000);
  });
  it('0 si aucun km d\'affaires', () => {
    expect(deductibleVehicleExpenses(vehicle, [])).toBe(0);
  });
});

describe('computeVehicleCosts (taxes de vente)', () => {
  const config = loadFiscalConfig(2026);
  // Ratio d'usage commercial 80 %.
  const trips80: Trip[] = [{ id: 't', date: '2026-01-01', businessKm: 80, personalKm: 20 }];
  // 114,98 $ d'essence (100 $ + 14,98 $ de taxes) et 500 $ d'assurance (non taxable).
  const v: Vehicle = {
    id: 'v', name: 'Auto',
    expenses: [
      { id: 'a', date: '2026-01-01', kind: 'essence', amountCents: 11498 },
      { id: 'b', date: '2026-01-02', kind: 'assurance', amountCents: 50000 },
    ],
  };

  it('non inscrit : taxes dans le coût, déductible = total x ratio', () => {
    const c = computeVehicleCosts(v, trips80, [], config, false);
    expect(c.totalCents).toBe(61498);
    expect(c.deductibleCents).toBe(Math.round(11498 * 0.8) + Math.round(50000 * 0.8));
    expect(c.recoverable).toEqual({ gstCents: 0, qstCents: 0 });
  });

  it('inscrit : récupère la TPS/TVQ de l\'essence au ratio, rien sur l\'assurance', () => {
    const c = computeVehicleCosts(v, trips80, [], config, true);
    // essence : TPS 5,00 $ x 80 % = 4,00 $ ; TVQ 9,98 $ x 80 % = 7,98 $
    expect(c.recoverable).toEqual({ gstCents: 400, qstCents: 798 });
    // essence : (114,98 - 11,98) x 80 % = 82,40 $ ; assurance : 500 x 80 % = 400 $
    expect(c.deductibleCents).toBe(8240 + 40000);
  });

  it('inclut les dépenses de la section Dépenses en catégorie véhicule', () => {
    const fuel: Expense = { id: 'e', date: '2026-01-03', amountCents: 11498, category: 'essence_carburant', deductiblePercent: 1 };
    const office: Expense = { id: 'o', date: '2026-01-03', amountCents: 9999, category: 'fournitures_bureau', deductiblePercent: 1 };
    const empty: Vehicle = { id: 'v', name: 'Auto', expenses: [] };
    const c = computeVehicleCosts(empty, trips80, [fuel, office], config, true);
    expect(c.totalCents).toBe(11498); // les fournitures ne sont pas des frais de véhicule
    expect(c.recoverable).toEqual({ gstCents: 400, qstCents: 798 });
    expect(c.deductibleCents).toBe(8240);
  });

  it('respecte les taxes saisies manuellement sur une dépense véhicule', () => {
    const insurance: Expense = {
      id: 'e', date: '2026-01-03', amountCents: 50000, category: 'frais_vehicule',
      deductiblePercent: 1, gstCents: 0, qstCents: 0,
    };
    const empty: Vehicle = { id: 'v', name: 'Auto', expenses: [] };
    const c = computeVehicleCosts(empty, trips80, [insurance], config, true);
    expect(c.recoverable).toEqual({ gstCents: 0, qstCents: 0 });
    expect(c.deductibleCents).toBe(40000);
  });

  it('aucun trajet : ratio 0, rien de déductible ni de récupérable', () => {
    const c = computeVehicleCosts(v, [], [], config, true);
    expect(c.deductibleCents).toBe(0);
    expect(c.recoverable).toEqual({ gstCents: 0, qstCents: 0 });
  });
});
