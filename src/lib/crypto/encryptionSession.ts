// Gestionnaire de session de chiffrement. Détient la clé AES EN MÉMOIRE
// pendant la session (jamais persistée). Orchestre la mise en place du mot de
// passe, le verrouillage et le déverrouillage.
//
// Les éléments persistés (via le stockage) sont NON sensibles : le sel et le
// jeton de vérification chiffré. Le mot de passe n'est jamais stocké.

import {
  generateSalt,
  deriveKey,
  createVerificationToken,
  verifyKey,
  encryptString,
  decryptString,
  encryptBlob,
  decryptBlob,
  generateDataKeyBytes,
  importDataKey,
  wrapDataKey,
  unwrapDataKey,
  normalizePassword,
  passwordCandidates,
  type EncryptedPayload,
  type Keyring,
} from './crypto';

/** Résultat d'un déverrouillage par trousseau. */
export interface KeyringUnlockResult {
  ok: boolean;
  /**
   * Trousseau réenveloppé avec le mot de passe normalisé, à persister quand
   * le trousseau ouvert était antérieur à la normalisation. null sinon.
   */
  upgradedKeyring: Keyring | null;
}

export class EncryptionSession {
  private key: CryptoKey | null = null;

  /** La session est-elle déverrouillée (clé en mémoire) ? */
  get isUnlocked(): boolean {
    return this.key !== null;
  }

  // --- Format v2 : clé de données enveloppée (voir crypto.ts) ---

  /**
   * Crée une NOUVELLE clé de données aléatoire, l'enveloppe avec le mot de
   * passe et déverrouille la session avec elle. Retourne le trousseau à
   * persister (en une seule écriture).
   */
  async createKeyring(password: string): Promise<Keyring> {
    const raw = generateDataKeyBytes();
    try {
      const keyring = await wrapForPassword(raw, password);
      this.key = await importDataKey(raw);
      return keyring;
    } finally {
      raw.fill(0);
    }
  }

  /**
   * Déverrouille avec un trousseau v2. ok = false si le mot de passe est
   * incorrect. Un trousseau antérieur à la normalisation est réenveloppé
   * (même clé de données) avec le mot de passe normalisé : upgradedKeyring.
   */
  async unlockWithKeyring(password: string, keyring: Keyring): Promise<KeyringUnlockResult> {
    const raw = await this.openKeyring(password, keyring);
    if (!raw) return { ok: false, upgradedKeyring: null };
    try {
      this.key = await importDataKey(raw);
      const upgradedKeyring =
        keyring.normalization === 'NFC' ? null : await wrapForPassword(raw, password);
      return { ok: true, upgradedKeyring };
    } finally {
      raw.fill(0);
    }
  }

  /**
   * Réenveloppe la MÊME clé de données avec un nouveau mot de passe (nouveau
   * sel). Les données chiffrées restent valides telles quelles. Retourne null
   * si l'ancien mot de passe est incorrect. Déverrouille la session.
   */
  async rewrapKeyring(
    oldPassword: string,
    newPassword: string,
    keyring: Keyring,
  ): Promise<Keyring | null> {
    const raw = await this.openKeyring(oldPassword, keyring);
    if (!raw) return null;
    try {
      const next = await wrapForPassword(raw, newPassword);
      this.key = await importDataKey(raw);
      return next;
    } finally {
      raw.fill(0);
    }
  }

  /** Désenveloppe la clé de données (octets bruts) ou null si mot de passe incorrect. */
  private async openKeyring(password: string, keyring: Keyring): Promise<Uint8Array<ArrayBuffer> | null> {
    for (const candidate of passwordCandidates(password, keyring.normalization === 'NFC')) {
      const wrappingKey = await deriveKey(candidate, keyring.salt);
      try {
        return await unwrapDataKey(wrappingKey, keyring.wrappedKey);
      } catch {
        // mauvaise forme ou mauvais mot de passe : essayer la suivante
      }
    }
    return null;
  }

  // --- Format v1 (hérité) : clé dérivée directement du mot de passe ---
  // Conservé pour déverrouiller les bases créées avant le format v2, le temps
  // de les migrer (voir encryptionManager.unlock).

  /**
   * [v1 hérité] Configure un nouveau mot de passe. Retourne le sel et le jeton de
   * vérification à persister. Déverrouille la session.
   */
  async setup(password: string): Promise<{ salt: string; token: EncryptedPayload }> {
    const salt = generateSalt();
    const key = await deriveKey(password, salt);
    const token = await createVerificationToken(key);
    this.key = key;
    return { salt, token };
  }

  /**
   * [v1 hérité] Tente de déverrouiller avec un mot de passe, le sel et le jeton stockés.
   * Retourne true si le mot de passe est correct.
   */
  async unlock(password: string, salt: string, token: EncryptedPayload): Promise<boolean> {
    // Format v1 : dérivé de la saisie brute, forme inconnue.
    for (const candidate of passwordCandidates(password, false)) {
      const key = await deriveKey(candidate, salt);
      if (await verifyKey(key, token)) {
        this.key = key;
        return true;
      }
    }
    return false;
  }

  /** Verrouille la session (oublie la clé). */
  lock(): void {
    this.key = null;
  }

  private requireKey(): CryptoKey {
    if (!this.key) throw new Error('Session verrouillée : aucune clé disponible.');
    return this.key;
  }

  async encrypt(plaintext: string): Promise<EncryptedPayload> {
    return encryptString(this.requireKey(), plaintext);
  }
  async decrypt(payload: EncryptedPayload): Promise<string> {
    return decryptString(this.requireKey(), payload);
  }
  async encryptImage(blob: Blob): Promise<EncryptedPayload> {
    return encryptBlob(this.requireKey(), blob);
  }
  async decryptImage(payload: EncryptedPayload, mimeType: string): Promise<Blob> {
    return decryptBlob(this.requireKey(), payload, mimeType);
  }
}

/** Enveloppe une clé de données avec le mot de passe NORMALISÉ (nouveau sel). */
async function wrapForPassword(raw: Uint8Array<ArrayBuffer>, password: string): Promise<Keyring> {
  const salt = generateSalt();
  const wrappingKey = await deriveKey(normalizePassword(password), salt);
  const wrappedKey = await wrapDataKey(wrappingKey, raw);
  return { version: 2, salt, wrappedKey, normalization: 'NFC' };
}

/** Instance unique de session de chiffrement pour l'application. */
export const encryptionSession = new EncryptionSession();
