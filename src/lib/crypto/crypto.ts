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

// --- Enveloppe de clé (format v2) ---
//
// Les données sont chiffrées avec une CLÉ DE DONNÉES aléatoire de 256 bits.
// Cette clé est elle-même chiffrée (« enveloppée ») par une clé dérivée du mot
// de passe (PBKDF2). Conséquences :
//  - changer de mot de passe = réenvelopper la clé de données, sans toucher
//    aux données (une seule écriture, donc atomique);
//  - un déchiffrement réussi de l'enveloppe (AES-GCM authentifié) prouve que
//    le mot de passe est correct : plus besoin de jeton de vérification.

const DATA_KEY_BYTES = 32;
/** Données associées liant l'enveloppe à son usage (séparation de domaine). */
const KEYRING_AAD = new TextEncoder().encode('fiscapro-keyring-v2');

/** Trousseau persisté : sel de dérivation + clé de données enveloppée. */
export interface Keyring {
  version: 2;
  salt: string;              // base64
  wrappedKey: EncryptedPayload;
  /**
   * 'NFC' : clé d'enveloppe dérivée du mot de passe normalisé en NFC.
   * Absent : trousseau antérieur, dérivé du mot de passe tel que saisi.
   */
  normalization?: 'NFC';
}

// --- Normalisation Unicode du mot de passe ---
//
// Un même caractère accentué peut être encodé de deux façons : « é » précomposé
// (NFC, courant sous Windows et Android) ou « e » + accent combinant (NFD,
// fréquent sous macOS et iOS). Sans normalisation, le même mot de passe tapé
// sur deux appareils donne des octets différents, donc une autre clé : le
// déverrouillage échoue. On dérive donc toujours à partir de la forme NFC.

/** Forme canonique du mot de passe, utilisée pour toute nouvelle dérivation. */
export function normalizePassword(password: string): string {
  return password.normalize('NFC');
}

/**
 * Formes du mot de passe à essayer pour ouvrir un trousseau. Un trousseau
 * normalisé n'accepte que la forme NFC; un trousseau antérieur a été dérivé
 * de la saisie brute, dont on ignore la forme : on essaie la saisie, puis
 * ses formes NFC et NFD.
 */
export function passwordCandidates(password: string, normalized: boolean): string[] {
  if (normalized) return [normalizePassword(password)];
  return [...new Set([password, password.normalize('NFC'), password.normalize('NFD')])];
}

/** Génère les octets bruts d'une nouvelle clé de données (à effacer après usage). */
export function generateDataKeyBytes(): Uint8Array<ArrayBuffer> {
  return crypto.getRandomValues(new Uint8Array(DATA_KEY_BYTES));
}

/** Importe des octets bruts comme clé AES-GCM NON extractible. */
export async function importDataKey(raw: Uint8Array<ArrayBuffer>): Promise<CryptoKey> {
  return crypto.subtle.importKey('raw', raw, { name: 'AES-GCM' }, false, [
    'encrypt',
    'decrypt',
  ]);
}

/** Enveloppe les octets de la clé de données avec la clé dérivée du mot de passe. */
export async function wrapDataKey(
  wrappingKey: CryptoKey,
  raw: Uint8Array<ArrayBuffer>,
): Promise<EncryptedPayload> {
  const iv = crypto.getRandomValues(new Uint8Array(IV_BYTES));
  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv, additionalData: KEYRING_AAD },
    wrappingKey,
    raw,
  );
  return { iv: bufToBase64(iv.buffer), ciphertext: bufToBase64(ciphertext) };
}

/**
 * Désenveloppe la clé de données. Lève une erreur si le mot de passe (donc la
 * clé d'enveloppe) est incorrect ou si l'enveloppe a été altérée.
 */
export async function unwrapDataKey(
  wrappingKey: CryptoKey,
  wrapped: EncryptedPayload,
): Promise<Uint8Array<ArrayBuffer>> {
  const raw = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: new Uint8Array(base64ToBuf(wrapped.iv)), additionalData: KEYRING_AAD },
    wrappingKey,
    base64ToBuf(wrapped.ciphertext),
  );
  return new Uint8Array(raw);
}
