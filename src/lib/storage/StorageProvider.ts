// Interface de stockage abstraite — AUCUNE dépendance à IndexedDB ici.
// C'est le contrat que toute implémentation (IndexedDB web, SQLite mobile...)
// doit respecter. Le reste de l'app ne dépend que de cette interface.

import type { Income, Expense } from '../../core/models/income';
import type { Trip, Vehicle } from '../../core/models/vehicle';

/** Données persistées pour une année fiscale. */
export interface FiscalData {
  incomes: Income[];
  expenses: Expense[];
  trips: Trip[];
  vehicles: Vehicle[];
}

/**
 * Contrat de stockage. Toutes les opérations sont asynchrones pour être
 * compatibles avec IndexedDB (web) comme SQLite (mobile).
 */
export interface StorageProvider {
  /** Initialise la couche (ouverture de la base, migrations...). */
  init(): Promise<void>;

  // Revenus
  getIncomes(): Promise<Income[]>;
  putIncome(income: Income): Promise<void>;
  deleteIncome(id: string): Promise<void>;

  // Dépenses
  getExpenses(): Promise<Expense[]>;
  putExpense(expense: Expense): Promise<void>;
  deleteExpense(id: string): Promise<void>;

  // Trajets
  getTrips(): Promise<Trip[]>;
  putTrip(trip: Trip): Promise<void>;
  deleteTrip(id: string): Promise<void>;

  // Véhicules
  getVehicles(): Promise<Vehicle[]>;
  putVehicle(vehicle: Vehicle): Promise<void>;
  deleteVehicle(id: string): Promise<void>;

  /** Charge toutes les données d'un coup (pour l'amorçage du store). */
  loadAll(): Promise<FiscalData>;

  /** Lit une métadonnée (ex. drapeau d'amorçage). null si absente. */
  getMeta(key: string): Promise<string | null>;

  /** Écrit une métadonnée. */
  setMeta(key: string, value: string): Promise<void>;

  // Images de factures (pièces justificatives), stockées en Blob.
  putReceiptImage(id: string, blob: Blob): Promise<void>;
  getReceiptImage(id: string): Promise<Blob | null>;
  deleteReceiptImage(id: string): Promise<void>;

  /** Efface tout (utilitaire de test / réinitialisation). */
  clear(): Promise<void>;
}
