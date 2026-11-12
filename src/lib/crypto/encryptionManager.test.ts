import { describe, it, expect, beforeEach, vi } from 'vitest';
import 'fake-indexeddb/auto';
import {
  storage,
  getStorageMode,
  secureStore,
  CLEAR_DB_NAME,
  SECURE_DB_NAME,
  META_ENCRYPTION_ENABLED,
  __resetStorageForTests,
} from '../storage';
import { IndexedDbProvider } from '../storage/indexedDbProvider';
import { EncryptedStorageProvider } from '../storage/encryptedProvider';
import { EncryptionSession, encryptionSession } from './encryptionSession';
import {
  enableEncryption,
  disableEncryption,
  changePassword,
  unlock,
  lock,
  isEncryptionEnabled,
} from './encryptionManager';
import type { Income } from '../../core/models/income';

const INCOME: Income = {
  id: 'r1',
  date: '2026-03-01',
  amountCents: 123456,
  client: 'Client Confidentiel Inc.',
};

async function databaseNames(): Promise<string[]> {
  const list = await indexedDB.databases();
  return list.map((d) => d.name ?? '');
}

/** Simule un rechargement de page : état mémoire perdu, bases conservées. */
async function reload(): Promise<void> {
  __resetStorageForTests();
  encryptionSession.lock();
  await storage.init();
}

/** Contenu brut (sans déchiffrement) de toute une base, sérialisé. */
async function rawDump(name: string): Promise<string> {
  const db = new IndexedDbProvider(name);
  await db.init();
  const dump = JSON.stringify(await db.loadAll());
  db.close();
  return dump;
}

describe('encryptionManager (format v2, deux bases)', () => {
  beforeEach(async () => {
    __resetStorageForTests();
    encryptionSession.lock();
    for (const name of await databaseNames()) {
      await new Promise((resolve) => {
        const req = indexedDB.deleteDatabase(name);
        req.onsuccess = req.onerror = req.onblocked = resolve;
      });
    }
    await storage.init();
    await storage.putIncome(INCOME);
    await storage.setMeta('taxRegistered', '1');
  });

  it("active le chiffrement : base chiffrée créée, base en clair supprimée", async () => {
    await enableEncryption('phrase-de-passe-solide');

    expect(getStorageMode()).toBe('secure');
    const names = await databaseNames();
    expect(names).toContain(SECURE_DB_NAME);
    expect(names).not.toContain(CLEAR_DB_NAME);

    // Aucune donnée lisible en clair dans la base chiffrée.
    const dump = await rawDump(SECURE_DB_NAME);
    expect(dump).not.toContain('Client Confidentiel');
    expect(dump).not.toContain('123456');

    // Les métadonnées applicatives suivent.
    expect(await storage.getMeta('taxRegistered')).toBe('1');
  });

  it('après rechargement : verrouillé, aucune donnée accessible sans mot de passe', async () => {
    await enableEncryption('phrase-de-passe-solide');
    await reload();

    expect(await isEncryptionEnabled()).toBe(true);
    await expect(storage.loadAll()).rejects.toThrow(/verrouillée/);
    expect(await unlock('mauvais')).toBe(false);
    expect(await unlock('phrase-de-passe-solide')).toBe(true);
    expect((await storage.loadAll()).incomes).toEqual([INCOME]);
  });

  it('verrouiller ne repasse jamais en écriture claire', async () => {
    await enableEncryption('phrase-de-passe-solide');
    lock();
    await expect(storage.putIncome({ ...INCOME, id: 'r2' })).rejects.toThrow(/verrouillée/);
  });

  it('change le mot de passe en une seule écriture, sans toucher aux données', async () => {
    await enableEncryption('ancien-mot-de-passe');
    const putIncome = vi.spyOn(secureStore.raw, 'putIncome');
    const setMeta = vi.spyOn(secureStore.raw, 'setMeta');

    expect(await changePassword('incorrect', 'nouveau-mot-de-passe')).toBe(false);
    expect(setMeta).not.toHaveBeenCalled();

    expect(await changePassword('ancien-mot-de-passe', 'nouveau-mot-de-passe')).toBe(true);
    expect(putIncome).not.toHaveBeenCalled();
    expect(setMeta).toHaveBeenCalledTimes(1);
    expect(setMeta.mock.calls[0]?.[0]).toBe('encryptionKeyring');
    putIncome.mockRestore();
    setMeta.mockRestore();

    await reload();
    expect(await unlock('ancien-mot-de-passe')).toBe(false);
    expect(await unlock('nouveau-mot-de-passe')).toBe(true);
    expect((await storage.loadAll()).incomes).toEqual([INCOME]);
  });

  it('activation interrompue avant le drapeau : la base en clair reste celle qui fait foi', async () => {
    // Base chiffrée à moitié construite, sans drapeau « activé ».
    const partial = new IndexedDbProvider(SECURE_DB_NAME);
    await partial.init();
    await partial.setMeta('encryptionKeyring', '{}');
    partial.close();

    await reload();
    expect(getStorageMode()).toBe('clear');
    expect(await databaseNames()).not.toContain(SECURE_DB_NAME);
    expect((await storage.loadAll()).incomes).toEqual([INCOME]);
  });

  it('activation terminée mais base en clair non supprimée : nettoyée au démarrage', async () => {
    await enableEncryption('phrase-de-passe-solide');
    // Recrée une copie en clair, comme si la suppression avait échoué.
    const leftover = new IndexedDbProvider(CLEAR_DB_NAME);
    await leftover.init();
    await leftover.putIncome(INCOME);
    leftover.close();

    await reload();
    expect(getStorageMode()).toBe('secure');
    expect(await databaseNames()).not.toContain(CLEAR_DB_NAME);
  });

  it('désactive : données remises en clair, base chiffrée supprimée', async () => {
    await enableEncryption('phrase-de-passe-solide');
    expect(await disableEncryption('incorrect')).toBe(false);
    expect(await disableEncryption('phrase-de-passe-solide')).toBe(true);

    expect(getStorageMode()).toBe('clear');
    expect(await databaseNames()).not.toContain(SECURE_DB_NAME);
    await reload();
    expect(getStorageMode()).toBe('clear');
    expect((await storage.loadAll()).incomes).toEqual([INCOME]);
    expect(await storage.getMeta('taxRegistered')).toBe('1');
  });

  it('migre une base au format v1 (chiffrée en place) au premier déverrouillage', async () => {
    // Construit une base v1 : enregistrements chiffrés directement avec la
    // clé dérivée du mot de passe, sel et jeton en métadonnées.
    const v1 = new EncryptionSession();
    const { salt, token } = await v1.setup('ancien-format');
    const clear = new IndexedDbProvider(CLEAR_DB_NAME);
    await clear.init();
    await clear.clear();
    await new EncryptedStorageProvider(clear, v1).putIncome(INCOME);
    await clear.setMeta('encryptionSalt', salt);
    await clear.setMeta('encryptionToken', JSON.stringify(token));
    await clear.setMeta(META_ENCRYPTION_ENABLED, '1');
    clear.close();

    await reload();
    expect(getStorageMode()).toBe('legacy');
    expect(await unlock('mauvais')).toBe(false);
    expect(await unlock('ancien-format')).toBe(true);

    expect(getStorageMode()).toBe('secure');
    expect(await databaseNames()).not.toContain(CLEAR_DB_NAME);
    expect((await storage.loadAll()).incomes).toEqual([INCOME]);

    await reload();
    expect(await unlock('ancien-format')).toBe(true);
    expect((await storage.loadAll()).incomes).toEqual([INCOME]);
  });
});
