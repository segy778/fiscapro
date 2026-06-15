// Chiffrement au repos — primitives cryptographiques (Web Crypto natif).
// AUCUNE dépendance externe. Module pur (pas d'état, pas d'UI).
//
// Modèle : clé AES-256-GCM dérivée d'un mot de passe via PBKDF2 (SHA-256).
// Le mot de passe n'est JAMAIS stocké. La clé vit en mémoire le temps de la
// session. Chiffrement authentifié (GCM) : toute altération est détectée.

const PBKDF2_ITERATIONS = 600_000; // recommandation OWASP (SHA-256)
const SALT_BYTES = 16;
const IV_BYTES = 12; // standard pour AES-GCM

/** Enveloppe d'une valeur chiffrée : IV + texte chiffré, encodés base64. */
export interface EncryptedPayload {
  iv: string;         // base64
  ciphertext: string; // base64
}

// --- Encodage base64 <-> ArrayBuffer ---

function bufToBase64(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let bin = '';
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]!);
  return btoa(bin);
}

function base64ToBuf(b64: string): ArrayBuffer {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes.buffer;
}

/** Génère un sel aléatoire (base64) pour la dérivation de clé. */
export function generateSalt(): string {
  const salt = crypto.getRandomValues(new Uint8Array(SALT_BYTES));
  return bufToBase64(salt.buffer);
}

/**
 * Dérive une clé AES-256-GCM à partir d'un mot de passe et d'un sel.
 * La clé n'est pas extractible (extractable = false).
 */
export async function deriveKey(password: string, saltB64: string): Promise<CryptoKey> {
  const enc = new TextEncoder();
  const baseKey = await crypto.subtle.importKey(
    'raw',
    enc.encode(password),
    'PBKDF2',
    false,
    ['deriveKey'],
  );
  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: base64ToBuf(saltB64),
      iterations: PBKDF2_ITERATIONS,
      hash: 'SHA-256',
    },
    baseKey,
    { name: 'AES-GCM', length: 256 },
    false, // non extractible
    ['encrypt', 'decrypt'],
  );
}

/** Chiffre une chaîne avec la clé. Retourne {iv, ciphertext} en base64. */
export async function encryptString(key: CryptoKey, plaintext: string): Promise<EncryptedPayload> {
  const iv = crypto.getRandomValues(new Uint8Array(IV_BYTES));
  const enc = new TextEncoder();
  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    enc.encode(plaintext),
  );
  return { iv: bufToBase64(iv.buffer), ciphertext: bufToBase64(ciphertext) };
}

/** Déchiffre un payload. Lève une erreur si la clé est mauvaise ou la donnée altérée. */
export async function decryptString(key: CryptoKey, payload: EncryptedPayload): Promise<string> {
  const plaintext = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: new Uint8Array(base64ToBuf(payload.iv)) },
    key,
    base64ToBuf(payload.ciphertext),
  );
  return new TextDecoder().decode(plaintext);
}

/** Chiffre un Blob (image). Retourne {iv, ciphertext} en base64. */
export async function encryptBlob(key: CryptoKey, blob: Blob): Promise<EncryptedPayload> {
  const buf = await blob.arrayBuffer();
  const iv = crypto.getRandomValues(new Uint8Array(IV_BYTES));
  const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, buf);
  return { iv: bufToBase64(iv.buffer), ciphertext: bufToBase64(ciphertext) };
}

/** Déchiffre vers un Blob du type MIME donné. */
export async function decryptBlob(
  key: CryptoKey,
  payload: EncryptedPayload,
  mimeType: string,
): Promise<Blob> {
  const buf = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: new Uint8Array(base64ToBuf(payload.iv)) },
    key,
    base64ToBuf(payload.ciphertext),
  );
  return new Blob([buf], { type: mimeType });
}

const VERIFICATION_TOKEN = 'fiscapro-verification-v1';

/** Crée un jeton chiffré pour vérifier le mot de passe sans le stocker. */
export async function createVerificationToken(key: CryptoKey): Promise<EncryptedPayload> {
  return encryptString(key, VERIFICATION_TOKEN);
}

/** Vérifie qu'une clé déchiffre correctement le jeton (mot de passe correct). */
export async function verifyKey(key: CryptoKey, token: EncryptedPayload): Promise<boolean> {
  try {
    const decrypted = await decryptString(key, token);
    return decrypted === VERIFICATION_TOKEN;
  } catch {
    return false;
  }
}
