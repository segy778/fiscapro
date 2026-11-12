// Orchestration du chiffrement au-dessus de la session et du stockage.
//
// Format v2 (actuel) :
//  - les données vivent dans une base dédiée (SECURE_DB_NAME), chiffrées avec
//    une clé de données aléatoire;
//  - cette clé est enveloppée par le mot de passe dans un TROUSSEAU, stocké
//    en une seule métadonnée (sel + clé enveloppée ensemble);
//  - changer de mot de passe = réécrire ce trousseau, et rien d'autre :
//    l'opération est atomique, aucune interruption ne peut rendre les données
//    illisibles;
//  - activer ou désactiver = construire l'autre base, écrire le drapeau en
//    dernier, puis supprimer l'ancienne base en entier (voir lib/storage).

import {
  storage,
  getStorageMode,
  setStorageMode,
  secureStore,
  clearStore,
  resetDatabase,
  META_ENCRYPTION_ENABLED,
  type FiscalData,
  type StorageProvider,
} from '../storage';
import { encryptionSession } from './encryptionSession';
import type { EncryptedPayload, Keyring } from './crypto';

const META_KEYRING = 'encryptionKeyring';
// Format v1 (hérité) : sel et jeton stockés séparément.
const META_LEGACY_SALT = 'encryptionSalt';
const META_LEGACY_TOKEN = 'encryptionToken';
/** Métadonnées applicatives à conserver quand on change de base. */
const CARRIED_META = ['seeded', 'taxRegistered'] as const;

interface Snapshot {
  data: FiscalData;
  images: { id: string; blob: Blob }[];
  meta: { key: string; value: string }[];
}

/** Le chiffrement est-il activé ? (valide après storage.init()) */
export async function isEncryptionEnabled(): Promise<boolean> {
  return getStorageMode() !== 'clear';
}

/** La session est-elle déverrouillée (clé en mémoire) ? */
export function isUnlocked(): boolean {
  return encryptionSession.isUnlocked;
}

/**
 * Active le chiffrement : crée une clé de données, copie toutes les données
 * dans la base chiffrée, puis supprime la base en clair.
 */
export async function enableEncryption(password: string): Promise<void> {
  if (getStorageMode() !== 'clear') {
    throw new Error('Le chiffrement est déjà activé.');
  }
  const snapshot = await takeSnapshot();
  const keyring = await encryptionSession.createKeyring(password);
  await migrateToSecure(snapshot, keyring);
}

/**
 * Déverrouille avec un mot de passe. Retourne true si correct.
 * Une base au format v1 est migrée vers le format v2 au passage.
 */
export async function unlock(password: string): Promise<boolean> {
  const mode = getStorageMode();
  if (mode === 'secure') {
    const keyring = await readKeyring();
    return keyring ? encryptionSession.unlockWithKeyring(password, keyring) : false;
  }
  if (mode === 'legacy') {
    const salt = await storage.getMeta(META_LEGACY_SALT);
    const tokenStr = await storage.getMeta(META_LEGACY_TOKEN);
    if (!salt || !tokenStr) return false;
    const token = JSON.parse(tokenStr) as EncryptedPayload;
    const ok = await encryptionSession.unlock(password, salt, token);
    if (!ok) return false;
    // Lire tout avec l'ancienne clé, puis migrer vers une nouvelle clé de
    // données et la base chiffrée dédiée.
    const snapshot = await takeSnapshot();
    const keyring = await encryptionSession.createKeyring(password);
    await migrateToSecure(snapshot, keyring);
    return true;
  }
  return false;
}

/** Verrouille la session : la clé est oubliée et les données deviennent inaccessibles. */
export function lock(): void {
  encryptionSession.lock();
}

/**
 * Change le mot de passe : la clé de données est réenveloppée et le trousseau
 * réécrit en UNE seule écriture. Les données ne sont pas touchées.
 * Retourne false si l'ancien mot de passe est incorrect.
 */
export async function changePassword(oldPassword: string, newPassword: string): Promise<boolean> {
  if (getStorageMode() !== 'secure') return false;
  const keyring = await readKeyring();
  if (!keyring) return false;
  const next = await encryptionSession.rewrapKeyring(oldPassword, newPassword, keyring);
  if (!next) return false;
  await secureStore.raw.setMeta(META_KEYRING, JSON.stringify(next));
  return true;
}

/**
 * Désactive le chiffrement après vérification du mot de passe : copie toutes
 * les données en clair dans une base neuve, puis supprime la base chiffrée.
 * Retourne false si le mot de passe est incorrect.
 *
 * ATTENTION : après cette opération, les données ne sont plus protégées.
 */
export async function disableEncryption(password: string): Promise<boolean> {
  if (getStorageMode() !== 'secure') return false;
  const keyring = await readKeyring();
  if (!keyring) return false;
  const ok = await encryptionSession.unlockWithKeyring(password, keyring);
  if (!ok) return false;

  const snapshot = await takeSnapshot();
  await resetDatabase(clearStore.raw);
  await writeSnapshot(clearStore.raw, clearStore.raw, snapshot);
  // La base chiffrée fait foi tant qu'elle existe : la supprimer est le point
  // de bascule. Une interruption avant cette ligne laisse le chiffrement actif.
  setStorageMode('clear');
  await secureStore.raw.destroy();
  encryptionSession.lock();
  return true;
}

// --- Interne ---

async function readKeyring(): Promise<Keyring | null> {
  const str = await secureStore.raw.getMeta(META_KEYRING);
  return str ? (JSON.parse(str) as Keyring) : null;
}

/** Lit toutes les données (déchiffrées si besoin) et les métadonnées à conserver. */
async function takeSnapshot(): Promise<Snapshot> {
  const data = await storage.loadAll();
  const ids = data.expenses
    .map((e) => e.receiptImageId)
    .filter((id): id is string => !!id);
  const images: Snapshot['images'] = [];
  for (const id of ids) {
    const blob = await storage.getReceiptImage(id);
    if (blob) images.push({ id, blob });
  }
  const meta: Snapshot['meta'] = [];
  for (const key of CARRIED_META) {
    const value = await storage.getMeta(key);
    if (value !== null) meta.push({ key, value });
  }
  return { data, images, meta };
}

/** Écrit un instantané : données via `target`, métadonnées via `metaTarget`. */
async function writeSnapshot(
  target: StorageProvider,
  metaTarget: StorageProvider,
  { data, images, meta }: Snapshot,
): Promise<void> {
  for (const i of data.incomes) await target.putIncome(i);
  for (const e of data.expenses) await target.putExpense(e);
  for (const t of data.trips) await target.putTrip(t);
  for (const v of data.vehicles) await target.putVehicle(v);
  for (const { id, blob } of images) await target.putReceiptImage(id, blob);
  for (const { key, value } of meta) await metaTarget.setMeta(key, value);
}

/**
 * Construit la base chiffrée à partir d'un instantané (session déjà
 * déverrouillée avec la nouvelle clé), puis supprime la base en clair.
 */
async function migrateToSecure(snapshot: Snapshot, keyring: Keyring): Promise<void> {
  await resetDatabase(secureStore.raw);
  await writeSnapshot(secureStore.encrypted, secureStore.raw, snapshot);
  await secureStore.raw.setMeta(META_KEYRING, JSON.stringify(keyring));
  // Point de bascule : à partir d'ici, la base chiffrée fait foi.
  await secureStore.raw.setMeta(META_ENCRYPTION_ENABLED, '1');
  setStorageMode('secure');
  await clearStore.raw.destroy();
}
