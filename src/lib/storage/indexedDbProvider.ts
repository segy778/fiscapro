// Implémentation IndexedDB de StorageProvider via `idb`.
// Quatre object stores, clés primaires = id (string).

import { openDB, deleteDB, type DBSchema, type IDBPDatabase } from 'idb';
import type { StorageProvider, FiscalData } from './StorageProvider';
import type { Income, Expense } from '../../core/models/income';
import type { Trip, Vehicle } from '../../core/models/vehicle';

/** Nom de la base par défaut (données en clair). */
export const DEFAULT_DB_NAME = 'fiscapro-qc';
const DB_VERSION = 3;

interface FiscaproDB extends DBSchema {
  incomes: { key: string; value: Income };
  expenses: { key: string; value: Expense };
  trips: { key: string; value: Trip };
  vehicles: { key: string; value: Vehicle };
  meta: { key: string; value: string };
  receiptImages: { key: string; value: Blob };
}

export class IndexedDbProvider implements StorageProvider {
  private db: IDBPDatabase<FiscaproDB> | null = null;
  readonly dbName: string;

  constructor(dbName: string = DEFAULT_DB_NAME) {
    this.dbName = dbName;
  }

  async init(): Promise<void> {
    if (this.db) return;
    this.db = await openDB<FiscaproDB>(this.dbName, DB_VERSION, {
      // Un autre onglet veut supprimer ou mettre à niveau cette base : on
      // libère la connexion. Toute opération ultérieure ici échouera
      // (requireDb) au lieu d'écrire dans une base périmée.
      blocking: () => {
        this.close();
      },
      upgrade(db) {
        if (!db.objectStoreNames.contains('incomes')) {
          db.createObjectStore('incomes', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('expenses')) {
          db.createObjectStore('expenses', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('trips')) {
          db.createObjectStore('trips', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('vehicles')) {
          db.createObjectStore('vehicles', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('meta')) {
          db.createObjectStore('meta');
        }
        if (!db.objectStoreNames.contains('receiptImages')) {
          db.createObjectStore('receiptImages');
        }
      },
    });
  }

  /** Ferme la connexion. Un init() ultérieur rouvre (ou recrée) la base. */
  close(): void {
    this.db?.close();
    this.db = null;
  }

  /**
   * Supprime la base entière (fichiers compris) : plus sûr qu'écraser les
   * enregistrements, que le moteur du navigateur peut conserver physiquement.
   */
  async destroy(): Promise<void> {
    this.close();
    await deleteDB(this.dbName);
  }

  private requireDb(): IDBPDatabase<FiscaproDB> {
    if (!this.db) {
      throw new Error('Stockage non initialisé. Appelez init() d\'abord.');
    }
    return this.db;
  }

  async getIncomes(): Promise<Income[]> {
    return this.requireDb().getAll('incomes');
  }
  async putIncome(income: Income): Promise<void> {
    await this.requireDb().put('incomes', income);
  }
  async deleteIncome(id: string): Promise<void> {
    await this.requireDb().delete('incomes', id);
  }

  async getExpenses(): Promise<Expense[]> {
    return this.requireDb().getAll('expenses');
  }
  async putExpense(expense: Expense): Promise<void> {
    await this.requireDb().put('expenses', expense);
  }
  async deleteExpense(id: string): Promise<void> {
    await this.requireDb().delete('expenses', id);
  }

  async getTrips(): Promise<Trip[]> {
    return this.requireDb().getAll('trips');
  }
  async putTrip(trip: Trip): Promise<void> {
    await this.requireDb().put('trips', trip);
  }
  async deleteTrip(id: string): Promise<void> {
    await this.requireDb().delete('trips', id);
  }

  async getVehicles(): Promise<Vehicle[]> {
    return this.requireDb().getAll('vehicles');
  }
  async putVehicle(vehicle: Vehicle): Promise<void> {
    await this.requireDb().put('vehicles', vehicle);
  }
  async deleteVehicle(id: string): Promise<void> {
    await this.requireDb().delete('vehicles', id);
  }

  async getMeta(key: string): Promise<string | null> {
    const value = await this.requireDb().get('meta', key);
    return value ?? null;
  }
  async setMeta(key: string, value: string): Promise<void> {
    await this.requireDb().put('meta', value, key);
  }

  async putReceiptImage(id: string, blob: Blob): Promise<void> {
    await this.requireDb().put('receiptImages', blob, id);
  }
  async getReceiptImage(id: string): Promise<Blob | null> {
    const blob = await this.requireDb().get('receiptImages', id);
    return blob ?? null;
  }
  async deleteReceiptImage(id: string): Promise<void> {
    await this.requireDb().delete('receiptImages', id);
  }

  async loadAll(): Promise<FiscalData> {
    const [incomes, expenses, trips, vehicles] = await Promise.all([
      this.getIncomes(),
      this.getExpenses(),
      this.getTrips(),
      this.getVehicles(),
    ]);
    return { incomes, expenses, trips, vehicles };
  }

  async clear(): Promise<void> {
    const db = this.requireDb();
    await Promise.all([
      db.clear('incomes'),
      db.clear('expenses'),
      db.clear('trips'),
      db.clear('vehicles'),
      db.clear('receiptImages'),
    ]);
  }
}
