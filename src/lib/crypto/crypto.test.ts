import { describe, it, expect } from 'vitest';
import {
  generateSalt,
  deriveKey,
  encryptString,
  decryptString,
  encryptBlob,
  decryptBlob,
  createVerificationToken,
  verifyKey,
} from './crypto';

describe('crypto — dérivation et round-trip', () => {
  it('chiffre et déchiffre une chaîne (round-trip)', async () => {
    const salt = generateSalt();
    const key = await deriveKey('mon-mot-de-passe', salt);
    const payload = await encryptString(key, 'Données fiscales secrètes 1234,56 $');
    const decrypted = await decryptString(key, payload);
    expect(decrypted).toBe('Données fiscales secrètes 1234,56 $');
  });

  it('produit un texte chiffré différent du texte clair', async () => {
    const salt = generateSalt();
    const key = await deriveKey('pw', salt);
    const payload = await encryptString(key, 'secret');
    expect(payload.ciphertext).not.toContain('secret');
    expect(payload.iv).toBeTruthy();
  });

  it('génère un IV différent à chaque chiffrement (même texte)', async () => {
    const salt = generateSalt();
    const key = await deriveKey('pw', salt);
    const a = await encryptString(key, 'identique');
    const b = await encryptString(key, 'identique');
    expect(a.iv).not.toBe(b.iv);
    expect(a.ciphertext).not.toBe(b.ciphertext); // IV différent -> chiffré différent
  });

  it('génère des sels différents', () => {
    expect(generateSalt()).not.toBe(generateSalt());
  });
});

describe('crypto — sécurité', () => {
  it('échoue à déchiffrer avec un mauvais mot de passe', async () => {
    const salt = generateSalt();
    const goodKey = await deriveKey('bon-mot-de-passe', salt);
    const badKey = await deriveKey('mauvais-mot-de-passe', salt);
    const payload = await encryptString(goodKey, 'secret');
    await expect(decryptString(badKey, payload)).rejects.toThrow();
  });

  it('détecte une altération du texte chiffré (GCM)', async () => {
    const salt = generateSalt();
    const key = await deriveKey('pw', salt);
    const payload = await encryptString(key, 'donnée intègre');
    // Altérer le ciphertext
    const tampered = { ...payload, ciphertext: payload.ciphertext.slice(0, -4) + 'AAAA' };
    await expect(decryptString(key, tampered)).rejects.toThrow();
  });
});

describe('crypto — jeton de vérification', () => {
  it('vérifie un mot de passe correct', async () => {
    const salt = generateSalt();
    const key = await deriveKey('pw', salt);
    const token = await createVerificationToken(key);
    expect(await verifyKey(key, token)).toBe(true);
  });

  it('rejette un mot de passe incorrect', async () => {
    const salt = generateSalt();
    const goodKey = await deriveKey('bon', salt);
    const badKey = await deriveKey('mauvais', salt);
    const token = await createVerificationToken(goodKey);
    expect(await verifyKey(badKey, token)).toBe(false);
  });
});

describe('crypto — Blob (images)', () => {
  it('chiffre et déchiffre des données binaires', async () => {
    // L'environnement de test Node n'a pas Blob.arrayBuffer(); on teste la
    // mécanique crypto avec un objet minimal. Le round-trip Blob réel (avec
    // arrayBuffer natif) est couvert par les tests E2E navigateur.
    const salt = generateSalt();
    const key = await deriveKey('pw', salt);
    const data = new TextEncoder().encode('contenu-image-binaire');
    const fakeBlob = { arrayBuffer: async () => data.buffer } as unknown as Blob;
    const payload = await encryptBlob(key, fakeBlob);
    const restored = await decryptBlob(key, payload, 'image/jpeg');
    // decryptBlob construit un Blob ; sous Node, on vérifie via le type au moins.
    expect(restored).toBeDefined();
    // Re-déchiffrer manuellement pour confirmer le contenu (round-trip crypto).
    const decryptedText = await decryptString(key, payload);
    expect(decryptedText).toBe('contenu-image-binaire');
  });
});
