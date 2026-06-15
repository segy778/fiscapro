// Orchestration de l'activation/déverrouillage du chiffrement, au-dessus de
// la session et du stockage. Gère les métadonnées (sel, jeton, drapeau) et la
// migration des données existantes en clair vers le chiffré.

import { storage, useEncryptedStorage, useClearStorage } from '../storage';
import { encryptionSession } from './encryptionSession';
import type { EncryptedPayload } from './crypto';

const META_ENABLED = 'encryptionEnabled';
const META_SALT = 'encryptionSalt';
const META_TOKEN = 'encryptionToken';

/** Le chiffrement est-il activé (drapeau persisté) ? */
export async function isEncryptionEnabled(): Promise<boolean> {
  return (await storage.getMeta(META_ENABLED)) === '1';
}

/** La session est-elle déverrouillée (clé en mémoire) ? */
export function isUnlocked(): boolean {
  return encryptionSession.isUnlocked;
}

/**
 * Active le chiffrement : crée le mot de passe, chiffre les métadonnées de
 * vérification, puis MIGRE toutes les données en clair vers le chiffré.
 * À appeler quand des données existent déjà en clair.
 */
export async function enableEncryption(password: string): Promise<void> {
  // 1. Lire les données actuelles EN CLAIR (le provider est encore clair).
  useClearStorage();
  const data = await storage.loadAll();
  const imageIds = await collectImageIds(data);
  const images = await Promise.all(
    imageIds.map(async (id) => ({ id, blob: await storage.getReceiptImage(id) })),
  );

  // 2. Mettre en place la clé et persister sel + jeton (non chiffrés).
  const { salt, token } = await encryptionSession.setup(password);
  await storage.setMeta(META_SALT, salt);
  await storage.setMeta(META_TOKEN, JSON.stringify(token));

  // 3. Basculer en mode chiffré et réécrire toutes les données (chiffrées).
  useEncryptedStorage();
  await Promise.all([
    ...data.incomes.map((i) => storage.putIncome(i)),
    ...data.expenses.map((e) => storage.putExpense(e)),
    ...data.trips.map((t) => storage.putTrip(t)),
    ...data.vehicles.map((v) => storage.putVehicle(v)),
  ]);
  for (const { id, blob } of images) {
    if (blob) await storage.putReceiptImage(id, blob);
  }

  // 4. Marquer le chiffrement comme activé.
  await storage.setMeta(META_ENABLED, '1');
}

/**
 * Déverrouille avec un mot de passe. Retourne true si correct.
 * Bascule le stockage en mode chiffré en cas de succès.
 */
export async function unlock(password: string): Promise<boolean> {
  const salt = await storage.getMeta(META_SALT);
  const tokenStr = await storage.getMeta(META_TOKEN);
  if (!salt || !tokenStr) return false;
  const token = JSON.parse(tokenStr) as EncryptedPayload;
  const ok = await encryptionSession.unlock(password, salt, token);
  if (ok) useEncryptedStorage();
  return ok;
}

/** Verrouille la session (oublie la clé) et repasse le stockage en clair. */
export function lock(): void {
  encryptionSession.lock();
  useClearStorage();
}

/**
 * Change le mot de passe sans jamais écrire les données en clair sur disque.
 * 1) vérifie l'ancien mot de passe, 2) lit toutes les données déchiffrées EN
 * MÉMOIRE, 3) établit la nouvelle clé, 4) réécrit tout rechiffré avec la
 * nouvelle clé. Retourne false si l'ancien mot de passe est incorrect.
 */
export async function changePassword(oldPassword: string, newPassword: string): Promise<boolean> {
  // 1. Vérifier l'ancien mot de passe via sel + jeton actuels.
  const salt = await storage.getMeta(META_SALT);
  const tokenStr = await storage.getMeta(META_TOKEN);
  if (!salt || !tokenStr) return false;
  const token = JSON.parse(tokenStr) as EncryptedPayload;
  const ok = await encryptionSession.unlock(oldPassword, salt, token);
  if (!ok) return false;

  // 2. Lire TOUTES les données déchiffrées en mémoire (ancienne clé active).
  useEncryptedStorage();
  const data = await storage.loadAll();
  const imageIds = await collectImageIds(data);
  const images = await Promise.all(
    imageIds.map(async (id) => ({ id, blob: await storage.getReceiptImage(id) })),
  );

  // 3. Établir la NOUVELLE clé (nouveau sel + jeton). La session bascule sur
  //    la nouvelle clé ; le provider chiffré chiffrera désormais avec elle.
  const { salt: newSalt, token: newToken } = await encryptionSession.setup(newPassword);

  // 4. Réécrire toutes les données (rechiffrées avec la nouvelle clé). Les
  //    données n'ont jamais quitté la mémoire ni été écrites en clair.
  await Promise.all([
    ...data.incomes.map((i) => storage.putIncome(i)),
    ...data.expenses.map((e) => storage.putExpense(e)),
    ...data.trips.map((t) => storage.putTrip(t)),
    ...data.vehicles.map((v) => storage.putVehicle(v)),
  ]);
  for (const { id, blob } of images) {
    if (blob) await storage.putReceiptImage(id, blob);
  }

  // 5. Remplacer le sel et le jeton stockés par les nouveaux.
  await storage.setMeta(META_SALT, newSalt);
  await storage.setMeta(META_TOKEN, JSON.stringify(newToken));

  return true;
}

/**
 * Désactive le chiffrement après vérification du mot de passe actuel.
 * Déchiffre toutes les données et les réécrit EN CLAIR, puis efface les
 * métadonnées de chiffrement. Retourne false si le mot de passe est incorrect.
 *
 * ATTENTION : après cette opération, les données ne sont plus protégées.
 */
export async function disableEncryption(password: string): Promise<boolean> {
  // 1. Vérifier le mot de passe via sel + jeton.
  const salt = await storage.getMeta(META_SALT);
  const tokenStr = await storage.getMeta(META_TOKEN);
  if (!salt || !tokenStr) return false;
  const token = JSON.parse(tokenStr) as EncryptedPayload;
  const ok = await encryptionSession.unlock(password, salt, token);
  if (!ok) return false;

  // 2. Lire toutes les données déchiffrées (provider chiffré actif).
  useEncryptedStorage();
  const data = await storage.loadAll();
  const imageIds = await collectImageIds(data);
  const images = await Promise.all(
    imageIds.map(async (id) => ({ id, blob: await storage.getReceiptImage(id) })),
  );

  // 3. Repasser en clair et réécrire toutes les données (non chiffrées).
  useClearStorage();
  await Promise.all([
    ...data.incomes.map((i) => storage.putIncome(i)),
    ...data.expenses.map((e) => storage.putExpense(e)),
    ...data.trips.map((t) => storage.putTrip(t)),
    ...data.vehicles.map((v) => storage.putVehicle(v)),
  ]);
  for (const { id, blob } of images) {
    if (blob) await storage.putReceiptImage(id, blob);
  }

  // 4. Effacer les métadonnées de chiffrement et oublier la clé.
  await storage.setMeta(META_ENABLED, '0');
  await storage.setMeta(META_SALT, '');
  await storage.setMeta(META_TOKEN, '');
  encryptionSession.lock();

  return true;
}

// Récupère tous les ids d'images référencés par les dépenses.
async function collectImageIds(data: { expenses: { receiptImageId?: string }[] }): Promise<string[]> {
  return data.expenses
    .map((e) => e.receiptImageId)
    .filter((id): id is string => !!id);
}
