// Wrapper de chiffrement autour d'un StorageProvider. Chiffre/déchiffre de
// façon transparente les données métier et les images. L'id reste en clair
// (clé d'indexation) ; tout le reste de l'enregistrement est chiffré (AES-GCM).
//
// Les métadonnées (sel, jeton de vérification, drapeaux) NE sont PAS chiffrées :
// elles ne sont pas sensibles et doivent être lisibles avant déverrouillage.

import type { StorageProvider, FiscalData } from './StorageProvider';
import type { Income, Expense } from '../../core/models/income';
import type { Trip, Vehicle } from '../../core/models/vehicle';
import type { EncryptionSession } from '../crypto/encryptionSession';
import type { EncryptedPayload } from '../crypto/crypto';

/** Forme d'un enregistrement chiffré : id en clair + charge utile chiffrée. */
interface EncryptedRecord {
  id: string;
  payload: EncryptedPayload;
}

/** Forme d'une image chiffrée : type MIME en clair + données chiffrées. */
interface EncryptedImage {
  mimeType: string;
  payload: EncryptedPayload;
}

/**
 * Enveloppe un StorageProvider « brut » (qui stocke des objets quelconques) et
 * y ajoute le chiffrement. Le provider sous-jacent stocke des EncryptedRecord.
 */
export class EncryptedStorageProvider implements StorageProvider {
  private readonly base: StorageProvider;
  private readonly session: EncryptionSession;

  constructor(base: StorageProvider, session: EncryptionSession) {
    this.base = base;
    this.session = session;
  }

  async init(): Promise<void> {
    await this.base.init();
  }

  // --- Helpers de (dé)chiffrement d'entité ---

  private async encryptEntity<T extends { id: string }>(entity: T): Promise<unknown> {
    const payload = await this.session.encrypt(JSON.stringify(entity));
    const record: EncryptedRecord = { id: entity.id, payload };
    return record;
  }

  private async decryptEntity<T>(raw: unknown): Promise<T> {
    const record = raw as EncryptedRecord;
    const json = await this.session.decrypt(record.payload);
    return JSON.parse(json) as T;
  }

  private async decryptList<T>(rawList: unknown[]): Promise<T[]> {
    return Promise.all(rawList.map((r) => this.decryptEntity<T>(r)));
  }

  // --- Revenus ---
  async getIncomes(): Promise<Income[]> {
    return this.decryptList<Income>(await this.base.getIncomes() as unknown[]);
  }
  async putIncome(income: Income): Promise<void> {
    await this.base.putIncome((await this.encryptEntity(income)) as Income);
  }
  async deleteIncome(id: string): Promise<void> {
    await this.base.deleteIncome(id);
  }

  // --- Dépenses ---
  async getExpenses(): Promise<Expense[]> {
    return this.decryptList<Expense>(await this.base.getExpenses() as unknown[]);
  }
  async putExpense(expense: Expense): Promise<void> {
    await this.base.putExpense((await this.encryptEntity(expense)) as Expense);
  }
  async deleteExpense(id: string): Promise<void> {
    await this.base.deleteExpense(id);
  }

  // --- Trajets ---
  async getTrips(): Promise<Trip[]> {
    return this.decryptList<Trip>(await this.base.getTrips() as unknown[]);
  }
  async putTrip(trip: Trip): Promise<void> {
    await this.base.putTrip((await this.encryptEntity(trip)) as Trip);
  }
  async deleteTrip(id: string): Promise<void> {
    await this.base.deleteTrip(id);
  }

  // --- Véhicules ---
  async getVehicles(): Promise<Vehicle[]> {
    return this.decryptList<Vehicle>(await this.base.getVehicles() as unknown[]);
  }
  async putVehicle(vehicle: Vehicle): Promise<void> {
    await this.base.putVehicle((await this.encryptEntity(vehicle)) as Vehicle);
  }
  async deleteVehicle(id: string): Promise<void> {
    await this.base.deleteVehicle(id);
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

  // --- Métadonnées : NON chiffrées (lisibles avant déverrouillage) ---
  getMeta(key: string): Promise<string | null> {
    return this.base.getMeta(key);
  }
  setMeta(key: string, value: string): Promise<void> {
    return this.base.setMeta(key, value);
  }

  // --- Images : chiffrées, type MIME conservé en clair ---
  async putReceiptImage(id: string, blob: Blob): Promise<void> {
    const payload = await this.session.encryptImage(blob);
    const record: EncryptedImage = { mimeType: blob.type, payload };
    // On stocke l'objet chiffré ; le provider de base accepte un Blob, donc on
    // sérialise l'enregistrement dans un Blob JSON.
    const wrapped = new Blob([JSON.stringify(record)], { type: 'application/json' });
    await this.base.putReceiptImage(id, wrapped);
  }
  async getReceiptImage(id: string): Promise<Blob | null> {
    const wrapped = await this.base.getReceiptImage(id);
    if (!wrapped) return null;
    const record = JSON.parse(await wrapped.text()) as EncryptedImage;
    return this.session.decryptImage(record.payload, record.mimeType);
  }
  deleteReceiptImage(id: string): Promise<void> {
    return this.base.deleteReceiptImage(id);
  }

  clear(): Promise<void> {
    return this.base.clear();
  }
}
