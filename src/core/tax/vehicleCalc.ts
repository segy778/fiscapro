// Calculs liés au véhicule : kilométrage annuel, ratio d'usage commercial,
// totaux de dépenses, et portion déductible des frais de véhicule.
// Fonctions PURES. Montants en cents.

import type { Trip, Vehicle, VehicleExpenseKind } from '../models/vehicle';

export interface VehicleKmSummary {
  totalBusinessKm: number;
  totalPersonalKm: number;
  totalKm: number;
  /** Ratio d'usage commercial = km affaires / km totaux (0..1). 0 si aucun km. */
  businessRatio: number;
}

/** Agrège les trajets en totaux de kilométrage + ratio d'usage commercial. */
export function summarizeKm(trips: Trip[]): VehicleKmSummary {
  let totalBusinessKm = 0;
  let totalPersonalKm = 0;
  for (const t of trips) {
    totalBusinessKm += t.businessKm;
    totalPersonalKm += t.personalKm ?? 0;
  }
  const totalKm = totalBusinessKm + totalPersonalKm;
  const businessRatio = totalKm > 0 ? totalBusinessKm / totalKm : 0;
  return { totalBusinessKm, totalPersonalKm, totalKm, businessRatio };
}

/**
 * Total des dépenses de véhicule par type (en cents), combinant les deux
 * niveaux de saisie : dépenses individuelles + totaux annuels directs.
 */
export function totalVehicleExpensesByKind(
  vehicle: Vehicle,
): Record<VehicleExpenseKind, number> {
  const totals: Record<VehicleExpenseKind, number> = {
    essence: 0,
    entretien: 0,
    assurance: 0,
    immatriculation: 0,
    autre: 0,
  };
  for (const e of vehicle.expenses) {
    totals[e.kind] += e.amountCents;
  }
  if (vehicle.annualTotals) {
    for (const k of Object.keys(vehicle.annualTotals) as VehicleExpenseKind[]) {
      totals[k] += vehicle.annualTotals[k] ?? 0;
    }
  }
  return totals;
}

/** Somme de toutes les dépenses de véhicule (tous types), en cents. */
export function totalVehicleExpenses(vehicle: Vehicle): number {
  const byKind = totalVehicleExpensesByKind(vehicle);
  return (Object.values(byKind) as number[]).reduce((a, b) => a + b, 0);
}

/**
 * Portion DÉDUCTIBLE des frais de véhicule, en cents.
 * = total des frais x ratio d'usage commercial.
 * Arrondi au cent le plus proche.
 */
export function deductibleVehicleExpenses(
  vehicle: Vehicle,
  trips: Trip[],
): number {
  const total = totalVehicleExpenses(vehicle);
  const { businessRatio } = summarizeKm(trips);
  return Math.round(total * businessRatio);
}
