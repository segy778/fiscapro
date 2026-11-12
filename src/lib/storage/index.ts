// Point d'accès unique à la couche de stockage.
// Le reste de l'app importe `storage` sans connaître l'implémentation concrète.
//
// DEUX BASES PHYSIQUES DISTINCTES :
//  - CLEAR_DB_NAME  : données en clair (chiffrement désactivé);
//  - SECURE_DB_NAME : données chiffrées + métadonnées (trousseau, drapeaux).
//
// Activer ou désactiver le chiffrement ne réécrit jamais une base sur
// elle-même : on construit l'autre base, puis on SUPPRIME l'ancienne en
// entier. Ainsi, les anciennes versions en clair ne restent pas dans les
// fichiers de la base active (le moteur du navigateur ne garantit pas
// l'effacement physique d'un enregistrement écrasé).
//
// Règle de reprise (init) : la base chiffrée fait foi dès que son drapeau
// « activé » est écrit (c'est la DERNIÈRE écriture de la migration). Toute
// migration interrompue est donc soit annulée, soit terminée au redémarrage.
//
// Mode « legacy » : base en clair dont les enregistrements ont été chiffrés
// en place par une version antérieure (format v1). Elle est migrée vers la
// base chiffrée au premier déverrouillage (voir encryptionManager).

import type { StorageProvider, FiscalData } from './StorageProvider';
import { IndexedDbProvider, DEFAULT_DB_NAME } from './indexedDbProvider';
import { EncryptedStorageProvider } from './encryptedProvider';
import { encryptionSession } from '../crypto/encryptionSession';

export type { StorageProvider, FiscalData } from './StorageProvider';

export const CLEAR_DB_NAME = DEFAULT_DB_NAME;
export const SECURE_DB_NAME = 'fiscapro-qc-chiffre';
/** Drapeau écrit en DERNIER dans la base chiffrée : point de bascule. */
export const META_ENCRYPTION_ENABLED = 'encryptionEnabled';

export type StorageMode = 'clear' | 'secure' | 'legacy';

const clearDb = new IndexedDbProvider(CLEAR_DB_NAME);
const secureDb = new IndexedDbProvider(SECURE_DB_NAME);
const encryptedSecure = new EncryptedStorageProvider(secureDb, encryptionSession);
const encryptedLegacy = new EncryptedStorageProvider(clearDb, encryptionSession);

let mode: StorageMode = 'clear';
let initialized = false;

/** Mode de stockage actif (valide après storage.init()). */
export function getStorageMode(): StorageMode {
  return mode;
}

/** Change le mode actif (réservé à encryptionManager, après une migration). */
export function setStorageMode(next: StorageMode): void {
  mode = next;
}

/** Base chiffrée : accès brut (métadonnées) et accès chiffré (données). */
export const secureStore = { raw: secureDb, encrypted: encryptedSecure };
/** Base en clair : accès brut. */
export const clearStore = { raw: clearDb };

/** Supprime puis recrée une base vide (reprise d'une migration avortée). */
export async function resetDatabase(db: IndexedDbProvider): Promise<void> {
  await db.destroy();
  await db.init();
}

/**
 * Détermine la base qui fait foi et supprime l'autre. Voir la règle de
 * reprise en tête de fichier.
 */
async function resolveMode(): Promise<void> {
  await secureDb.init();
  if ((await secureDb.getMeta(META_ENCRYPTION_ENABLED)) === '1') {
    mode = 'secure';
    // Reste d'une base en clair (migration terminée mais pas nettoyée).
    await clearDb.destroy();
    return;
  }
  // Base chiffrée incomplète ou vide : on l'abandonne.
  await secureDb.destroy();
  await clearDb.init();
  mode = (await clearDb.getMeta(META_ENCRYPTION_ENABLED)) === '1' ? 'legacy' : 'clear';
}

// Données : base en clair, ou base chiffrée via la couche de chiffrement.
// Verrouillé = AUCUN accès aux données (jamais de repli vers le clair).
function dataProvider(): StorageProvider {
  if (mode === 'clear') return clearDb;
  if (!encryptionSession.isUnlocked) {
    throw new Error('Session verrouillée : aucune donnée accessible.');
  }
  return mode === 'secure' ? encryptedSecure : encryptedLegacy;
}

// Métadonnées : jamais chiffrées, dans la base qui fait foi.
function metaProvider(): StorageProvider {
  return mode === 'secure' ? secureDb : clearDb;
}

export const storage: StorageProvider = {
  init: async () => {
    if (initialized) return;
    await resolveMode();
    initialized = true;
  },

  getIncomes: async () => dataProvider().getIncomes(),
  putIncome: async (i) => dataProvider().putIncome(i),
  deleteIncome: async (id) => dataProvider().deleteIncome(id),

  getExpenses: async () => dataProvider().getExpenses(),
  putExpense: async (e) => dataProvider().putExpense(e),
  deleteExpense: async (id) => dataProvider().deleteExpense(id),

  getTrips: async () => dataProvider().getTrips(),
  putTrip: async (t) => dataProvider().putTrip(t),
  deleteTrip: async (id) => dataProvider().deleteTrip(id),

  getVehicles: async () => dataProvider().getVehicles(),
  putVehicle: async (v) => dataProvider().putVehicle(v),
  deleteVehicle: async (id) => dataProvider().deleteVehicle(id),

  loadAll: async () => dataProvider().loadAll(),

  getMeta: (k) => metaProvider().getMeta(k),
  setMeta: (k, v) => metaProvider().setMeta(k, v),

  putReceiptImage: async (id, blob) => dataProvider().putReceiptImage(id, blob),
  getReceiptImage: async (id) => dataProvider().getReceiptImage(id),
  deleteReceiptImage: async (id) => dataProvider().deleteReceiptImage(id),

  // Efface les données (pas les métadonnées) de la base qui fait foi.
  clear: () => metaProvider().clear(),
};

/** Réinitialise l'état du module (tests uniquement). */
export function __resetStorageForTests(): void {
  clearDb.close();
  secureDb.close();
  mode = 'clear';
  initialized = false;
}

export type { FiscalData as FiscalDataType };
