import { describe, it, expect } from 'vitest';
import {
  summarizeKm,
  totalVehicleExpensesByKind,
  totalVehicleExpenses,
  deductibleVehicleExpenses,
} from './vehicleCalc';
import type { Trip, Vehicle } from '../models/vehicle';

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
