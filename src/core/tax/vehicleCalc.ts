// Calculs liés au véhicule : kilométrage annuel, ratio d'usage commercial,
// totaux de dépenses, et portion déductible des frais de véhicule.
// Fonctions PURES. Montants en cents.

import type { Trip, Vehicle, VehicleExpenseKind } from '../models/vehicle';
import type { FiscalConfig } from './fiscalConfig';
import type { Expense } from '../models/income';
import { extractSalesTaxFromTotal, type TaxAmounts } from './salesTax';

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
 * Portion DÉDUCTIBLE des frais saisis dans la section Véhicule, en cents,
 * sans traitement des taxes de vente. L'app utilise computeVehicleCosts.
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

// --- Coûts du véhicule avec taxes de vente ---
//
// Sources de frais additionnées :
//  - dépenses individuelles du véhicule (section Véhicule);
//  - totaux annuels saisis par type;
//  - dépenses de la section Dépenses dont la catégorie est « au prorata »
//    (essence, frais de véhicule).
//
// Tous les montants sont des TOTAUX PAYÉS, taxes comprises.
//  - Taxe payée : saisie manuellement si disponible, sinon extraite du total
//    pour les types assujettis (config.vehicleSalesTax), 0 sinon.
//  - Inscrit : taxe récupérable (CTI/RTI) = taxe payée × ratio d'usage
//    commercial; elle est retirée du coût avant la déduction.
//  - Déductible = (total − taxe récupérable) × ratio d'usage commercial.


export interface VehicleCosts {
  /** Total payé, toutes sources confondues, taxes comprises. */
  totalCents: number;
  /** Portion déductible du revenu (ratio d'usage, taxes récupérées exclues). */
  deductibleCents: number;
  /** TPS/TVQ récupérables en CTI/RTI (0 si non inscrit). */
  recoverable: TaxAmounts;
  /** Ratio d'usage commercial appliqué (0..1). */
  businessRatio: number;
}

interface VehicleCostItem {
  kind: VehicleExpenseKind;
  amountCents: number;
  manualTax?: TaxAmounts;
}

function collectVehicleItems(
  vehicle: Vehicle,
  expenses: Expense[],
  config: FiscalConfig,
): VehicleCostItem[] {
  const items: VehicleCostItem[] = vehicle.expenses.map((e) => ({
    kind: e.kind,
    amountCents: e.amountCents,
  }));
  if (vehicle.annualTotals) {
    for (const kind of Object.keys(vehicle.annualTotals) as VehicleExpenseKind[]) {
      const amount = vehicle.annualTotals[kind] ?? 0;
      if (amount > 0) items.push({ kind, amountCents: amount });
    }
  }
  for (const e of expenses) {
    const category = config.expenseCategories[e.category];
    if (category?.vehicleProRata !== true) continue;
    items.push({
      kind: category.vehicleKind ?? 'autre',
      amountCents: e.amountCents,
      manualTax:
        e.gstCents !== undefined && e.qstCents !== undefined
          ? { gstCents: e.gstCents, qstCents: e.qstCents }
          : undefined,
    });
  }
  return items;
}

/** Coûts du véhicule : total, portion déductible et taxes récupérables. */
export function computeVehicleCosts(
  vehicle: Vehicle,
  trips: Trip[],
  expenses: Expense[],
  config: FiscalConfig,
  taxRegistered: boolean,
): VehicleCosts {
  const { businessRatio } = summarizeKm(trips);
  let totalCents = 0;
  let deductibleCents = 0;
  const recoverable: TaxAmounts = { gstCents: 0, qstCents: 0 };

  for (const item of collectVehicleItems(vehicle, expenses, config)) {
    totalCents += item.amountCents;
    let cost = item.amountCents;
    if (taxRegistered) {
      const paid =
        item.manualTax ??
        (config.vehicleSalesTax.taxableKinds[item.kind]
          ? extractSalesTaxFromTotal(item.amountCents, config)
          : { gstCents: 0, qstCents: 0 });
      const gst = Math.round(paid.gstCents * businessRatio);
      const qst = Math.round(paid.qstCents * businessRatio);
      recoverable.gstCents += gst;
      recoverable.qstCents += qst;
      cost -= gst + qst;
    }
    deductibleCents += Math.round(cost * businessRatio);
  }

  return { totalCents, deductibleCents, recoverable, businessRatio };
}
