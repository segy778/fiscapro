// Construction du rapport annuel sommaire. Module PUR, sans dépendance UI.
// Sert de source unique pour l'affichage, le CSV et le PDF.

import type { FiscalConfig } from './fiscalConfig';
import type { Income, Expense } from '../models/income';
import type { Trip, Vehicle } from '../models/vehicle';
import type { TaxResult } from './types';
import { computeTax } from './taxEngine';
import { deductibleExpenseAmount, isVehicleProRata } from './expenseCalc';
import {
  summarizeKm,
  computeVehicleCosts,
  type VehicleKmSummary,
} from './vehicleCalc';
import { buildSalesTaxSummary, type SalesTaxSummary } from './salesTax';
import { computeInstallments, type InstallmentSchedule } from './installments';

/** Ligne de ventilation des dépenses par catégorie. */
export interface CategoryBreakdown {
  category: string;
  label: string;
  totalCents: number;
  deductibleCents: number;
}

/** Sommaire TPS/TVQ complet (si inscrit aux taxes). */
export interface GstQstSummary {
  /** L'utilisateur est-il inscrit aux fichiers TPS/TVQ ? */
  registered: boolean;
  /** Nombre de revenus marqués « TPS/TVQ perçue ». */
  incomesWithGstQst: number;
  /** Total des revenus marqués « TPS/TVQ perçue » (montant brut). */
  grossWithGstQstCents: number;
  /** Détail perçu / récupérable / net (présent seulement si inscrit). */
  salesTax: SalesTaxSummary | null;
}

export interface AnnualReport {
  year: number;
  generatedAt: string; // ISO

  grossIncomeCents: number;
  incomeCount: number;

  expensesByCategory: CategoryBreakdown[];
  totalExpensesCents: number;
  totalDeductibleExpensesCents: number;
  /** Nombre de dépenses ayant une facture jointe. */
  receiptsCount: number;

  km: VehicleKmSummary;
  vehicleTotalCents: number;
  vehicleDeductibleCents: number;

  gstQst: GstQstSummary;

  tax: TaxResult;
  installments: InstallmentSchedule;
}

/** Construit le rapport annuel à partir de toutes les données. */
export function buildAnnualReport(
  config: FiscalConfig,
  incomes: Income[],
  expenses: Expense[],
  trips: Trip[],
  vehicle: Vehicle,
  taxRegistered = false,
): AnnualReport {
  const grossIncomeCents = incomes.reduce((sum, i) => sum + i.amountCents, 0);

  // Ventilation des dépenses par catégorie (hors véhicule au prorata).
  const byCategory = new Map<string, CategoryBreakdown>();
  for (const e of expenses) {
    if (isVehicleProRata(e.category, config)) continue;
    const label = config.expenseCategories[e.category]?.label ?? e.category;
    const existing = byCategory.get(e.category) ?? {
      category: e.category,
      label,
      totalCents: 0,
      deductibleCents: 0,
    };
    existing.totalCents += e.amountCents;
    existing.deductibleCents += deductibleExpenseAmount(e, config, taxRegistered);
    byCategory.set(e.category, existing);
  }
  const expensesByCategory = [...byCategory.values()].sort((a, b) => b.totalCents - a.totalCents);

  const nonVehicleTotal = expensesByCategory.reduce((s, c) => s + c.totalCents, 0);
  const nonVehicleDeductible = expensesByCategory.reduce((s, c) => s + c.deductibleCents, 0);

  const km = summarizeKm(trips);
  // Toutes les sources de frais de véhicule (section Véhicule + dépenses au
  // prorata), taxes de vente comprises.
  const vehicleCosts = computeVehicleCosts(vehicle, trips, expenses, config, taxRegistered);
  const vehicleTotalCents = vehicleCosts.totalCents;
  const vehicleDeductibleCents = vehicleCosts.deductibleCents;

  const totalExpensesCents = nonVehicleTotal + vehicleTotalCents;
  const totalDeductibleExpensesCents = nonVehicleDeductible + vehicleDeductibleCents;

  // GST/QST
  const gstQstIncomes = incomes.filter((i) => i.gstQstCollected);
  const gstQst: GstQstSummary = {
    registered: taxRegistered,
    incomesWithGstQst: gstQstIncomes.length,
    grossWithGstQstCents: gstQstIncomes.reduce((s, i) => s + i.amountCents, 0),
    salesTax: taxRegistered ? buildSalesTaxSummary(incomes, expenses, config, vehicleCosts.recoverable) : null,
  };

  const tax = computeTax(
    { grossIncomeCents, deductibleExpensesCents: totalDeductibleExpensesCents },
    config,
  );

  const installments = computeInstallments(tax, config);

  const receiptsCount = expenses.filter((e) => e.receiptImageId).length;

  return {
    year: config.year,
    generatedAt: new Date().toISOString(),
    grossIncomeCents,
    incomeCount: incomes.length,
    expensesByCategory,
    totalExpensesCents,
    totalDeductibleExpensesCents,
    receiptsCount,
    km,
    vehicleTotalCents,
    vehicleDeductibleCents,
    gstQst,
    tax,
    installments,
  };
}
