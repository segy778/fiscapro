import { describe, it, expect, beforeEach } from 'vitest';
import { EncryptionSession } from './encryptionSession';
import {
  generateSalt,
  deriveKey,
  generateDataKeyBytes,
  wrapDataKey,
  type Keyring,
} from './crypto';

// « Été-Café » : é précomposé (NFC, Windows) ou e + accent combinant (NFD, macOS).
const PW_NFC = 'Été-Café-2026!'.normalize('NFC');
const PW_NFD = 'Été-Café-2026!'.normalize('NFD');

/** Trousseau ANTÉRIEUR à la normalisation, dérivé de la saisie brute. */
async function legacyKeyring(typedPassword: string): Promise<Keyring> {
  const salt = generateSalt();
  const wrappingKey = await deriveKey(typedPassword, salt);
  const wrappedKey = await wrapDataKey(wrappingKey, generateDataKeyBytes());
  return { version: 2, salt, wrappedKey };
}

describe('EncryptionSession', () => {
  let session: EncryptionSession;
  beforeEach(() => { session = new EncryptionSession(); });

  it('démarre verrouillée', () => {
    expect(session.isUnlocked).toBe(false);
  });

  it('se déverrouille après setup d\'un mot de passe', async () => {
    await session.setup('mon-mot-de-passe');
    expect(session.isUnlocked).toBe(true);
  });

  it('chiffre et déchiffre une fois déverrouillée', async () => {
    await session.setup('pw');
    const payload = await session.encrypt('revenu 5000,00 $');
    expect(await session.decrypt(payload)).toBe('revenu 5000,00 $');
  });

  it('lève une erreur si on chiffre alors qu\'elle est verrouillée', async () => {
    await expect(session.encrypt('x')).rejects.toThrow(/verrouillée/);
  });

  it('déverrouille avec le bon mot de passe via sel + jeton', async () => {
    const { salt, token } = await session.setup('correct');
    const fresh = new EncryptionSession();
    const ok = await fresh.unlock('correct', salt, token);
    expect(ok).toBe(true);
    expect(fresh.isUnlocked).toBe(true);
  });

  it('refuse un mauvais mot de passe au déverrouillage', async () => {
    const { salt, token } = await session.setup('correct');
    const fresh = new EncryptionSession();
    const ok = await fresh.unlock('incorrect', salt, token);
    expect(ok).toBe(false);
    expect(fresh.isUnlocked).toBe(false);
  });

  it('lock() oublie la clé', async () => {
    await session.setup('pw');
    session.lock();
    expect(session.isUnlocked).toBe(false);
  });

  it('les données chiffrées par une session sont lisibles par une autre avec le bon mdp', async () => {
    const { salt, token } = await session.setup('pw');
    const payload = await session.encrypt('secret partagé');
    const other = new EncryptionSession();
    await other.unlock('pw', salt, token);
    expect(await other.decrypt(payload)).toBe('secret partagé');
  });
});

describe('EncryptionSession — normalisation Unicode du mot de passe', () => {
  it('les deux formes sont bien des octets différents (prémisse du test)', () => {
    expect(PW_NFC).not.toBe(PW_NFD);
  });

  it('un nouveau trousseau est normalisé et s\'ouvre avec l\'autre forme', async () => {
    const keyring = await new EncryptionSession().createKeyring(PW_NFD); // créé sur Mac
    expect(keyring.normalization).toBe('NFC');
    const r = await new EncryptionSession().unlockWithKeyring(PW_NFC, keyring); // saisi sur Windows
    expect(r).toEqual({ ok: true, upgradedKeyring: null });
  });

  it('trousseau antérieur créé en NFD : s\'ouvre en NFC et est réenveloppé normalisé', async () => {
    const old = await legacyKeyring(PW_NFD);
    const r = await new EncryptionSession().unlockWithKeyring(PW_NFC, old);
    expect(r.ok).toBe(true);
    expect(r.upgradedKeyring?.normalization).toBe('NFC');
    // Le trousseau mis à niveau s'ouvre avec les deux formes, sans nouvelle mise à niveau.
    expect(await new EncryptionSession().unlockWithKeyring(PW_NFD, r.upgradedKeyring!)).toEqual({ ok: true, upgradedKeyring: null });
  });

  it('trousseau antérieur : un mauvais mot de passe reste refusé', async () => {
    const old = await legacyKeyring(PW_NFD);
    expect(await new EncryptionSession().unlockWithKeyring('Mauvais-Mot-2026!', old)).toEqual({ ok: false, upgradedKeyring: null });
  });

  it('changer de mot de passe produit un trousseau normalisé', async () => {
    const old = await legacyKeyring(PW_NFD);
    const next = await new EncryptionSession().rewrapKeyring(PW_NFC, 'Nouvelle-Phrase-Où-Ça-Va', old);
    expect(next?.normalization).toBe('NFC');
    const r = await new EncryptionSession().unlockWithKeyring('Nouvelle-Phrase-Où-Ça-Va'.normalize('NFD'), next!);
    expect(r.ok).toBe(true);
  });

  it('format v1 hérité créé en NFD : déverrouillable avec la forme NFC', async () => {
    const { salt, token } = await new EncryptionSession().setup(PW_NFD);
    expect(await new EncryptionSession().unlock(PW_NFC, salt, token)).toBe(true);
  });
});
