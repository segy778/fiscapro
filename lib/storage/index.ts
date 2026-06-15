// Point d'accès unique à la couche de stockage.
// Le reste de l'app importe `storage` sans connaître l'implémentation concrète.
//
// Aiguillage chiffrement : par défaut, stockage en clair (IndexedDB direct).
// Quand le chiffrement est activé ET déverrouillé, les opérations sur les
// DONNÉES passent par le wrapper chiffré. Les MÉTADONNÉES (sel, jeton, drapeaux)
// passent toujours par le provider clair — elles ne sont jamais chiffrées.

import type { StorageProvider, FiscalData } from './StorageProvider';
import { IndexedDbProvider } from './indexedDbProvider';
import { EncryptedStorageProvider } from './encryptedProvider';
import { encryptionSession } from '../crypto/encryptionSession';

export type { StorageProvider, FiscalData } from './StorageProvider';

const rawProvider = new IndexedDbProvider();
const encryptedProvider = new EncryptedStorageProvider(rawProvider, encryptionSession);

// Provider actif pour les DONNÉES (bascule selon l'état de chiffrement).
let dataProvider: StorageProvider = rawProvider;

/** Active le mode chiffré pour les opérations de données. */
export function useEncryptedStorage(): void {
  dataProvider = encryptedProvider;
}

/** Repasse en stockage clair (ex. avant activation, ou après verrouillage). */
export function useClearStorage(): void {
  dataProvider = rawProvider;
}

/**
 * `storage` délègue chaque opération au bon provider :
 * - données métier + images -> dataProvider (clair ou chiffré)
 * - métadonnées + init + clear -> toujours rawProvider (jamais chiffrées)
 */
export const storage: StorageProvider = {
  init: () => rawProvider.init(),

  getIncomes: () => dataProvider.getIncomes(),
  putIncome: (i) => dataProvider.putIncome(i),
  deleteIncome: (id) => dataProvider.deleteIncome(id),

  getExpenses: () => dataProvider.getExpenses(),
  putExpense: (e) => dataProvider.putExpense(e),
  deleteExpense: (id) => dataProvider.deleteExpense(id),

  getTrips: () => dataProvider.getTrips(),
  putTrip: (t) => dataProvider.putTrip(t),
  deleteTrip: (id) => dataProvider.deleteTrip(id),

  getVehicles: () => dataProvider.getVehicles(),
  putVehicle: (v) => dataProvider.putVehicle(v),
  deleteVehicle: (id) => dataProvider.deleteVehicle(id),

  loadAll: () => dataProvider.loadAll(),

  // Métadonnées : toujours en clair.
  getMeta: (k) => rawProvider.getMeta(k),
  setMeta: (k, v) => rawProvider.setMeta(k, v),

  putReceiptImage: (id, blob) => dataProvider.putReceiptImage(id, blob),
  getReceiptImage: (id) => dataProvider.getReceiptImage(id),
  deleteReceiptImage: (id) => dataProvider.deleteReceiptImage(id),

  clear: () => rawProvider.clear(),
};

export type { FiscalData as FiscalDataType };
