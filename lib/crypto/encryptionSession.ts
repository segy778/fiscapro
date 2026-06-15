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
  type EncryptedPayload,
} from './crypto';

export class EncryptionSession {
  private key: CryptoKey | null = null;

  /** La session est-elle déverrouillée (clé en mémoire) ? */
  get isUnlocked(): boolean {
    return this.key !== null;
  }

  /**
   * Configure un nouveau mot de passe. Retourne le sel et le jeton de
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
   * Tente de déverrouiller avec un mot de passe, le sel et le jeton stockés.
   * Retourne true si le mot de passe est correct.
   */
  async unlock(password: string, salt: string, token: EncryptedPayload): Promise<boolean> {
    const key = await deriveKey(password, salt);
    const ok = await verifyKey(key, token);
    if (ok) {
      this.key = key;
      return true;
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

/** Instance unique de session de chiffrement pour l'application. */
export const encryptionSession = new EncryptionSession();
