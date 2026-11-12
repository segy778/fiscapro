// Données d'amorçage (démo) — insérées UNIQUEMENT si la base est vide,
// pour que le premier lancement ne soit pas un écran vide. À retirer quand
// les formulaires de saisie seront en place.

import type { Income, Expense } from '../core/models/income';
import type { Trip, Vehicle } from '../core/models/vehicle';

export const DEMO_INCOMES: Income[] = [
  { id: 'i1', date: '2026-01-15', amountCents: 320000, client: 'Client A', description: 'Contrat janvier' },
  { id: 'i2', date: '2026-02-15', amountCents: 285000, client: 'Client B' },
  { id: 'i3', date: '2026-03-15', amountCents: 410000, client: 'Client A' },
  { id: 'i4', date: '2026-04-15', amountCents: 375000, client: 'Client C' },
  { id: 'i5', date: '2026-05-15', amountCents: 390000, client: 'Client B' },
];

export const DEMO_EXPENSES: Expense[] = [
  { id: 'e1', date: '2026-01-20', amountCents: 12000, category: 'repas_representation', deductiblePercent: 0.5, description: 'Dîner client' },
  { id: 'e2', date: '2026-02-03', amountCents: 8900, category: 'fournitures_bureau', deductiblePercent: 1.0, description: 'Logiciel' },
  { id: 'e3', date: '2026-03-10', amountCents: 15000, category: 'honoraires_professionnels', deductiblePercent: 1.0, description: 'Comptable' },
  { id: 'e4', date: '2026-04-01', amountCents: 6500, category: 'telephone_internet', deductiblePercent: 1.0 },
];

export const DEMO_TRIPS: Trip[] = [
  { id: 't1', date: '2026-01-10', businessKm: 120, personalKm: 30, purpose: 'Visite client' },
  { id: 't2', date: '2026-02-12', businessKm: 85, personalKm: 15 },
  { id: 't3', date: '2026-03-20', businessKm: 200, personalKm: 50, purpose: 'Livraison' },
  { id: 't4', date: '2026-04-18', businessKm: 60, personalKm: 40 },
];

export const DEMO_VEHICLE: Vehicle = {
  id: 'v1',
  name: 'Véhicule principal',
  expenses: [
    { id: 've1', date: '2026-01-10', kind: 'essence', amountCents: 8000 },
    { id: 've2', date: '2026-02-12', kind: 'essence', amountCents: 7500 },
    { id: 've3', date: '2026-03-20', kind: 'essence', amountCents: 9200 },
    { id: 've4', date: '2026-03-25', kind: 'entretien', amountCents: 35000 },
  ],
  annualTotals: { assurance: 140000 },
};
